import Link from "next/link";

import type { PlanRecord } from "@/lib/api/plans";
import type { SubscriptionRecord } from "@/lib/api/subscriptions";
import type { UserRecord } from "@/lib/api/users";
import { getPlanDisplayName } from "@/lib/constants/pricing";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UsageCard({
  isLoading,
  isError,
  plans,
  subscription,
  user,
}: {
  isLoading: boolean;
  isError: boolean;
  plans: PlanRecord[];
  subscription: SubscriptionRecord | null;
  user: UserRecord | null;
}) {
  if (isLoading) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !user) {
    return (
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Plan and usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-border bg-muted">
            <AlertDescription>
              We couldn’t load your plan details right now.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const plan =
    plans.find((item) => item.id === subscription?.plan_id) ??
    plans.find((item) => item.id === user.current_plan_id) ??
    plans.find((item) => item.slug === "free") ??
    null;

  const planName = plan ? getPlanDisplayName(plan) : "Free";
  const limit = plan?.generation_limit ?? 5;
  const usageCount = user.monthly_generation_count;
  const remainingCount = limit < 0 ? null : Math.max(limit - usageCount, 0);
  const isFreePlan = !plan || plan.slug === "free";

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg tracking-tight">Plan and usage</CardTitle>
        <p className="text-sm text-muted-foreground">{planName} plan</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {remainingCount === null
            ? "You have access to higher prompt usage on your current plan."
            : `${usageCount} of ${limit} generations used`}
        </p>
        <p className="text-sm text-muted-foreground">
          {remainingCount === null
            ? "Premium templates and advanced enhancement are available."
            : `${remainingCount} generations remaining. Upgrade for higher limits and premium templates.`}
        </p>
        <Button
          asChild
          className="w-full"
          variant={isFreePlan ? "default" : "outline"}
        >
          <Link href="/settings?tab=billing">
            {isFreePlan ? "Upgrade" : "Manage plan"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
