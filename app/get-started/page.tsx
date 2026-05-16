"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Check, Zap, Lock, Shield, ChevronLeft,
  CreditCard, Loader2, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { ThynkLogo } from "@/components/brand/thynk-logo";
import { useAuthSession } from "@/lib/auth/session";
import { writeStoredSession } from "@/lib/auth/session";
import {
  buildCheckoutRedirectPath,
  writePendingCheckout,
  clearPendingCheckout,
} from "@/lib/billing/checkout";
import { getPlans } from "@/lib/api/plans";
import { initializePayment, type PaymentProvider } from "@/lib/api/payments";
import {
  loginUser,
  registerUser,
  verifyEmailCode,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  resendVerificationCode,
  type LoginPayload,
  type RegisterPayload,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import {
  formatPlanPrice,
  getPlanDisplayName,
  getPlanFeatures,
  getPlanCadence,
  getPlanBadge,
} from "@/lib/constants/pricing";

/* ─── helpers ───────────────────────────────────────────────────── */

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/* ─── OTP input ─────────────────────────────────────────────────── */
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function focus(i: number) { refs.current[i]?.focus(); }

  function handleChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? digit : d)).join("");
    onChange(next.trimEnd());
    if (digit && i < 5) focus(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
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
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={[
            "h-11 w-full min-w-0 border bg-background text-center text-[17px] font-semibold text-foreground",
            "transition-all focus:outline-none focus:ring-2 focus:ring-primary/40",
            digit ? "border-primary/60 bg-primary/5" : "border-border",
            disabled ? "cursor-not-allowed opacity-50" : "",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

/* ─── Inline auth form ──────────────────────────────────────────── */
type AuthView = "sign-in" | "register" | "verify-email" | "forgot-password" | "verify-reset" | "reset-password";

function InlineAuth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [view, setView] = React.useState<AuthView>("register");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = React.useState(0);

  React.useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  function reset() { setErrorMsg(null); setNotice(null); }

  const loginMut = useMutation({
    mutationFn: (p: LoginPayload) => loginUser(p),
    onSuccess: (session) => {
      if (session.role === "SUPER_ADMIN") {
        setErrorMsg("Admin accounts must sign in through the admin portal.");
        return;
      }
      writeStoredSession(session);
      onAuthenticated();
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      if (err instanceof ApiError && err.status === 403 && msg.toLowerCase().includes("verify")) {
        setNotice("A verification code was sent to your email.");
        setView("verify-email");
      } else {
        setErrorMsg(msg);
      }
    },
  });

  const registerMut = useMutation({
    mutationFn: (p: RegisterPayload) => registerUser(p),
    onSuccess: (_, p) => {
      setEmail(p.email);
      setView("verify-email");
      setNotice(null);
      setPassword("");
    },
    onError: (err) => setErrorMsg(getErrorMessage(err)),
  });

  const verifyEmailMut = useMutation({
    mutationFn: () => verifyEmailCode({ email, code }),
    onSuccess: () => {
      setView("sign-in");
      setNotice("Email verified. Sign in to continue.");
      setCode("");
    },
    onError: (err) => setErrorMsg(getErrorMessage(err)),
  });

  const forgotMut = useMutation({
    mutationFn: () => requestPasswordReset({ email }),
    onSuccess: () => { setView("verify-reset"); setNotice(null); },
    onError: (err) => setErrorMsg(getErrorMessage(err)),
  });

  const verifyResetMut = useMutation({
    mutationFn: () => verifyResetCode({ email, code }),
    onSuccess: () => { setView("reset-password"); setNotice("Code verified. Set your new password."); },
    onError: (err) => setErrorMsg(getErrorMessage(err)),
  });

  const resetPassMut = useMutation({
    mutationFn: () => resetPassword({ email, code, new_password: newPassword }),
    onSuccess: () => {
      setView("sign-in");
      setNotice("Password reset. Sign in with your new password.");
      setCode("");
      setNewPassword("");
    },
    onError: (err) => setErrorMsg(getErrorMessage(err)),
  });

  const resendMut = useMutation({
    mutationFn: () =>
      view === "verify-reset"
        ? requestPasswordReset({ email })
        : resendVerificationCode({ email }),
    onSuccess: () => { setResendSeconds(60); setNotice("A new code was sent to your email."); },
  });

  const isOtp = view === "verify-email" || view === "verify-reset";

  React.useEffect(() => {
    if (isOtp && code.length === 6) {
      if (view === "verify-email") verifyEmailMut.mutate();
      if (view === "verify-reset") verifyResetMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isOtp, view]);

  return (
    <div className="w-full space-y-0">
      {/* Tab toggle */}
      {(view === "sign-in" || view === "register") && (
        <div className="flex border-b border-border">
          {(["register", "sign-in"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { reset(); setView(tab); }}
              className={[
                "flex-1 py-3 text-[13px] font-medium transition-colors",
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

      {/* Back arrow for sub-flows */}
      {(view === "forgot-password" || view === "verify-email" || view === "verify-reset" || view === "reset-password") && (
        <button
          type="button"
          onClick={() => { reset(); setView(view === "verify-email" ? "register" : "sign-in"); }}
          className="flex items-center gap-1.5 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> Back
        </button>
      )}

      {/* Feedback */}
      {(notice || errorMsg) && (
        <div className="py-3">
          {notice && !errorMsg && (
            <div className="flex items-start gap-2.5 border border-border bg-muted/50 px-3.5 py-3">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <p className="text-[13px] text-foreground">{notice}</p>
            </div>
          )}
          {errorMsg && (
            <div className="border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px] text-destructive">
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <div className="pt-4 space-y-4">
        {/* Sign in */}
        {view === "sign-in" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); reset(); loginMut.mutate({ email, password }); }}>
            <AuthField id="si-email" label="Email address">
              <AuthInput id="si-email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            </AuthField>
            <AuthField id="si-pw" label="Password">
              <AuthInput id="si-pw" type="password" autoComplete="current-password" value={password} onChange={setPassword} placeholder="Your password" />
            </AuthField>
            <div className="flex justify-end">
              <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors" onClick={() => { reset(); setView("forgot-password"); }}>
                Forgot password?
              </button>
            </div>
            <AuthSubmit loading={loginMut.isPending} label="Sign in & continue" loadingLabel="Signing in…" />
          </form>
        )}

        {/* Register */}
        {view === "register" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); reset(); registerMut.mutate({ full_name: fullName, email, password }); }}>
            <AuthField id="rg-name" label="Full name">
              <AuthInput id="rg-name" autoComplete="name" value={fullName} onChange={setFullName} placeholder="Your full name" />
            </AuthField>
            <AuthField id="rg-email" label="Email address">
              <AuthInput id="rg-email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            </AuthField>
            <AuthField id="rg-pw" label="Password">
              <AuthInput id="rg-pw" type="password" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Create a secure password" />
            </AuthField>
            <AuthSubmit loading={registerMut.isPending} label="Create account & continue" loadingLabel="Creating account…" />
            <p className="text-center text-[11px] text-muted-foreground">No credit card required.</p>
          </form>
        )}

        {/* Verify email */}
        {view === "verify-email" && (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); reset(); verifyEmailMut.mutate(); }}>
            {email && (
              <div className="flex items-center gap-2 border border-border bg-muted/30 px-3.5 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Sent to</span>
                <span className="text-[13px] font-medium text-foreground">{email}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">6-digit code</label>
              <OtpInput value={code} onChange={setCode} disabled={verifyEmailMut.isPending} />
            </div>
            <AuthSubmit loading={verifyEmailMut.isPending} label="Verify email" loadingLabel="Verifying…" />
            <ResendRow seconds={resendSeconds} loading={resendMut.isPending} onResend={() => resendMut.mutate()} />
          </form>
        )}

        {/* Forgot password */}
        {view === "forgot-password" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); reset(); forgotMut.mutate(); }}>
            <AuthField id="fp-email" label="Email address">
              <AuthInput id="fp-email" type="email" autoComplete="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            </AuthField>
            <AuthSubmit loading={forgotMut.isPending} label="Send reset code" loadingLabel="Sending…" />
          </form>
        )}

        {/* Verify reset */}
        {view === "verify-reset" && (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); reset(); verifyResetMut.mutate(); }}>
            {email && (
              <div className="flex items-center gap-2 border border-border bg-muted/30 px-3.5 py-2.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Sent to</span>
                <span className="text-[13px] font-medium text-foreground">{email}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Reset code</label>
              <OtpInput value={code} onChange={setCode} disabled={verifyResetMut.isPending} />
            </div>
            <AuthSubmit loading={verifyResetMut.isPending} label="Continue" loadingLabel="Checking…" />
            <ResendRow seconds={resendSeconds} loading={resendMut.isPending} onResend={() => resendMut.mutate()} />
          </form>
        )}

        {/* Reset password */}
        {view === "reset-password" && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); reset(); resetPassMut.mutate(); }}>
            <AuthField id="rp-pw" label="New password">
              <AuthInput id="rp-pw" type="password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} placeholder="Create a secure password" />
            </AuthField>
            <AuthSubmit loading={resetPassMut.isPending} label="Reset password" loadingLabel="Resetting…" />
          </form>
        )}
      </div>
    </div>
  );
}

