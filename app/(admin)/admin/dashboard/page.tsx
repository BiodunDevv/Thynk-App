"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Zap,
  CreditCard,
  MessageSquare,
  HeadphonesIcon,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminOverview } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent?: "primary" | "success" | "warning" | "destructive";
  sub?: string;
}) {
  const iconCls =
    accent === "success"
      ? "text-emerald-500"
      : accent === "warning"
      ? "text-orange-400"
      : accent === "destructive"
      ? "text-destructive"
      : "text-primary";

  const bgCls =
    accent === "success"
      ? "bg-emerald-500/10"
      : accent === "warning"
      ? "bg-orange-400/10"
      : accent === "destructive"
      ? "bg-destructive/10"
      : "bg-primary/10";

  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <div className={`flex size-8 items-center justify-center ${bgCls}`}>
          <Icon className={`size-4 ${iconCls}`} />
        </div>
      </div>
      <div>
        <p className="text-[2rem] font-semibold leading-none tracking-tight text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>
        )}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-8" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-overview", token],
    queryFn: () => getAdminOverview(token),
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const adminName = session?.user.full_name ?? session?.user.email.split("@")[0] ?? "Admin";

  return (
    <div className="px-6 py-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Dashboard · Overview
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {adminName}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening with Thynk right now.
        </p>
      </div>

      {/* Stats grid */}
      {isLoading && (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load dashboard metrics. Check your connection or try refreshing.
        </div>
      )}

      {data && (
        <>
          {/* Primary metrics */}
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total users"
              value={data.total_users}
              icon={Users}
              sub={`${data.active_users.toLocaleString()} active`}
            />
            <StatCard
              label="Verified users"
              value={data.verified_users}
              icon={CheckCircle}
              accent="success"
              sub={`${Math.round((data.verified_users / Math.max(data.total_users, 1)) * 100)}% of all users`}
            />
            <StatCard
              label="Paying users"
              value={data.paying_users}
              icon={CreditCard}
              accent="primary"
              sub="Active subscriptions"
            />
            <StatCard
              label="Prompts generated"
              value={data.total_prompts_generated}
              icon={Zap}
              accent="primary"
              sub="All time"
            />
          </div>

          {/* Secondary metrics */}
          <div className="mt-px grid gap-px border-x border-b border-border bg-border sm:grid-cols-3">
            <StatCard
              label="Open support tickets"
              value={data.open_support_tickets}
              icon={HeadphonesIcon}
              accent={data.open_support_tickets > 10 ? "warning" : "success"}
              sub={data.open_support_tickets === 0 ? "All clear" : "Awaiting response"}
            />
            <StatCard
              label="Reported chats"
              value={data.reported_request_chats}
              icon={MessageSquare}
              accent={data.reported_request_chats > 0 ? "destructive" : "success"}
              sub={data.reported_request_chats === 0 ? "Nothing flagged" : "Needs review"}
            />
            <StatCard
              label="Active users"
              value={data.active_users}
              icon={TrendingUp}
              accent="primary"
              sub={`${data.total_users - data.active_users} inactive`}
            />
          </div>

          {/* Alert strip */}
          {(data.open_support_tickets > 0 || data.reported_request_chats > 0) && (
            <div className="mt-6 flex flex-col gap-2">
              {data.open_support_tickets > 0 && (
                <div className="flex items-center gap-3 border border-orange-400/30 bg-orange-400/5 px-4 py-3">
                  <AlertTriangle className="size-4 shrink-0 text-orange-400" />
                  <p className="text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">{data.open_support_tickets} support ticket{data.open_support_tickets !== 1 ? "s" : ""}</span> awaiting your attention.
                  </p>
                  <a href="/admin/dashboard/support" className="ml-auto font-mono text-[10px] uppercase tracking-wider text-orange-400 hover:opacity-70">
                    View →
                  </a>
                </div>
              )}
              {data.reported_request_chats > 0 && (
                <div className="flex items-center gap-3 border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                  <p className="text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">{data.reported_request_chats} reported chat{data.reported_request_chats !== 1 ? "s" : ""}</span> flagged for review.
                  </p>
                  <a href="/admin/dashboard/chats" className="ml-auto font-mono text-[10px] uppercase tracking-wider text-destructive hover:opacity-70">
                    View →
                  </a>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
