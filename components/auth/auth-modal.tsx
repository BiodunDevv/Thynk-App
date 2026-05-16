"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";

import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  verifyEmailCode,
  verifyResetCode,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearPendingCheckout, readPendingCheckout } from "@/lib/billing/checkout";
import { writeStoredSession } from "@/lib/auth/session";
import type { AuthView } from "@/components/auth/auth-modal-provider";
import { ThynkLogo } from "@/components/brand/thynk-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthModalProps = {
  open: boolean;
  view: AuthView;
  email: string;
  code: string;
  notice: string | null;
  onOpenChange: (open: boolean) => void;
  onViewChange: (view: AuthView) => void;
  onEmailChange: (email: string) => void;
  onCodeChange: (code: string) => void;
  onNoticeChange: (message: string | null) => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

const viewMeta: Record<AuthView, { title: string; description: string }> = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in to your Thynk workspace.",
  },
  register: {
    title: "Get started free",
    description: "Create your Thynk account in seconds.",
  },
  "verify-email": {
    title: "Check your email",
    description: "Enter the 6-digit code we sent you.",
  },
  "forgot-password": {
    title: "Reset password",
    description: "We'll send a 6-digit code to your email.",
  },
  "verify-reset": {
    title: "Enter reset code",
    description: "Enter the 6-digit code we sent you.",
  },
  "reset-password": {
    title: "New password",
    description: "Create a fresh password for your account.",
  },
};

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
  // Single stable ref array — never recreated on render
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));

  // Build a clean 6-element array: each slot is the char or ""
  const digits: string[] = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function focus(i: number) {
    inputRefs.current[i]?.focus();
  }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? digit : d)).join("");
    // Strip trailing empty slots so value stays compact
    onChange(next.replace(/\s+$/, "").trimEnd());
    if (digit && i < 5) focus(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        const next = digits.map((d, idx) => (idx === i ? "" : d)).join("").trimEnd();
        onChange(next);
      } else if (i > 0) {
        const next = digits.map((d, idx) => (idx === i - 1 ? "" : d)).join("").trimEnd();
        onChange(next);
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

/* ── Resend code button with 60 s cooldown ──────────────────────── */
function ResendButton({
  email,
  purpose,
  onResent,
}: {
  email: string;
  purpose: "verify-email" | "verify-reset";
  onResent: (msg: string) => void;
}) {
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const resendEmailMutation = useMutation({
    mutationFn: () => resendVerificationCode({ email }),
    onSuccess: () => {
      setSeconds(60);
      onResent("A new code was sent to your email.");
    },
  });

  const resendResetMutation = useMutation({
    mutationFn: () => requestPasswordReset({ email }),
    onSuccess: () => {
      setSeconds(60);
      onResent("A new reset code was sent to your email.");
    },
  });

  const mutation = purpose === "verify-email" ? resendEmailMutation : resendResetMutation;
  const isPending = mutation.isPending;
  const canResend = seconds === 0 && !isPending;

  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      <span className="text-[13px] text-muted-foreground">Didn&apos;t receive it?</span>
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
          {isPending ? "Sending…" : `Resend in ${seconds}s`}
        </span>
      )}
    </div>
  );
}

