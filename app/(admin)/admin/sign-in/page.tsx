"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { AdminAuthCard, AdminAuthField, AdminSubmitButton } from "@/components/admin/admin-auth-card";
import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { Input } from "@/components/ui/input";
import { adminLoginUser } from "@/lib/api/admin";
import { writeAdminSession, useAdminSessionState } from "@/lib/auth/admin-session";

export default function AdminSignInPage() {
  const router = useRouter();
  const { session, ready } = useAdminSessionState();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Already signed in → go straight to dashboard
  React.useEffect(() => {
    if (ready && session) router.replace("/admin/dashboard");
  }, [ready, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await adminLoginUser({ email: email.trim(), password });
      writeAdminSession(result);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Invalid credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminAuthShell
      title="Admin sign in"
      subtitle="Protected access to the Thynk operations workspace."
      badge="Restricted"
    >
      <AdminAuthCard>
        <form className="space-y-5" onSubmit={handleSubmit}>
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

          <AdminAuthField id="password" label="Password">
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </AdminAuthField>

          {error && (
            <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <Link
              href="/admin/forgot-password"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <LockKeyhole className="size-3" />
              Encrypted
            </span>
          </div>

          <AdminSubmitButton
            label="Sign in to admin"
            loadingLabel="Signing in…"
            loading={loading}
          />
        </form>
      </AdminAuthCard>
    </AdminAuthShell>
  );
}
