"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { AdminAuthCard, AdminAuthField, AdminSubmitButton } from "@/components/admin/admin-auth-card";
import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { Input } from "@/components/ui/input";
import { useAdminSession } from "@/lib/auth/admin-session";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAdminSession();

  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) router.replace("/admin/dashboard");
  }, [session, router]);

  const mutation = useMutation({
    mutationFn: () => resetPassword({ email, code, new_password: newPassword }),
    onSuccess: () => {
      router.push("/admin/sign-in?notice=password-reset");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    mutation.mutate();
  }

  return (
    <AdminAuthShell
      title="New password"
      subtitle="Create a strong new password for your admin account."
      badge="Password reset"
    >
      <AdminAuthCard>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <AdminAuthField id="password" label="New password">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a secure password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </AdminAuthField>

          <AdminAuthField id="confirm-password" label="Confirm password">
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </AdminAuthField>

          {error && (
            <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <AdminSubmitButton
            label="Reset password"
            loadingLabel="Resetting…"
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