/* ── Auth steps progress bar ────────────────────────────────────── */
function StepBar({ view }: { view: AuthView }) {
  const flow =
    view === "verify-email"
      ? ["register", "verify-email"]
      : view === "verify-reset" || view === "reset-password"
        ? ["forgot-password", "verify-reset", "reset-password"]
        : null;

  if (!flow) return null;

  const step =
    view === "verify-email"
      ? 1
      : view === "verify-reset"
        ? 1
        : 2;

  return (
    <div className="flex items-center gap-1 px-8 pt-5">
      {flow.map((_, i) => (
        <div
          key={i}
          className={[
            "h-0.5 flex-1 transition-all duration-300",
            i <= step ? "bg-primary" : "bg-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────── */
export function AuthModal({
  open,
  view,
  email,
  code,
  notice,
  onOpenChange,
  onViewChange,
  onEmailChange,
  onCodeChange,
  onNoticeChange,
}: AuthModalProps) {
  const [fullName, setFullName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const resetFeedback = React.useCallback(() => setErrorMessage(null), []);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => loginUser(payload),
    onSuccess: (session) => {
      if (session.role === "SUPER_ADMIN") {
        setErrorMessage("Admin accounts must sign in through the admin portal.");
        return;
      }
      writeStoredSession(session);
      const pendingCheckout = readPendingCheckout();
      onNoticeChange(null);
      onOpenChange(false);
      setPassword("");
      if (pendingCheckout) {
        clearPendingCheckout();
        window.location.href = pendingCheckout.redirectTo;
      }
    },
    onError: (error) => {
      const msg = getErrorMessage(error);
      if (error instanceof ApiError && error.status === 403 && msg.toLowerCase().includes("verify")) {
        setErrorMessage(null);
        onNoticeChange("A new verification code was sent to your email.");
        onViewChange("verify-email");
      } else {
        setErrorMessage(msg);
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),
    onSuccess: (_, payload) => {
      onEmailChange(payload.email);
      onViewChange("verify-email");
      onNoticeChange(null);
      setPassword("");
    },
    onError: (error) => setErrorMessage(getErrorMessage(error)),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: () => verifyEmailCode({ email, code }),
    onSuccess: () => {
      onViewChange("sign-in");
      onNoticeChange("Email verified. Sign in to continue.");
      onCodeChange("");
    },
    onError: (error) => setErrorMessage(getErrorMessage(error)),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: () => requestPasswordReset({ email }),
    onSuccess: () => {
      onViewChange("verify-reset");
      onNoticeChange(null);
    },
    onError: (error) => setErrorMessage(getErrorMessage(error)),
  });

  const verifyResetMutation = useMutation({
    mutationFn: () => verifyResetCode({ email, code }),
    onSuccess: () => {
      onViewChange("reset-password");
      onNoticeChange("Reset code verified. Create your new password.");
    },
    onError: (error) => setErrorMessage(getErrorMessage(error)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => resetPassword({ email, code, new_password: newPassword }),
    onSuccess: () => {
      onViewChange("sign-in");
      onNoticeChange("Password reset successfully. Sign in with your new password.");
      setNewPassword("");
      setPassword("");
      onCodeChange("");
    },
    onError: (error) => setErrorMessage(getErrorMessage(error)),
  });

  const meta = viewMeta[view];
  const isAuthTab = view === "sign-in" || view === "register";
  const isOtpView = view === "verify-email" || view === "verify-reset";

  // Auto-submit when all 6 digits filled
  React.useEffect(() => {
    if (isOtpView && code.length === 6) {
      if (view === "verify-email") verifyEmailMutation.mutate();
      if (view === "verify-reset") verifyResetMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isOtpView, view]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetFeedback();
      }}
    >
      <DialogContent className="max-w-md border border-border bg-card p-0 shadow-xl sm:max-w-md">
        <DialogTitle className="sr-only">{meta.title}</DialogTitle>
        <DialogDescription className="sr-only">{meta.description}</DialogDescription>

        {/* Brand header */}
        <div className="flex flex-col items-center border-b border-border px-8 pb-6 pt-8">
          <ThynkLogo size="md" />
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
            {meta.title}
          </h2>
          <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
            {meta.description}
          </p>
        </div>

        {/* Tab switcher — sign-in / register only */}
        {isAuthTab && (
          <div className="flex border-b border-border">
            {(["sign-in", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { resetFeedback(); onViewChange(tab); }}
                className={[
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  view === tab
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tab === "sign-in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
        )}

        {/* Step progress — OTP/reset flows */}
        <StepBar view={view} />

        {/* Feedback */}
        {(notice || errorMessage) && (
          <div className="px-8 pt-4">
            {notice && !errorMessage && (
              <div className="flex items-start gap-2.5 border border-border bg-muted/50 px-3.5 py-3">
                <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <p className="text-[13px] text-foreground">{notice}</p>
              </div>
            )}
            {errorMessage && (
              <div className="border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px] text-destructive">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Forms */}
        <div className="px-8 pb-8 pt-5">

          {/* ── Sign in ── */}
          {view === "sign-in" && (
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); resetFeedback(); loginMutation.mutate({ email, password }); }}
            >
              <Field id="si-email" label="Email address">
                <Input id="si-email" type="email" autoComplete="email" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="you@thynk.app" />
              </Field>
              <Field id="si-password" label="Password">
                <Input id="si-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
              </Field>
              <div className="flex justify-end">
                <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-foreground" onClick={() => { resetFeedback(); onViewChange("forgot-password"); }}>
                  Forgot password?
                </button>
              </div>
              <SubmitButton loading={loginMutation.isPending} label="Sign in" loadingLabel="Signing in…" />
            </form>
          )}

          {/* ── Register ── */}
          {view === "register" && (
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); resetFeedback(); registerMutation.mutate({ full_name: fullName, email, password }); }}
            >
              <Field id="reg-name" label="Full name">
                <Input id="reg-name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </Field>
              <Field id="reg-email" label="Email address">
                <Input id="reg-email" type="email" autoComplete="email" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="you@thynk.app" />
              </Field>
              <Field id="reg-password" label="Password">
                <Input id="reg-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a secure password" />
              </Field>
              <SubmitButton loading={registerMutation.isPending} label="Get started free" loadingLabel="Creating account…" />
              <p className="text-center text-xs text-muted-foreground">
                Free forever. No credit card required.
              </p>
            </form>
          )}

          {/* ── Verify email ── */}
          {view === "verify-email" && (
            <form
              className="space-y-5"
              onSubmit={(e) => { e.preventDefault(); resetFeedback(); verifyEmailMutation.mutate(); }}
            >
              {/* Destination hint */}
              {email && (
                <div className="flex items-center gap-2 border border-border bg-muted/30 px-3.5 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sent to</span>
                  <span className="text-[13px] font-medium text-foreground">{email}</span>
                  <button
                    type="button"
                    onClick={() => onViewChange("register")}
                    className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* OTP boxes */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  6-digit code
                </label>
                <OtpInput
                  value={code}
                  onChange={onCodeChange}
                  disabled={verifyEmailMutation.isPending}
                />
              </div>

              <SubmitButton
                loading={verifyEmailMutation.isPending}
                label="Verify email"
                loadingLabel="Verifying…"
              />

              <ResendButton
                email={email}
                purpose="verify-email"
                onResent={(msg) => { setErrorMessage(null); onNoticeChange(msg); }}
              />
            </form>
          )}

          {/* ── Forgot password ── */}
          {view === "forgot-password" && (
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); resetFeedback(); forgotPasswordMutation.mutate(); }}
            >
              <Field id="fp-email" label="Email address">
                <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="you@thynk.app" />
              </Field>
              <SubmitButton loading={forgotPasswordMutation.isPending} label="Send reset code" loadingLabel="Sending…" />
              <div className="text-center">
                <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-foreground" onClick={() => { resetFeedback(); onViewChange("sign-in"); }}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* ── Verify reset ── */}
          {view === "verify-reset" && (
            <form
              className="space-y-5"
              onSubmit={(e) => { e.preventDefault(); resetFeedback(); verifyResetMutation.mutate(); }}
            >
              {email && (
                <div className="flex items-center gap-2 border border-border bg-muted/30 px-3.5 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sent to</span>
                  <span className="text-[13px] font-medium text-foreground">{email}</span>
                  <button
                    type="button"
                    onClick={() => onViewChange("forgot-password")}
                    className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Change
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  6-digit reset code
                </label>
                <OtpInput
                  value={code}
                  onChange={onCodeChange}
                  disabled={verifyResetMutation.isPending}
                />
              </div>

              <SubmitButton
                loading={verifyResetMutation.isPending}
                label="Continue"
                loadingLabel="Checking…"
              />

              <ResendButton
                email={email}
                purpose="verify-reset"
                onResent={(msg) => { setErrorMessage(null); onNoticeChange(msg); }}
              />
            </form>
          )}

          {/* ── Reset password ── */}
          {view === "reset-password" && (
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); resetFeedback(); resetPasswordMutation.mutate(); }}
            >
              <Field id="rp-password" label="New password">
                <Input id="rp-password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Create a secure password" />
              </Field>
              <SubmitButton loading={resetPasswordMutation.isPending} label="Reset password" loadingLabel="Resetting…" />
            </form>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? (
        <>
          <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          {loadingLabel}
        </>
      ) : label}
    </button>
  );
}