function AuthField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function AuthInput({
  id, type = "text", autoComplete, value, onChange, placeholder,
}: {
  id: string; type?: string; autoComplete?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
    />
  );
}

function AuthSubmit({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {loadingLabel}
        </>
      ) : label}
    </button>
  );
}

function ResendRow({ seconds, loading, onResend }: { seconds: number; loading: boolean; onResend: () => void }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      <span className="text-[12px] text-muted-foreground">Didn&apos;t receive it?</span>
      {seconds === 0 && !loading ? (
        <button type="button" onClick={onResend} className="text-[12px] font-medium text-primary hover:opacity-70 transition-opacity">
          Resend code
        </button>
      ) : (
        <span className="font-mono text-[11px] text-muted-foreground">
          {loading ? "Sending…" : `Resend in ${seconds}s`}
        </span>
      )}
    </div>
  );
}

/* ─── Plan summary card ─────────────────────────────────────────── */
import type { PlanRecord } from "@/lib/api/plans";

function PlanSummary({ plan }: { plan: PlanRecord }) {
  const badge = getPlanBadge(plan);
  const features = getPlanFeatures(plan);

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              {getPlanDisplayName(plan)}
            </span>
            {badge && (
              <span className="bg-primary px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-primary-foreground">
                {badge}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-[2rem] font-semibold leading-none tracking-tight text-foreground">
              {formatPlanPrice(plan)}
            </span>
            <span className="mb-0.5 text-[11px] text-muted-foreground">{getPlanCadence(plan)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 border border-border bg-muted/50 px-2.5 py-1.5">
          <Zap className="size-3 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground">
            {plan.generation_limit >= 30000
              ? "30,000 / year"
              : plan.generation_limit === 5
              ? "5 / week"
              : `${plan.generation_limit.toLocaleString()} / mo`}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="px-5 py-4">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Included
        </p>
        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center bg-primary/10 text-primary">
                <Check className="size-2" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Trust strip */}
      <div className="flex items-center gap-4 border-t border-border px-5 py-3">
        <div className="flex items-center gap-1.5 text-muted-foreground/50">
          <Lock className="size-3" />
          <span className="font-mono text-[9px]">Secure checkout</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/50">
          <Shield className="size-3" />
          <span className="font-mono text-[9px]">Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Payment panel (for signed-in users) ───────────────────────── */
function PaymentPanel({
  plan,
  accessToken,
}: {
  plan: PlanRecord;
  accessToken: string;
}) {
  const [provider, setProvider] = React.useState<PaymentProvider>("paystack");

  const payMut = useMutation({
    mutationFn: () =>
      initializePayment(accessToken, {
        plan_id: plan.id,
        provider,
        callback_url: `${window.location.origin}/settings?tab=billing`,
      }),
    onMutate: () => toast.loading("Preparing payment…", { id: "pay" }),
    onSuccess: (res) => {
      const url = res.authorization?.authorization_url;
      if (url) {
        toast.success("Redirecting to payment…", { id: "pay" });
        window.location.href = url;
      } else {
        toast.error("Payment initialised but no redirect URL received.", { id: "pay" });
      }
    },
    onError: (err) => toast.error(getErrorMessage(err), { id: "pay" }),
  });

  const isFree = plan.billing_interval === "free";
  if (isFree) {
    return (
      <div className="space-y-4">
        <p className="text-[13px] text-muted-foreground">
          You&apos;re on the Free plan — no payment needed.
        </p>
        <Link
          href="/workspace"
          className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open workspace <ArrowRight className="size-3.5" />
        </Link>
      </div>
    );
  }

  const providers: { id: PaymentProvider; label: string }[] = [
    { id: "paystack", label: "Paystack" },
    { id: "stripe", label: "Stripe" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Payment provider
        </p>
        <div className="grid grid-cols-2 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={[
                "flex items-center justify-center gap-2 border px-4 py-2.5 text-[13px] font-medium transition-colors",
                provider === p.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <CreditCard className="size-3.5" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => payMut.mutate()}
        disabled={payMut.isPending}
        className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {payMut.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Preparing…
          </>
        ) : (
          <>
            Pay with {provider === "paystack" ? "Paystack" : "Stripe"}
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-muted-foreground">
        You&apos;ll be redirected to {provider === "paystack" ? "Paystack" : "Stripe"} to complete payment securely.
      </p>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────── */
export default function GetStartedPage() {
  const session = useAuthSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const planSlug = searchParams.get("plan") ?? "";
  const providerParam = searchParams.get("provider");
  const source = searchParams.get("source") ?? "direct";

  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);

  /* Write pending checkout to localStorage whenever we have a plan */
  React.useEffect(() => {
    if (!planSlug) return;
    writePendingCheckout({
      planSlug,
      provider:
        providerParam === "stripe" || providerParam === "paystack"
          ? providerParam
          : undefined,
      redirectTo: buildCheckoutRedirectPath({ planSlug }),
      source,
    });
  }, [planSlug, providerParam, source]);

  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: getPlans });
  const plan = plansQuery.data?.find((p) => p.slug === planSlug) ?? null;

  /* After auth: clear pending checkout, redirect or stay */
  function handleAuthenticated() {
    clearPendingCheckout();
    /* page will re-render because session changes — no manual redirect needed */
  }

  /* Loading state */
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 rounded-full bg-primary/40 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const accessToken = session?.tokens.access_token ?? "";
  const isSignedIn = Boolean(session);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link href="/">
            <ThynkLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            {isSignedIn && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {session?.user.email}
              </span>
            )}
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-3" /> Back to pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-5 py-12">
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {[
            { label: "Choose plan", done: true },
            { label: isSignedIn ? "Confirm & pay" : "Create account", done: false },
            { label: "Access workspace", done: false },
          ].map((step, i) => (
            <React.Fragment key={step.label}>
              {i > 0 && <div className="h-px flex-1 bg-border" />}
              <div className="flex items-center gap-2">
                <span className={[
                  "flex size-5 items-center justify-center border font-mono text-[9px]",
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === 1
                    ? "border-foreground bg-background text-foreground"
                    : "border-border bg-background text-muted-foreground",
                ].join(" ")}>
                  {step.done ? <Check className="size-2.5" /> : i + 1}
                </span>
                <span className={[
                  "font-mono text-[10px] uppercase tracking-[0.15em] hidden sm:block",
                  step.done ? "text-primary" : i === 1 ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Left: plan summary */}
          <div className="order-2 lg:order-1">
            {/* Section label */}
            <div className="mb-4 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Your selection
              </span>
            </div>

            {plansQuery.isLoading && (
              <div className="space-y-3 border border-border bg-card p-5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 animate-pulse bg-muted/40" style={{ width: `${70 - i * 10}%` }} />
                ))}
              </div>
            )}

            {plan && <PlanSummary plan={plan} />}

            {!plansQuery.isLoading && !plan && planSlug && (
              <div className="border border-border bg-muted/30 px-5 py-4 text-[13px] text-muted-foreground">
                Plan &quot;{planSlug}&quot; not found.{" "}
                <Link href="/pricing" className="text-foreground underline underline-offset-2">
                  View all plans
                </Link>
              </div>
            )}

            {!planSlug && (
              <div className="border border-border bg-card px-6 py-8 text-center">
                <p className="text-[13px] text-muted-foreground">No plan selected.</p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex items-center gap-1.5 border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted"
                >
                  <ArrowLeft className="size-3" /> View pricing
                </Link>
              </div>
            )}
          </div>

          {/* Right: auth or payment */}
          <div className="order-1 lg:order-2">
            <div className="border border-border bg-card">
              {/* Panel header */}
              <div className="border-b border-border px-6 py-5">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {isSignedIn ? "Step 2 of 2" : "Step 2 of 3"}
                </p>
                <h1 className="mt-1 text-[18px] font-semibold tracking-tight text-foreground">
                  {isSignedIn ? "Confirm & pay" : "Create your account"}
                </h1>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {isSignedIn
                    ? "Choose a payment provider and complete checkout."
                    : "Sign in or register to continue to payment."}
                </p>
              </div>

              <div className="px-6 py-6">
                {isSignedIn ? (
                  plan ? (
                    <PaymentPanel plan={plan} accessToken={accessToken} />
                  ) : (
                    <div className="text-[13px] text-muted-foreground">
                      Select a plan from{" "}
                      <Link href="/pricing" className="text-foreground underline underline-offset-2">pricing</Link>.
                    </div>
                  )
                ) : (
                  <InlineAuth onAuthenticated={handleAuthenticated} />
                )}
              </div>
            </div>

            {/* Security note */}
            <div className="mt-3 flex items-center justify-center gap-4 text-muted-foreground/40">
              <div className="flex items-center gap-1">
                <Lock className="size-3" />
                <span className="font-mono text-[9px]">256-bit SSL</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="size-3" />
                <span className="font-mono text-[9px]">Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
