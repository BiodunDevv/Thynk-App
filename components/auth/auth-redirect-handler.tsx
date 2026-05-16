"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthModal, type AuthView } from "@/components/auth/auth-modal-provider";
import { useAuthSession } from "@/lib/auth/session";

const VALID_VIEWS: AuthView[] = ["sign-in", "register", "verify-email", "forgot-password", "verify-reset", "reset-password"];

export function AuthRedirectHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const session = useAuthSession();
  const handled = React.useRef(false);

  React.useEffect(() => {
    if (handled.current) return;
    const auth = searchParams.get("auth") as AuthView | null;
    if (!auth || !VALID_VIEWS.includes(auth)) return;
    // Don't open auth modal if already signed in
    if (session) {
      router.replace("/workspace");
      return;
    }
    handled.current = true;
    // Small delay so modal provider is mounted
    const t = setTimeout(() => openAuthModal(auth), 50);
    return () => clearTimeout(t);
  }, [searchParams, session, openAuthModal, router]);

  return null;
}
