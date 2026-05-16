"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { getMySubscription } from "@/lib/api/subscriptions";
import { getPlans } from "@/lib/api/plans";
import { getCurrentUser } from "@/lib/api/users";
import { useAuthSession } from "@/lib/auth/session";
import { workspaceQuickActions } from "@/lib/constants/workspace";
import { RecentChats } from "@/components/workspace/recent-chats";
import { SavedPrompts } from "@/components/workspace/saved-prompts";
import { UsageCard } from "@/components/workspace/usage-card";
import { WorkspacePromptBox } from "@/components/workspace/workspace-prompt-box";
import { SectionContainer } from "@/components/shared/section-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UserHome() {
  const session = useAuthSession();
  const accessToken = session?.tokens.access_token ?? "";

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

  const user = userQuery.data ?? session?.user ?? null;
  const firstName = user?.full_name?.split(" ")[0];

  return (
    <SectionContainer id="workspace" className="space-y-6 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Your Thynk workspace
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {workspaceQuickActions.map((action) => (
            <Button asChild key={action.label} size="sm" variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <WorkspacePromptBox />
        <UsageCard
          isError={userQuery.isError || plansQuery.isError || subscriptionQuery.isError}
          isLoading={userQuery.isLoading || plansQuery.isLoading || subscriptionQuery.isLoading}
          plans={plansQuery.data ?? []}
          subscription={subscriptionQuery.data ?? null}
          user={user}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentChats accessToken={accessToken} />
        <SavedPrompts accessToken={accessToken} />
      </div>

      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg tracking-tight">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {workspaceQuickActions.map((action) => (
            <Button asChild key={action.label} size="sm" variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </SectionContainer>
  );
}
