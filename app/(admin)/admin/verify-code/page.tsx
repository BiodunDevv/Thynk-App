"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { AdminAuthCard, AdminSubmitButton } from "@/components/admin/admin-auth-card";
import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { useAdminSession } from "@/lib/auth/admin-session";
import { requestPasswordReset, resendVerificationCode, verifyResetCode } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

/* ── OTP input — 6 individual digit boxes ───────────────────────── */
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const digits: string[] = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function focus(i: number) { inputRefs.current[i]?.focus(); }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? digit : d)).join("").trimEnd();
    onChange(next);
    if (digit && i < 5) focus(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        onChange(digits.map((d, idx) => (idx === i ? "" : d)).join("").trimEnd());
      } else if (i > 0) {
        onChange(digits.map((d, idx) => (idx === i - 1 ? "" : d)).join("").trimEnd());
        focus(i - 1);
      }
    }
    if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); focus(i - 1); }
    if (e.key === "ArrowRight" && i < 5) { e.preventDefault(); focus(i + 1); }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    focus(Math.min(pasted.length, 5));
  }

  return (
    <div className="flex gap-2" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={[
            "h-12 w-full min-w-0 border bg-background text-center text-[18px] font-semibold text-foreground",
            "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40",
            digit ? "border-primary/60 bg-primary/5" : "border-border",
            disabled ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* ── Resend button with 60 s cooldown ───────────────────────────── */
function ResendButton({ email, purpose }: { email: string; purpose: "verify-email" | "reset" }) {
  const [seconds, setSeconds] = React.useState(0);
  const [sent, setSent] = React.useState(false);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const mutation = useMutation({
    mutationFn: () =>
      purpose === "reset"
        ? requestPasswordReset({ email })
        : resendVerificationCode({ email }),
    onSuccess: () => { setSeconds(60); setSent(true); },
  });

  const canResend = seconds === 0 && !mutation.isPending;

  return (
    <div className="space-y-1.5">
      {sent && (
        <div className="flex items-start gap-2 border border-border bg-muted/40 px-3 py-2.5">
          <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <p className="text-[12px] text-foreground">A new code was sent to your email.</p>
        </div>
      )}
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[13px] text-muted-foreground">Didn't receive it?</span>
        {canResend ? (
          <button
            type="button"
            onClick={() => mutation.mutate()}
            className="text-[13px] font-medium text-primary transition-opacity hover:opacity-70"
          >
            Resend code
          </button>
        ) : (
          <span className="font-mono text-[12px] text-muted-foreground">
            {mutation.isPending ? "Sending…" : `Resend in ${seconds}s`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */
export default function AdminVerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAdminSession();

  const email = searchParams.get("email") ?? "";
  const purpose = (searchParams.get("purpose") ?? "reset") as "verify-email" | "reset";

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session) router.replace("/admin/dashboard");
  }, [session, router]);

  const mutation = useMutation({
    mutationFn: () => verifyResetCode({ email, code }),
    onSuccess: () => {
      router.push(`/admin/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
    },
  });

  // Auto-submit on 6 digits
  React.useEffect(() => {
    if (code.length === 6) {
      setError(null);
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <AdminAuthShell
      title="Verify code"
      subtitle={`Enter the 6-digit code sent to ${email || "your admin email"}.`}
      badge="Verification"
    >
      <AdminAuthCard>
        <form
          className="space-y-6"
          onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}
        >
          {/* Email hint */}
          {email && (
            <div className="flex items-center gap-2 border border-border bg-muted/30 px-3 py-2.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Sent to</span>
              <span className="text-[13px] font-medium text-foreground">{email}</span>
              <Link
                href="/admin/forgot-password"
                className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Change
              </Link>
            </div>
          )}

          {/* OTP boxes */}
          <div className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Verification code
            </label>
            <OtpInput value={code} onChange={setCode} disabled={mutation.isPending} />
            <p className="text-center text-[11px] text-muted-foreground">
              Code expires in 10 minutes
            </p>
          </div>

          {error && (
            <p className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <AdminSubmitButton
            label="Continue"
            loadingLabel="Verifying…"
            loading={mutation.isPending}
          />

          {/* Resend + back */}
          <div className="space-y-3 border-t border-border pt-4">
            <ResendButton email={email} purpose={purpose} />
            <div className="text-center">
              <Link
                href="/admin/sign-in"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Back to sign in
              </Link>
            </div>
          </div>
        </form>
      </AdminAuthCard>
    </AdminAuthShell>
  );
}
