"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { AdminAuthCard, AdminAuthField, AdminSubmitButton } from "@/components/admin/admin-auth-card";
import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { Input } from "@/components/ui/input";
import { useAdminSession } from "@/lib/auth/admin-session";
import { requestPasswordReset } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const session = useAdminSession();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) router.replace("/admin/dashboard");
  }, [session, router]);

  const mutation = useMutation({
    mutationFn: () => requestPasswordReset({ email }),
    onSuccess: () => {
      router.push(`/admin/verify-code?email=${encodeURIComponent(email)}&purpose=reset`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  return (
    <AdminAuthShell
      title="Reset password"
      subtitle="Enter your admin email to receive a 6-digit reset code."
      badge="Account recovery"
    >
      <AdminAuthCard>
        <form
          className="space-y-5"
          onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
        >
          <AdminAuthField id="email" label="Email address">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@thynk.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </AdminAuthField>

          {error && (
            <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <AdminSubmitButton
            label="Send 6-digit code"
            loadingLabel="Sending…"
            loading={mutation.isPending}
          />

          <div className="border-t border-border pt-4 text-center">
            <Link
              href="/admin/sign-in"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      </AdminAuthCard>
    </AdminAuthShell>
  );
}
