"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell, CreditCard, ShieldCheck, UserRound,
  Check, Zap, ArrowRight, CheckCircle2, Clock,
  XCircle, Loader2, RefreshCw, Calendar, Receipt,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SectionContainer } from "@/components/shared/section-container";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getNotifications,
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
  registerNotificationToken,
  removeNotificationToken,
  sendTestNotification,
} from "@/lib/api/notifications";
import {
  initializePayment,
  verifyPayment,
  getMyPayments,
  type PaymentProvider,
} from "@/lib/api/payments";
import { refreshSession } from "@/lib/api/client";
import { getPlans } from "@/lib/api/plans";
import { getMySubscription } from "@/lib/api/subscriptions";
import { getCurrentUser } from "@/lib/api/users";
import { clearPendingCheckout } from "@/lib/billing/checkout";
import { useAuthSession } from "@/lib/auth/session";
import {
  formatPlanPrice,
  formatPlanProviderPrice,
  getPlanCadence,
  getPlanDisplayName,
  getPlanFeatures,
  getPlanBadge,
} from "@/lib/constants/pricing";

/* ─── helpers ────────────────────────────────────────────────────── */

function getBrowserNotificationToken(userId: string) {
  if (typeof window === "undefined") return "";
  return `web:${userId}:${window.location.origin}`;
}

function fmtDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtAmount(amount: number, currency: string) {
  const sym = currency.toUpperCase() === "NGN" ? "₦" : "$";
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff < 0) return null;
  return Math.ceil(diff / 86_400_000);
}

