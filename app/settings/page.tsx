"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CreditCard, ShieldCheck, UserRound } from "lucide-react";

import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SectionContainer } from "@/components/shared/section-container";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getNotifications, registerNotificationToken, removeNotificationToken } from "@/lib/api/notifications";
import {
  getPaymentProviderConfig,
  initializePayment,
  type PaymentProvider,
} from "@/lib/api/payments";
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
} from "@/lib/constants/pricing";

function getBrowserNotificationToken(userId: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return `web:${userId}:${window.location.origin}`;
}

export default function SettingsPage() {
  const session = useAuthSession();
  const accessToken = session?.tokens.access_token ?? "";
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "account";
  const paymentState = searchParams.get("payment");
  const selectedPlanSlug = searchParams.get("plan");
  const selectedProviderFromUrl = searchParams.get("provider");
  const provider: PaymentProvider =
    selectedProviderFromUrl === "stripe" ? "stripe" : "paystack";
  const [notificationPermission, setNotificationPermission] = React.useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window === "undefined") {
      return "default";
    }

    if (!("Notification" in window)) {
      return "unsupported";
    }

    return window.Notification.permission;
  });
  const userQuery = useQuery({
    queryKey: ["user", "me", accessToken],
    queryFn: () => getCurrentUser(accessToken),
    enabled: Boolean(accessToken),
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    enabled: Boolean(accessToken),
  });

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", "me", accessToken],
    queryFn: () => getMySubscription(accessToken),
    enabled: Boolean(accessToken),
  });

  const paymentProviderConfigQuery = useQuery({
    queryKey: ["payments", "providers", "config", accessToken],
    queryFn: () => getPaymentProviderConfig(accessToken),
    enabled: Boolean(accessToken),
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", accessToken],
    queryFn: () => getNotifications(accessToken),
    enabled: Boolean(accessToken),
  });

  const paymentMutation = useMutation({
    mutationFn: async (payload: { planId: string; provider: PaymentProvider }) => {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/settings?tab=billing&payment=return`
          : undefined;

      return initializePayment(accessToken, {
        plan_id: payload.planId,
        provider: payload.provider,
        callback_url: callbackUrl,
      });
    },
    onSuccess: (result) => {
      clearPendingCheckout();

      if (result.authorization.authorization_url) {
        window.location.href = result.authorization.authorization_url;
      }
    },
  });

  const registerNotificationsMutation = useMutation({
    mutationFn: async () => {
      const user = userQuery.data;
      if (!user) {
        throw new Error("User profile is unavailable.");
      }

      if (typeof window === "undefined" || !("Notification" in window)) {
        throw new Error("Browser notifications are not available here.");
      }

      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      await registerNotificationToken(accessToken, getBrowserNotificationToken(user.id));

      new window.Notification("Thynk notifications enabled", {
        body: "You’ll now receive prompt and billing updates on this browser.",
      });
    },
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const removeNotificationsMutation = useMutation({
    mutationFn: async () => {
      const user = userQuery.data;
      if (!user) {
        throw new Error("User profile is unavailable.");
      }

      await removeNotificationToken(accessToken, getBrowserNotificationToken(user.id));
      setNotificationPermission(
        typeof window !== "undefined" && "Notification" in window
          ? window.Notification.permission
          : "unsupported",
      );
    },
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const user = userQuery.data ?? session?.user ?? null;
  const plans = plansQuery.data ?? [];
  const subscription = subscriptionQuery.data ?? null;
  const currentPlan =
    plans.find((plan) => plan.id === subscription?.plan_id) ??
    plans.find((plan) => plan.id === user?.current_plan_id) ??
    plans.find((plan) => plan.slug === "free") ??
    null;
  const checkoutPlan =
    plans.find((plan) => plan.slug === selectedPlanSlug) ??
    currentPlan;
  const paymentProviderConfig = paymentProviderConfigQuery.data ?? null;
  const selectedProviderConfig = paymentProviderConfig?.providers[provider] ?? null;
  const billingReturnMessage =
    paymentState === "return"
      ? "Your checkout was opened successfully. If you completed payment, your plan will update as soon as the provider confirms it."
      : null;

  const settingsTabs = [
    { id: "account", label: "Account", icon: UserRound },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
  ] as const;

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <SectionContainer className="py-10">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in to manage your Thynk account, billing, and notifications.
              </p>
              <Button asChild>
                <Link href="/sign-in">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </SectionContainer>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <SectionContainer className="space-y-6 py-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Manage your Thynk workspace
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card className="border border-border bg-card">
            <CardContent className="space-y-2 p-3">
              {settingsTabs.map(({ id, label, icon: Icon }) => (
                <Button
                  asChild
                  key={id}
                  variant={activeTab === id ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <Link href={`/settings?tab=${id}`}>
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {(activeTab === "account" || activeTab === "billing" || activeTab === "notifications") &&
            userQuery.isLoading ? (
              <Card className="border border-border bg-card">
                <CardContent className="space-y-3 p-6">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "account" ? (
              <Card className="border border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg tracking-tight">
                    <ShieldCheck className="size-4" />
                    Account overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Full name
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {user?.full_name ?? "Not available"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Email
                      </p>
                      <p className="mt-2 text-sm text-foreground">{user?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Verification
                      </p>
                      <div className="mt-2">
                        <Badge variant="secondary">
                          {user?.is_verified ? "Verified" : "Verification pending"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Subscription status
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline">
                          {user?.subscription_status ?? "Free"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "billing" ? (
              <div className="space-y-6">
                {billingReturnMessage ? (
                  <Alert className="border-border bg-muted">
                    <AlertDescription>{billingReturnMessage}</AlertDescription>
                  </Alert>
                ) : null}

                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg tracking-tight">
                      Billing and plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        Current plan:{" "}
                        {currentPlan ? getPlanDisplayName(currentPlan) : "Free"}
                      </Badge>
                      {subscription?.provider ? (
                        <Badge variant="outline">
                          Provider: {subscription.provider}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Choose the plan you want, then pick your preferred checkout
                      provider. Stripe charges in USD. Paystack charges in naira.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg tracking-tight">
                      Payment integration setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {paymentProviderConfigQuery.isLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : paymentProviderConfigQuery.isError || !selectedProviderConfig ? (
                      <Alert className="border-border bg-muted">
                        <AlertDescription>
                          We couldn&apos;t load your payment integration details right now.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{selectedProviderConfig.name}</Badge>
                          <Badge variant="outline">
                            Header: {selectedProviderConfig.signature_header}
                          </Badge>
                          <Badge
                            variant={
                              selectedProviderConfig.webhook_secret_required
                                ? "outline"
                                : "secondary"
                            }
                          >
                            {selectedProviderConfig.webhook_secret_required
                              ? "Separate webhook secret required"
                              : "No separate webhook secret"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {selectedProviderConfig.instructions}
                        </p>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Callback URL
                            </p>
                            <Input readOnly value={selectedProviderConfig.callback_url} />
                            <p className="text-xs text-muted-foreground">
                              Use this as the return URL after checkout.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              Webhook URL
                            </p>
                            <Input readOnly value={selectedProviderConfig.webhook_url} />
                            <p className="text-xs text-muted-foreground">
                              Paste this into your {selectedProviderConfig.name} dashboard.
                            </p>
                          </div>
                        </div>
                        <Alert className="border-border bg-muted">
                          <AlertDescription>
                            {provider === "paystack"
                              ? "Paystack signs webhook requests with your secret key. Keep PAYSTACK_SECRET_KEY on the backend, then add the webhook URL above in Paystack Settings > API Keys & Webhooks."
                              : `Stripe validates the ${selectedProviderConfig.signature_header} header using ${selectedProviderConfig.signature_source}.`}
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  {plans.map((plan) => {
                    const isSelected = checkoutPlan?.id === plan.id;
                    const isCurrent = currentPlan?.id === plan.id;

                    return (
                      <Card
                        key={plan.id}
                        className="border border-border bg-card"
                      >
                        <CardHeader className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-xl tracking-tight">
                                {getPlanDisplayName(plan)}
                              </CardTitle>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {plan.description}
                              </p>
                            </div>
                            {isCurrent ? (
                              <Badge variant="secondary">Current</Badge>
                            ) : isSelected ? (
                              <Badge variant="outline">Selected</Badge>
                            ) : null}
                          </div>
                          <div className="text-3xl font-semibold tracking-tight text-foreground">
                            {formatPlanPrice(plan)}
                            <span className="ml-1 text-sm font-normal text-muted-foreground">
                              {getPlanCadence(plan)}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant={provider === "paystack" ? "default" : "outline"}
                            >
                              <Link
                                href={`/settings?tab=billing&plan=${plan.slug}&provider=paystack`}
                              >
                                Paystack {formatPlanProviderPrice(plan, "paystack")}
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant={provider === "stripe" ? "default" : "outline"}
                            >
                              <Link
                                href={`/settings?tab=billing&plan=${plan.slug}&provider=stripe`}
                              >
                                Stripe {formatPlanProviderPrice(plan, "stripe")}
                              </Link>
                            </Button>
                          </div>
                          <Separator />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              disabled={
                                paymentMutation.isPending ||
                                plan.slug === "free"
                              }
                              onClick={() =>
                                paymentMutation.mutate({
                                  planId: plan.id,
                                  provider,
                                })
                              }
                            >
                              {plan.slug === "free"
                                ? "Included"
                                : paymentMutation.isPending && isSelected
                                  ? "Preparing checkout..."
                                  : `Continue with ${provider === "stripe" ? "Stripe" : "Paystack"}`}
                            </Button>
                            {!isSelected ? (
                              <Button asChild type="button" variant="outline">
                                <Link
                                  href={`/settings?tab=billing&plan=${plan.slug}&provider=${provider}`}
                                >
                                  Select plan
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {paymentMutation.isError ? (
                  <Alert className="border-border bg-muted">
                    <AlertDescription>
                      {paymentMutation.error instanceof Error
                        ? paymentMutation.error.message
                        : "We couldn’t start checkout right now."}
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>
            ) : null}

            {activeTab === "notifications" ? (
              <div className="space-y-6">
                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg tracking-tight">
                      Browser notifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {notificationPermission === "unsupported"
                          ? "Unsupported"
                          : notificationPermission}
                      </Badge>
                      <Badge variant="outline">Web notifications</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enable browser notifications to receive prompt and billing
                      updates on this device.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        disabled={
                          notificationPermission === "unsupported" ||
                          registerNotificationsMutation.isPending
                        }
                        onClick={() => registerNotificationsMutation.mutate()}
                      >
                        {registerNotificationsMutation.isPending
                          ? "Enabling..."
                          : "Enable notifications"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          notificationPermission === "unsupported" ||
                          removeNotificationsMutation.isPending
                        }
                        onClick={() => removeNotificationsMutation.mutate()}
                      >
                        {removeNotificationsMutation.isPending
                          ? "Removing..."
                          : "Disable on this browser"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          notificationPermission !== "granted" ||
                          typeof window === "undefined"
                        }
                        onClick={() => {
                          if ("Notification" in window && window.Notification.permission === "granted") {
                            new window.Notification("Thynk test notification", {
                              body: "Your browser notifications are working.",
                            });
                          }
                        }}
                      >
                        Send test notification
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg tracking-tight">
                      Notification history
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {notificationsQuery.isLoading ? (
                      <>
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                      </>
                    ) : notificationsQuery.isError ? (
                      <Alert className="border-border bg-muted">
                        <AlertDescription>
                          We couldn’t load your notifications right now.
                        </AlertDescription>
                      </Alert>
                    ) : notificationsQuery.data?.length ? (
                      notificationsQuery.data.map((item) => (
                        <div
                          key={item.id}
                          className="border border-border bg-background p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {item.title}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.body}
                              </p>
                            </div>
                            <Badge variant={item.is_read ? "outline" : "secondary"}>
                              {item.is_read ? "Read" : "New"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Alert className="border-border bg-muted">
                        <AlertDescription>
                          No notifications yet. Prompt, billing, and system updates
                          will appear here.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </SectionContainer>
      <SiteFooter />
    </div>
  );
}
