const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";
const API_V1_PREFIX = process.env.NEXT_PUBLIC_API_V1_PREFIX ?? "/api/v1";

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly fieldErrors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ── Token refresh logic ─────────────────────────────────────────────
   A single in-flight promise is shared across all concurrent requests
   so only one refresh call ever fires at a time.
──────────────────────────────────────────────────────────────────── */
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  // Serialize: if a refresh is already in flight, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const { readStoredSession, writeStoredSession, clearStoredSession } =
        await import("@/lib/auth/session");

      const session = readStoredSession();
      if (!session?.tokens.refresh_token) {
        clearStoredSession();
        return false;
      }

      const res = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.tokens.refresh_token }),
        cache: "no-store",
      });

      if (!res.ok) {
        clearStoredSession();
        return false;
      }

      const payload = await res.json();
      if (!payload?.data?.tokens) {
        clearStoredSession();
        return false;
      }

      const d = payload.data;
      // Write the full enriched session — backend now returns live plan + subscription
      writeStoredSession({
        tokens: d.tokens,
        user: d.user ?? session.user,
        role: d.role ?? session.role,
        plan: d.plan ?? session.plan,
        subscription_status: d.subscription_status ?? session.subscription_status,
        subscription: d.subscription ?? session.subscription,
      });

      // Invalidate all TanStack Query caches so every component re-fetches
      // We dispatch a custom event that query clients listen for
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("thynk-session-refreshed"));
      }

      return true;
    } catch {
      try {
        const { clearStoredSession } = await import("@/lib/auth/session");
        clearStoredSession();
      } catch {}
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function redirectToSignIn() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  // Admin pages redirect to admin sign-in
  if (path.startsWith("/admin")) {
    if (!path.startsWith("/admin/sign-in")) {
      window.location.href = "/admin/sign-in";
    }
    return;
  }
  // Don't redirect if already on public/auth pages
  const publicPaths = ["/", "/pricing", "/sign-in", "/get-started"];
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(`${p}/`));
  if (!isPublic) {
    window.location.href = "/?auth=sign-in";
  }
}

/* ── Core fetch ──────────────────────────────────────────────────── */

async function coreFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${API_V1_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

/* ── Main request with auto-refresh ─────────────────────────────── */

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  let response = await coreFetch(path, init);

  // On 401 — attempt a single token refresh then retry
  if (response.status === 401) {
    const payload = await response.json().catch(() => null) as {
      error?: { code?: string };
      message?: string;
    } | null;

    const code = payload?.error?.code ?? "";
    const isTokenError =
      code === "AUTH_TOKEN_INVALID" ||
      code === "AUTH_TOKEN_EXPIRED" ||
      code === "AUTH_UNAUTHORIZED";

    if (isTokenError) {
      const refreshed = await attemptTokenRefresh();

      if (refreshed) {
        // Re-read the fresh access token and retry the original request
        const { readStoredSession } = await import("@/lib/auth/session");
        const freshSession = readStoredSession();
        const freshToken = freshSession?.tokens.access_token;

        if (freshToken) {
          // Rebuild headers with the new token
          const originalHeaders = (init?.headers ?? {}) as Record<string, string>;
          const updatedHeaders = {
            ...originalHeaders,
            Authorization: `Bearer ${freshToken}`,
          };
          response = await coreFetch(path, { ...init, headers: updatedHeaders });
        } else {
          redirectToSignIn();
          throw new ApiError("Session expired. Please sign in again.", 401, code);
        }
      } else {
        redirectToSignIn();
        throw new ApiError("Session expired. Please sign in again.", 401, code);
      }
    }
  }

  const body = await response.json().catch(() => null) as {
    message?: string;
    error?: { code?: string; details?: unknown; field_errors?: { field: string; message: string }[] };
  } | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? "Request failed.",
      response.status,
      body?.error?.code,
      body?.error?.details,
      body?.error?.field_errors,
    );
  }

  return body as ApiResponse<T>;
}

export async function apiDataRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await apiRequest<T>(path, init);
  return response.data;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

/**
 * Force-refresh the stored session tokens and plan data.
 * Call this after any action that changes the user's subscription (payment, cancel, etc.)
 * so the in-memory session reflects the latest state from the server.
 */
export async function refreshSession(): Promise<boolean> {
  return attemptTokenRefresh();
}