/* ─── Payment status badge ───────────────────────────────────────── */
function PayStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
    success:   { icon: CheckCircle2, cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Paid" },
    pending:   { icon: Clock,        cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",       label: "Pending" },
    failed:    { icon: XCircle,      cls: "bg-destructive/10 text-destructive border-destructive/20",  label: "Failed" },
    cancelled: { icon: XCircle,      cls: "bg-muted text-muted-foreground border-border",              label: "Cancelled" },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${c.cls}`}>
      <Icon className="size-2.5" />
      {c.label}
    </span>
  );
}

/* ─── payment return / auto-verify banner ────────────────────────── */

function PaymentReturnBanner({ accessToken }: { accessToken: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const handledReferenceRef = React.useRef<string | null>(null);

  /* Paystack returns ?trxref=&reference= — both hold the same reference */
  const trxref = searchParams.get("trxref");
  const reference = searchParams.get("reference") ?? trxref;
  const paymentParam = searchParams.get("payment");

  const [status, setStatus] = React.useState<"verifying" | "success" | "failed" | null>(
    reference ? "verifying" : paymentParam === "return" ? "verifying" : null,
  );
  const [alreadyVerified, setAlreadyVerified] = React.useState(false);

  function isPaymentConfirmed(res: Awaited<ReturnType<typeof verifyPayment>>) {
    const paymentSuccess = res.payment?.status === "success";
    const billingGranted = res.billing_state?.granted === true;
    const subscriptionActive = res.subscription?.status === "active";
    return paymentSuccess && (billingGranted || subscriptionActive || Boolean(res.already_verified));
  }

  function dismiss() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("payment");
    params.delete("trxref");
    params.delete("reference");
    params.set("tab", "billing");
    router.replace(`/settings?${params.toString()}`);
  }

  React.useEffect(() => {
    if (!reference || !accessToken) return;
    if (handledReferenceRef.current === reference) return;

    const sessionKey = `thynk-payment-return:${reference}`;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey) === "confirmed") {
      handledReferenceRef.current = reference;
      dismiss();
      return;
    }

    let cancelled = false;
    async function run() {
      try {
        const res = await verifyPayment(accessToken, reference!);
        if (cancelled) return;
        if (isPaymentConfirmed(res)) {
          handledReferenceRef.current = reference;
          setAlreadyVerified(Boolean(res.already_verified));
          setStatus("success");
          // Refresh JWT session so plan/subscription_status update in the navbar and all UI
          await refreshSession();
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["subscription-current", accessToken] }),
            queryClient.invalidateQueries({ queryKey: ["user-profile", accessToken] }),
            queryClient.invalidateQueries({ queryKey: ["plans"] }),
            queryClient.invalidateQueries({ queryKey: ["payment-history", accessToken] }),
          ]);
          if (typeof window !== "undefined") {
            const toastKey = `${sessionKey}:toast`;
            if (window.sessionStorage.getItem(toastKey) !== "shown") {
              toast.success(
                res.already_verified
                  ? "Payment already confirmed — your plan is active."
                  : "Payment confirmed — your plan has been upgraded!",
              );
              window.sessionStorage.setItem(toastKey, "shown");
            }
            window.sessionStorage.setItem(sessionKey, "confirmed");
          }
          dismiss();
        } else {
          setStatus("failed");
        }
      } catch {
        if (!cancelled) setStatus("failed");
      }
    }
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, accessToken]);

  if (!status) return null;

  const cfg = {
    verifying: {
      icon: <Loader2 className="size-4 shrink-0 animate-spin text-amber-400" />,
      title: "Verifying payment…",
      body: "Checking your payment with the provider. This takes a moment.",
      border: "border-amber-500/20 bg-amber-500/5",
      titleColor: "text-amber-400",
    },
    success: {
      icon: <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />,
      title: alreadyVerified ? "Payment already confirmed" : "Payment confirmed",
      body: alreadyVerified
        ? "This payment was already verified earlier. Your subscription is active and your billing state is up to date."
        : "Your plan has been upgraded and your generation limit is now active. Welcome to the next level.",
      border: "border-emerald-500/20 bg-emerald-500/5",
      titleColor: "text-emerald-400",
    },
    failed: {
      icon: <XCircle className="size-4 shrink-0 text-destructive" />,
      title: "Payment not completed",
      body: "We couldn't confirm your payment. You have not been charged. You can try again below.",
      border: "border-destructive/20 bg-destructive/5",
      titleColor: "text-destructive",
    },
  }[status];

  return (
    <div className={`flex items-start gap-3 border px-4 py-4 ${cfg.border}`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-semibold ${cfg.titleColor}`}>{cfg.title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{cfg.body}</p>
        {status === "success" && (
          <button
            onClick={dismiss}
            className="mt-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400/70 hover:text-emerald-400 transition-colors"
          >
            Dismiss →
          </button>
        )}
      </div>
      {status !== "verifying" && status !== "success" && (
        <button
          onClick={dismiss}
          className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

/* ─── Plan card ──────────────────────────────────────────────────── */
import type { PlanRecord } from "@/lib/api/plans";

function PlanCard({
  plan,
  isCurrent,
  accessToken,
}: {
  plan: PlanRecord;
  isCurrent: boolean;
  accessToken: string;
}) {
  const [provider, setProvider] = React.useState<PaymentProvider>("paystack");
  const badge = getPlanBadge(plan);
  const features = getPlanFeatures(plan);
  const isFree = plan.billing_interval === "free";

  const payMut = useMutation({
    mutationFn: () =>
      initializePayment(accessToken, {
        plan_id: plan.id,
        provider,
        callback_url: `${window.location.origin}/settings?tab=billing&payment=return`,
      }),
    onMutate: () => toast.loading("Preparing checkout…", { id: `pay-${plan.id}` }),
    onSuccess: (res) => {
      clearPendingCheckout();
      const url = res.authorization?.authorization_url;
      if (url) {
        toast.success("Redirecting…", { id: `pay-${plan.id}` });
        window.location.href = url;
      } else {
        toast.error("No checkout URL received. Try again.", { id: `pay-${plan.id}` });
      }
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Checkout failed.";
      toast.error(msg, { id: `pay-${plan.id}` });
    },
  });

  return (
    <div className={[
      "flex flex-col border bg-card transition-colors",
      isCurrent ? "border-primary/40" : "border-border hover:border-border/80",
    ].join(" ")}>
      {/* Header */}
      <div className="relative border-b border-border px-5 py-4">
        {badge && (
          <span className="absolute right-0 top-0 bg-primary px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-primary-foreground">
            {badge}
          </span>
        )}
        {isCurrent && (
          <span className="absolute left-0 top-0 bg-primary/10 border-r border-b border-primary/20 px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider text-primary">
            Current plan
          </span>
        )}
        <div className={isCurrent || badge ? "mt-5" : ""}>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {getPlanDisplayName(plan)}
          </p>
          <div className="mt-1.5 flex items-end gap-1">
            <span className="text-[1.75rem] font-semibold leading-none tracking-tight text-foreground">
              {formatPlanPrice(plan)}
            </span>
            <span className="mb-0.5 text-[11px] text-muted-foreground">{getPlanCadence(plan)}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <Zap className="size-3 text-primary" />
          <span className="font-mono text-[10px] text-muted-foreground">
            {plan.generation_limit >= 30000
              ? "30,000 generations / year"
              : plan.generation_limit === 5
              ? "5 generations / week"
              : `${plan.generation_limit.toLocaleString()} generations / month`}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="flex-1 px-5 py-4">
        <ul className="space-y-2">
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

      {/* CTA */}
      <div className="border-t border-border px-5 py-4 space-y-3">
        {isFree ? (
          <div className="flex items-center justify-center gap-2 border border-border bg-muted/30 py-2.5 text-[12px] text-muted-foreground">
            <CheckCircle2 className="size-3.5" />
            {isCurrent ? "Your current plan" : "Free — no payment needed"}
          </div>
        ) : (
          <>
            {/* Provider toggle */}
            <div className="grid grid-cols-2 gap-1.5">
              {(["paystack", "stripe"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={[
                    "flex items-center justify-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    provider === p
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  <CreditCard className="size-3" />
                  {p === "paystack"
                    ? `Paystack ${formatPlanProviderPrice(plan, "paystack")}`
                    : `Stripe ${formatPlanProviderPrice(plan, "stripe")}`}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => payMut.mutate()}
              disabled={payMut.isPending || isCurrent}
              className={[
                "flex w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-opacity",
                isCurrent
                  ? "border border-border bg-background text-muted-foreground cursor-default"
                  : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60",
              ].join(" ")}
            >
              {payMut.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Preparing…
                </>
              ) : isCurrent ? (
                "Current plan"
              ) : (
                <>
                  Pay with {provider === "paystack" ? "Paystack" : "Stripe"}
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Tab nav ─────────────────────────────────────────────────────── */
const TABS = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ─── Main page ───────────────────────────────────────────────────── */
export default function SettingsPage() {
  const session = useAuthSession();
  const accessToken = session?.tokens.access_token ?? "";
  const searchParams = useSearchParams();

  const activeTab = (searchParams.get("tab") ?? "account") as TabId;
  const [periodNowMs, setPeriodNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = window.setInterval(() => setPeriodNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  /* queries */
  const userQuery = useQuery({
    queryKey: ["user-profile", accessToken],
    queryFn: () => getCurrentUser(accessToken),
    enabled: Boolean(accessToken),
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    enabled: Boolean(accessToken),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["subscription-current", accessToken],
    queryFn: () => getMySubscription(accessToken),
    enabled: Boolean(accessToken),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", accessToken],
    queryFn: () => getNotifications(accessToken),
    enabled: Boolean(accessToken) && activeTab === "notifications",
    refetchInterval: activeTab === "notifications" ? 30_000 : false,
  });

  const notificationSummaryQuery = useQuery({
    queryKey: ["notifications-summary", accessToken],
    queryFn: () => getNotificationSummary(accessToken),
    enabled: Boolean(accessToken) && activeTab === "notifications",
    refetchInterval: activeTab === "notifications" ? 30_000 : false,
  });

  const paymentsQuery = useQuery({
    queryKey: ["payment-history", accessToken],
    queryFn: () => getMyPayments(accessToken),
    enabled: Boolean(accessToken) && activeTab === "billing",
    staleTime: 30_000,
  });

  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return window.Notification.permission;
  });

  const registerNotifMut = useMutation({
    mutationFn: async () => {
      const user = userQuery.data;
      if (!user) throw new Error("User profile unavailable.");
      if (!("Notification" in window)) throw new Error("Notifications not supported.");
      const perm = await window.Notification.requestPermission();
      setNotifPermission(perm);
      if (perm !== "granted") throw new Error("Permission not granted.");
      await registerNotificationToken(accessToken, getBrowserNotificationToken(user.id));
      new window.Notification("Thynk notifications enabled", {
        body: "You'll receive prompt and billing updates on this browser.",
      });
    },
    onSuccess: () => {
      toast.success("Notifications enabled");
      notificationsQuery.refetch();
      notificationSummaryQuery.refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to enable notifications"),
  });

  const removeNotifMut = useMutation({
    mutationFn: async () => {
      const user = userQuery.data;
      if (!user) throw new Error("User profile unavailable.");
      await removeNotificationToken(accessToken, getBrowserNotificationToken(user.id));
    },
    onSuccess: () => {
      toast.success("Notifications disabled on this browser");
      notificationsQuery.refetch();
      notificationSummaryQuery.refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to remove notifications"),
  });

  const testNotifMut = useMutation({
    mutationFn: async () => {
      const notification = await sendTestNotification(accessToken);
      if ("Notification" in window && window.Notification.permission === "granted") {
        new window.Notification(notification.title, { body: notification.body });
      }
      return notification;
    },
    onSuccess: () => {
      toast.success("Test notification sent");
      notificationsQuery.refetch();
      notificationSummaryQuery.refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to send test notification"),
  });

  const markAllNotifMut = useMutation({
    mutationFn: () => markAllNotificationsRead(accessToken),
    onSuccess: (result) => {
      toast.success(result.marked_count > 0 ? "All notifications marked as read" : "No unread notifications");
      notificationsQuery.refetch();
      notificationSummaryQuery.refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update notifications"),
  });

  const markNotifReadMut = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(accessToken, notificationId),
    onSuccess: () => {
      notificationsQuery.refetch();
      notificationSummaryQuery.refetch();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update notification"),
  });

  const user = userQuery.data ?? session?.user ?? null;
  const plans = plansQuery.data ?? [];
  const subscription = subscriptionQuery.data ?? null;
  const resolvedSubscriptionStatus = subscription?.status ?? user?.subscription_status ?? "free";

  const currentPlan =
    plans.find((p) => p.id === subscription?.plan_id) ??
    plans.find((p) => p.id === user?.current_plan_id) ??
    plans.find((p) => p.id === session?.plan?.plan_id) ??
    plans.find((p) => p.slug === "free") ??
    null;

  /* Unauthenticated */
  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <SectionContainer className="py-16">
          <div className="mx-auto max-w-md border border-border bg-card px-8 py-10 text-center">
            <ShieldCheck className="mx-auto size-8 text-muted-foreground/30" />
            <p className="mt-4 text-[15px] font-medium text-foreground">Sign in required</p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Sign in to manage your account, billing and notifications.
            </p>
            <Link
              href="/?auth=sign-in"
              className="mt-6 inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </SectionContainer>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <SectionContainer className="py-8">
        {/* Page title */}
        <div className="mb-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Settings</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">
            Manage your workspace
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* Sidebar */}
          <nav className="flex flex-row gap-1 lg:flex-col border border-border bg-card p-2 h-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Link
                key={id}
                href={`/settings?tab=${id}`}
                className={[
                  "flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-colors",
                  activeTab === id
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Content */}
          <div className="space-y-5">

            {/* ── Account tab ── */}
            {activeTab === "account" && (
              <div className="border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Account overview
                  </span>
                </div>
                <div className="p-5">
                  {userQuery.isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2">
                      {[
                        { label: "Full name", value: user?.full_name ?? "—" },
                        { label: "Email address", value: user?.email ?? "—" },
                        {
                          label: "Verification",
                          value: user?.is_verified ? "Verified" : "Pending verification",
                          accent: user?.is_verified ? "text-emerald-400" : "text-amber-400",
                        },
                        {
                          label: "Subscription status",
                          value: resolvedSubscriptionStatus,
                        },
                        {
                          label: "Current plan",
                          value: currentPlan ? getPlanDisplayName(currentPlan) : "Free",
                        },
                        {
                          label: "Granted credits",
                          value: (user?.granted_credits_remaining ?? 0).toLocaleString(),
                        },
                        {
                          label: "Current plan allowance",
                          value: (user?.subscription_generations_remaining ?? 0).toLocaleString(),
                        },
                        {
                          label: "Total available",
                          value: (user?.total_points_remaining ?? 0).toLocaleString(),
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className={`mt-1.5 text-[13px] font-medium ${item.accent ?? "text-foreground"}`}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Billing tab ── */}
            {activeTab === "billing" && (
              <div className="space-y-5">
                {/* Payment return banner — auto-verifies via trxref/reference */}
                <PaymentReturnBanner accessToken={accessToken} />

                {/* Current plan summary */}
                {currentPlan && (
                  <div className="border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-5 py-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="size-3.5 text-muted-foreground" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                          Current plan
                        </span>
                      </div>
                      {subscription?.provider && (
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border border-border px-2 py-0.5">
                          via {subscription.provider}
                        </span>
                      )}
                    </div>
                    <div className="space-y-5 px-5 py-5">
                      <div className="grid gap-5 border border-border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
                        <div className="flex h-full flex-col">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                Plan
                              </p>
                              <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-foreground">
                                {getPlanDisplayName(currentPlan)}
                              </p>
                              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                                <Zap className="size-3 text-primary" />
                                {currentPlan.generation_limit >= 30000
                                  ? "30,000 generations per year"
                                  : currentPlan.generation_limit === 5
                                  ? "5 generations per week"
                                  : `${currentPlan.generation_limit.toLocaleString()} generations per month`}
                              </p>
                            </div>

                            <div className="text-left lg:text-right">
                              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                Price
                              </p>
                              <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-foreground">
                                {formatPlanPrice(currentPlan)}
                              </p>
                              <p className="mt-1 text-[12px] text-muted-foreground">
                                {getPlanCadence(currentPlan)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-8 grid gap-4 border-t border-border/60 pt-4 sm:mt-auto sm:grid-cols-3">
                            <div>
                              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                Status
                              </p>
                              <p className="mt-1 text-[14px] font-semibold text-foreground capitalize">
                                {resolvedSubscriptionStatus === "active" ? "Current plan" : resolvedSubscriptionStatus.replace("_", " ")}
                              </p>
                            </div>

                            {subscription?.current_period_start && (
                              <div>
                                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                  Active since
                                </p>
                                <p className="mt-1 text-[14px] font-semibold text-foreground">
                                  {fmtDate(subscription.current_period_start)}
                                </p>
                              </div>
                            )}

                            {subscription?.current_period_end && (
                              <div>
                                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                  {currentPlan.billing_interval === "free" ? "Expires" : "Next billing"}
                                </p>
                                <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
                                  <Calendar className="size-3 text-muted-foreground" />
                                  {fmtDate(subscription.current_period_end)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  {(() => {
                                    const days = daysUntil(subscription.current_period_end);
                                    if (days === null) return "Expired";
                                    if (days === 0) return "Today";
                                    return `in ${days} day${days !== 1 ? "s" : ""}`;
                                  })()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-1">
                          {[
                            {
                              label: "Current plan allowance",
                              value: (user?.subscription_generations_remaining ?? 0).toLocaleString(),
                              sub: "Included with your subscription",
                            },
                            {
                              label: "Granted credits",
                              value: (user?.granted_credits_remaining ?? 0).toLocaleString(),
                              sub: "Admin-granted support credits",
                            },
                            {
                              label: "Total available",
                              value: (user?.total_points_remaining ?? 0).toLocaleString(),
                              sub: "Combined account value",
                            },
                          ].map((item) => (
                            <div key={item.label} className="bg-card px-4 py-4">
                              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                                {item.label}
                              </p>
                              <p className="mt-1 text-[24px] font-semibold leading-none tracking-tight text-foreground">
                                {item.value}
                              </p>
                              <p className="mt-1.5 text-[11px] text-muted-foreground">
                                {item.sub}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Period progress bar for paid plans */}
                    {subscription?.current_period_start && subscription?.current_period_end && currentPlan.billing_interval !== "free" && (
                      <div className="border-t border-border px-5 py-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            Billing period
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground/50">
                            {fmtDate(subscription.current_period_start, { month: "short", day: "numeric" })}
                            {" → "}
                            {fmtDate(subscription.current_period_end, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        {(() => {
                          const start = new Date(subscription.current_period_start!).getTime();
                          const end = new Date(subscription.current_period_end!).getTime();
                          const pct = Math.min(100, Math.max(0, ((periodNowMs - start) / (end - start)) * 100));
                          return (
                            <div className="h-1 w-full bg-muted/40 overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Plan grid */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Available plans
                    </p>
                    {subscriptionQuery.isRefetching && (
                      <RefreshCw className="size-3 animate-spin text-muted-foreground/40" />
                    )}
                  </div>

                  {plansQuery.isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="border border-border bg-card p-5 space-y-3">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-9 w-full mt-4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-3">
                      {plans.map((plan) => (
                        <PlanCard
                          key={plan.id}
                          plan={plan}
                          isCurrent={currentPlan?.id === plan.id}
                          accessToken={accessToken}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Info strip */}
                <div className="flex flex-wrap items-center gap-5 border border-border bg-muted/20 px-5 py-3">
                  <p className="text-[12px] text-muted-foreground">
                    Paystack charges in NGN. Stripe charges in USD. You can switch plans at any time.
                  </p>
                  <Link
                    href="/pricing"
                    className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                  >
                    View pricing →
                  </Link>
                </div>

                {/* ── Payment history ── */}
                <div className="border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                    <Receipt className="size-3.5 text-muted-foreground" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Payment history
                    </span>
                    {paymentsQuery.isRefetching && (
                      <RefreshCw className="ml-auto size-3 animate-spin text-muted-foreground/40" />
                    )}
                  </div>

                  {paymentsQuery.isLoading ? (
                    <div className="divide-y divide-border">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="ml-auto h-5 w-14" />
                        </div>
                      ))}
                    </div>
                  ) : paymentsQuery.isError ? (
                    <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-muted-foreground">
                      <AlertCircle className="size-3.5 text-muted-foreground/40" />
                      Could not load payment history.
                    </div>
                  ) : (paymentsQuery.data?.length ?? 0) === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                      <Receipt className="size-7 text-muted-foreground/20" />
                      <div>
                        <p className="text-[13px] font-medium text-foreground">No payments yet</p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground">
                          Your transactions will appear here once you upgrade to a paid plan.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Table header */}
                      <div className="hidden grid-cols-[1fr_100px_120px_100px] border-b border-border/60 bg-muted/20 px-5 py-2 sm:grid">
                        {["Transaction", "Provider", "Amount", "Status"].map((h) => (
                          <span key={h} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                            {h}
                          </span>
                        ))}
                      </div>
                      <div className="divide-y divide-border">
                        {paymentsQuery.data!.map((p) => (
                          <div
                            key={p.id}
                            className="grid grid-cols-1 gap-1.5 px-5 py-4 sm:grid-cols-[1fr_100px_120px_100px] sm:items-center sm:gap-0"
                          >
                            {/* Reference + date */}
                            <div>
                              <p className="font-mono text-[11px] text-foreground">
                                {p.provider_reference}
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {p.plan_snapshot?.name ?? "Plan payment"}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 font-mono text-[9px] text-muted-foreground/50">
                                <Calendar className="size-2.5" />
                                {p.created_at ? fmtDateTime(p.created_at) : "Date unavailable"}
                              </p>
                            </div>

                            {/* Provider */}
                            <span className="font-mono text-[11px] capitalize text-muted-foreground">
                              {p.provider}
                            </span>

                            {/* Amount */}
                            <span className="text-[13px] font-semibold text-foreground">
                              {fmtAmount(p.amount, p.currency)}
                            </span>

                            {/* Status */}
                            <PayStatusBadge status={p.status} />
                          </div>
                        ))}
                      </div>

                      {/* Summary footer */}
                      <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                          {paymentsQuery.data!.filter((p) => p.status === "success").length} successful
                          {" · "}
                          {paymentsQuery.data!.length} total
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          Total paid:{" "}
                          {(() => {
                            const ngnTotal = paymentsQuery.data!
                              .filter((p) => p.status === "success" && p.currency.toUpperCase() === "NGN")
                              .reduce((s, p) => s + p.amount, 0);
                            const usdTotal = paymentsQuery.data!
                              .filter((p) => p.status === "success" && p.currency.toUpperCase() !== "NGN")
                              .reduce((s, p) => s + p.amount, 0);
                            const parts = [];
                            if (ngnTotal > 0) parts.push(`₦${ngnTotal.toLocaleString()}`);
                            if (usdTotal > 0) parts.push(`$${usdTotal.toLocaleString()}`);
                            return parts.length > 0 ? parts.join(" + ") : "—";
                          })()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── Notifications tab ── */}
            {activeTab === "notifications" && (
              <div className="space-y-5">
                {/* Browser notifications */}
                <div className="border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                    <Bell className="size-3.5 text-muted-foreground" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Browser notifications
                    </span>
                    <span className={[
                      "ml-auto font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 border",
                      notifPermission === "granted"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : notifPermission === "denied"
                        ? "border-destructive/20 bg-destructive/5 text-destructive"
                        : "border-border text-muted-foreground",
                    ].join(" ")}>
                      {notifPermission === "unsupported" ? "Not supported" : notifPermission}
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-[13px] text-muted-foreground">
                      Enable browser notifications to receive prompt and billing updates on this device.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                      <span>
                        Registered devices: {notificationSummaryQuery.data?.registered_devices ?? 0}
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span>
                        Unread: {notificationSummaryQuery.data?.unread_count ?? 0}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={notifPermission === "unsupported" || registerNotifMut.isPending}
                        onClick={() => registerNotifMut.mutate()}
                        className="flex items-center gap-2 bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {registerNotifMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Enable notifications
                      </button>
                      <button
                        type="button"
                        disabled={notifPermission === "unsupported" || removeNotifMut.isPending}
                        onClick={() => removeNotifMut.mutate()}
                        className="flex items-center gap-2 border border-border bg-background px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        {removeNotifMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Disable on this browser
                      </button>
                      <button
                        type="button"
                        disabled={notifPermission !== "granted" || testNotifMut.isPending}
                        onClick={() => testNotifMut.mutate()}
                        className="flex items-center gap-2 border border-border bg-background px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        {testNotifMut.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Send test
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notification history */}
                <div className="border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                    <Bell className="size-3.5 text-muted-foreground" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Notification history
                    </span>
                    <button
                      type="button"
                      onClick={() => markAllNotifMut.mutate()}
                      disabled={markAllNotifMut.isPending || (notificationSummaryQuery.data?.unread_count ?? 0) === 0}
                      className="ml-auto border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {markAllNotifMut.isPending ? "Marking..." : "Mark all as read"}
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {notificationsQuery.isLoading ? (
                      <div className="space-y-3 p-5">
                        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                      </div>
                    ) : notificationsQuery.isError ? (
                      <div className="px-5 py-4 text-[13px] text-muted-foreground">
                        Could not load notifications.
                      </div>
                    ) : (notificationsQuery.data?.length ?? 0) === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <Bell className="mx-auto size-6 text-muted-foreground/20" />
                        <p className="mt-3 text-[13px] text-muted-foreground">No notifications yet.</p>
                        <p className="mt-1 text-[12px] text-muted-foreground/60">
                          Prompt, billing, and system updates will appear here.
                        </p>
                      </div>
                    ) : (
                      notificationsQuery.data!.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!item.is_read) {
                              markNotifReadMut.mutate(item.id);
                            }
                          }}
                          className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/20"
                        >
                          <div className={[
                            "mt-0.5 size-1.5 shrink-0 rounded-full",
                            item.is_read ? "bg-muted-foreground/30" : "bg-primary",
                          ].join(" ")} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                            <p className="mt-0.5 text-[12px] text-muted-foreground">{item.body}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground/70">{fmtDateTime(item.created_at)}</p>
                          </div>
                          <span className={[
                            "shrink-0 font-mono text-[9px] border px-1.5 py-0.5",
                            item.is_read
                              ? "border-border text-muted-foreground/40"
                              : "border-primary/20 bg-primary/10 text-primary",
                          ].join(" ")}>
                            {item.is_read ? "Read" : "New"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </SectionContainer>

      <SiteFooter />
    </div>
  );
}
