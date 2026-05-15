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
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        message?: string;
        error?: { details?: unknown };
      }
    | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message ?? "Request failed.",
      response.status,
      payload?.error?.details,
    );
  }

  return payload as ApiResponse<T>;
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
