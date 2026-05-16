"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, TrendingUp, TrendingDown, Users, BarChart2,
  Activity, AlertTriangle, CheckCircle2, RefreshCw,
  DollarSign, Cpu, Globe,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getSystemAnalytics, type SystemAnalytics } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── Tiny bar chart ──────────────────────────────────────────────── */
function MiniBarChart({
  data,
  color = "var(--primary)",
  height = 48,
}: {
  data: { value: number; label: string }[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {data.map((d, i) => (
        <div
          key={i}
          title={`${d.label}: ${d.value.toLocaleString()}`}
          className="flex-1 rounded-sm opacity-80 transition-all hover:opacity-100"
          style={{
            height: `${Math.max((d.value / max) * 100, 2)}%`,
            backgroundColor: color,
            minWidth: 3,
          }}
        />
      ))}
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  accent = "primary",
  chart,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "primary" | "success" | "warning" | "destructive" | "sky" | "violet";
  chart?: { value: number; label: string }[];
}) {
  const iconColors: Record<string, string> = {
    primary: "text-primary",
    success: "text-emerald-500",
    warning: "text-orange-400",
    destructive: "text-destructive",
    sky: "text-sky-400",
    violet: "text-violet-400",
  };
  const bgColors: Record<string, string> = {
    primary: "bg-primary/10",
    success: "bg-emerald-500/10",
    warning: "bg-orange-400/10",
    destructive: "bg-destructive/10",
    sky: "bg-sky-400/10",
    violet: "bg-violet-400/10",
  };
  const chartColors: Record<string, string> = {
    primary: "var(--primary)",
    success: "#10b981",
    warning: "#f97316",
    destructive: "var(--destructive)",
    sky: "#38bdf8",
    violet: "#a78bfa",
  };

  return (
    <div className="flex flex-col gap-3 border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <div className={`flex size-8 items-center justify-center ${bgColors[accent]}`}>
          <Icon className={`size-4 ${iconColors[accent]}`} />
        </div>
      </div>

      <div>
        <p className="text-[2rem] font-semibold leading-none tracking-tight text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p className="mt-1.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>

      {chart && chart.length > 0 && (
        <MiniBarChart data={chart} color={chartColors[accent]} height={40} />
      )}

      {trendLabel && (
        <div className="flex items-center gap-1.5">
          {trend === "up" && <TrendingUp className="size-3 text-emerald-500" />}
          {trend === "down" && <TrendingDown className="size-3 text-destructive" />}
          {trend === "neutral" && <Activity className="size-3 text-muted-foreground" />}
          <span className={`font-mono text-[10px] ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Horizontal bar list ─────────────────────────────────────────── */
function RankList({
  items,
  label,
  color = "var(--primary)",
}: {
  items: { name: string; count: number }[];
  label: string;
  color?: string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center gap-4 px-5 py-3">
            <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground/50 tabular-nums">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-medium capitalize text-foreground">{item.name}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-1 overflow-hidden bg-muted">
                <div
                  className="h-full transition-all duration-700"
                  style={{ width: `${(item.count / max) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="px-5 py-6 text-center text-[12px] text-muted-foreground">No data yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── Token usage timeline ────────────────────────────────────────── */
function TokenTimeline({ data }: { data: SystemAnalytics["ai_usage"] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center border border-border bg-card">
        <p className="text-[12px] text-muted-foreground">No AI usage data available.</p>
      </div>
    );
  }

  const maxTokens = Math.max(...data.map((d) => d.total_tokens), 1);
  const maxRequests = Math.max(...data.map((d) => d.total_requests), 1);

  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="text-[13px] font-semibold text-foreground">Token usage over time</p>
        <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-full bg-primary" />Tokens</span>
          <span className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-full bg-sky-400" />Requests</span>
          <span className="flex items-center gap-1.5"><span className="inline-block size-2 rounded-full bg-destructive" />Failures</span>
        </div>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <div className="flex min-w-[400px] items-end gap-[3px]" style={{ height: 120 }}>
          {data.map((d, i) => (
            <div key={i} className="group relative flex-1 flex flex-col items-center gap-0.5">
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full mb-2 hidden min-w-[140px] border border-border bg-card p-2 shadow-md group-hover:block z-10">
                <p className="font-mono text-[9px] text-muted-foreground">{d.date}</p>
                <p className="text-[10px] text-foreground">{d.total_tokens.toLocaleString()} tokens</p>
                <p className="text-[10px] text-sky-400">{d.total_requests} requests</p>
                {d.failed_requests > 0 && (
                  <p className="text-[10px] text-destructive">{d.failed_requests} failed</p>
                )}
                <p className="text-[10px] text-muted-foreground">avg {d.avg_tokens_per_request} tok/req</p>
              </div>

              {/* Token bar */}
              <div
                className="w-full bg-primary/70 hover:bg-primary transition-colors"
                style={{ height: `${(d.total_tokens / maxTokens) * 100}%`, minHeight: 2 }}
              />
              {/* Requests dot */}
              <div
                className="absolute w-full bg-sky-400/40"
                style={{
                  height: `${(d.total_requests / maxRequests) * 30}%`,
                  bottom: 0,
                  minHeight: 2,
                }}
              />
            </div>
          ))}
        </div>
        {/* X axis labels — show every 5th */}
        <div className="mt-2 flex min-w-[400px] items-center gap-[3px]">
          {data.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 5 === 0 && (
                <span className="font-mono text-[8px] text-muted-foreground/60">
                  {new Date(d.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Revenue timeline ────────────────────────────────────────────── */
function RevenueTimeline({ data }: { data: SystemAnalytics["revenue_by_day"] }) {
  if (data.length === 0) return null;
  const maxRevenue = Math.max(...data.map((d) => d.amount), 1);
  const total = data.reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Revenue</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {data[0]?.currency?.toUpperCase() ?? "USD"} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total in period
          </p>
        </div>
      </div>
      <div className="overflow-x-auto px-5 py-4">
        <div className="flex min-w-[400px] items-end gap-[3px]" style={{ height: 80 }}>
          {data.map((d, i) => (
            <div
              key={i}
              title={`${d.date}: ${d.amount}`}
              className="flex-1 bg-emerald-500/60 hover:bg-emerald-500 transition-colors"
              style={{ height: `${Math.max((d.amount / maxRevenue) * 100, 2)}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex min-w-[400px] items-center gap-[3px]">
          {data.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 5 === 0 && (
                <span className="font-mono text-[8px] text-muted-foreground/60">
                  {new Date(d.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Plan distribution ───────────────────────────────────────────── */
function PlanDistribution({ data }: { data: SystemAnalytics["plan_distribution"] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0);
  const COLORS = ["var(--primary)", "#10b981", "#38bdf8", "#a78bfa", "#f97316", "#f43f5e"];

  if (total === 0) {
    return (
      <div className="border border-border bg-card p-5">
        <p className="text-[13px] font-semibold text-foreground">Plan distribution</p>
        <p className="mt-4 text-center text-[12px] text-muted-foreground">No data yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[13px] font-semibold text-foreground">Plan distribution</p>
        <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{total.toLocaleString()} users tracked</p>
      </div>
      <div className="divide-y divide-border">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.plan} className="flex items-center gap-4 px-5 py-3">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <div className="flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-medium capitalize text-foreground">{d.plan}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{d.count.toLocaleString()}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/60">{pct}%</span>
                  </div>
                </div>
                <div className="h-1 overflow-hidden bg-muted">
                  <div
                    className="h-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Daily growth chart ──────────────────────────────────────────── */
function DailyChart({
  data,
  label,
  color,
}: {
  data: { date: string; count: number }[];
  label: string;
  color: string;
}) {
  const chart = data.map((d) => ({
    value: d.count,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));
  const total = data.reduce((a, d) => a + d.count, 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;
  const last7 = data.slice(-7).reduce((a, d) => a + d.count, 0);

  return (
    <div className="border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <div className="text-right">
          <p className="font-mono text-[18px] font-bold tabular-nums text-foreground">{total.toLocaleString()}</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">total in period</p>
        </div>
      </div>
      <MiniBarChart data={chart} color={color} height={56} />
      <div className="flex items-center gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">7-day</p>
          <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{last7}</p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Daily avg</p>
          <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{avg}</p>
        </div>
      </div>
    </div>
  );
}

/* ── System health row ───────────────────────────────────────────── */
function HealthRow({ label, value, status, sub }: { label: string; value: string; status: "good" | "warn" | "bad"; sub?: string }) {
  const dot = status === "good" ? "bg-emerald-500" : status === "warn" ? "bg-orange-400" : "bg-destructive";
  const text = status === "good" ? "text-emerald-500" : status === "warn" ? "text-orange-400" : "text-destructive";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        <span className={`size-1.5 rounded-full ${dot}`} />
        <span className="text-[13px] text-foreground">{label}</span>
        {sub && <span className="font-mono text-[10px] text-muted-foreground/60">{sub}</span>}
      </div>
      <span className={`font-mono text-[13px] font-semibold tabular-nums ${text}`}>{value}</span>
    </div>
  );
}

/* ── Day range selector ──────────────────────────────────────────── */
const RANGES = [{ label: "7d", value: 7 }, { label: "14d", value: 14 }, { label: "30d", value: 30 }, { label: "90d", value: 90 }];

/* ── Page ────────────────────────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const [days, setDays] = React.useState(30);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-analytics", token, days],
    queryFn: () => getSystemAnalytics(token, days),
    enabled: Boolean(token),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  /* Derived numbers */
  const totalTokens = data?.total_tokens_all_time ?? 0;
  const totalRequests = data?.total_ai_requests_all_time ?? 0;
  const avgResponseMs = data?.avg_response_time_ms ?? 0;
  const successRate = data?.success_rate_pct ?? 0;

  const aiChart = (data?.ai_usage ?? []).map((d) => ({ value: d.total_tokens, label: d.date }));
  const requestChart = (data?.ai_usage ?? []).map((d) => ({ value: d.total_requests, label: d.date }));

  const successStatus: "good" | "warn" | "bad" =
    successRate >= 99 ? "good" : successRate >= 95 ? "warn" : "bad";
  const latencyStatus: "good" | "warn" | "bad" =
    avgResponseMs < 2000 ? "good" : avgResponseMs < 5000 ? "warn" : "bad";

  const totalPeriodRequests = data?.ai_usage.reduce((a, d) => a + d.total_requests, 0) ?? 0;
  const totalPeriodTokens = data?.ai_usage.reduce((a, d) => a + d.total_tokens, 0) ?? 0;
  const totalPeriodFailed = data?.ai_usage.reduce((a, d) => a + d.failed_requests, 0) ?? 0;
  const periodAvgTok = totalPeriodRequests > 0 ? Math.round(totalPeriodTokens / totalPeriodRequests) : 0;

  return (
    <div className="px-6 py-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Dashboard · Analytics</p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">System Analytics</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Deep performance, AI usage, and growth metrics across the entire platform.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Range selector */}
          <div className="flex border border-border bg-card">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={[
                  "px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  days === r.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex size-8 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-3 border border-orange-400/30 bg-orange-400/5 px-5 py-4">
          <AlertTriangle className="size-4 text-orange-400" />
          <p className="text-[13px] text-muted-foreground">
            Analytics endpoint not available. The backend may need a <code className="text-[11px] bg-muted px-1">/admin/analytics</code> route.
            Displaying structure — data will populate once connected.
          </p>
        </div>
      )}

      {/* ── AI Usage ── */}
      <div>
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          AI · OpenAI usage — last {days} days
        </p>

        {isLoading ? (
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-card p-5"><Skeleton className="h-20" /></div>)}
          </div>
        ) : (
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total tokens (all time)"
              value={totalTokens.toLocaleString()}
              sub="Prompt + completion tokens"
              icon={Zap}
              accent="primary"
              chart={aiChart.slice(-14)}
              trendLabel={`${totalPeriodTokens.toLocaleString()} in last ${days}d`}
              trend="neutral"
            />
            <MetricCard
              label="Total AI requests"
              value={totalRequests.toLocaleString()}
              sub="All-time requests"
              icon={Cpu}
              accent="sky"
              chart={requestChart.slice(-14)}
              trendLabel={`${totalPeriodRequests.toLocaleString()} in period`}
              trend={totalPeriodRequests > 0 ? "up" : "neutral"}
            />
            <MetricCard
              label="Avg tokens / request"
              value={periodAvgTok.toLocaleString()}
              sub="This period"
              icon={BarChart2}
              accent="violet"
              trendLabel={periodAvgTok > 800 ? "High usage per call" : "Efficient usage"}
              trend={periodAvgTok > 1200 ? "down" : "up"}
            />
            <MetricCard
              label="Failed requests"
              value={totalPeriodFailed.toLocaleString()}
              sub="API errors in period"
              icon={AlertTriangle}
              accent={totalPeriodFailed === 0 ? "success" : totalPeriodFailed < 10 ? "warning" : "destructive"}
              trendLabel={totalPeriodFailed === 0 ? "Clean run" : `${((totalPeriodFailed / Math.max(totalPeriodRequests, 1)) * 100).toFixed(1)}% error rate`}
              trend={totalPeriodFailed === 0 ? "up" : "down"}
            />
          </div>
        )}
      </div>

      {/* Token usage timeline */}
      {isLoading ? (
        <Skeleton className="h-52" />
      ) : (
        <TokenTimeline data={data?.ai_usage ?? []} />
      )}

      {/* ── System health ── */}
      <div>
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">System health</p>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border border-border bg-card">
              <div className="border-b border-border px-5 py-3.5">
                <p className="text-[13px] font-semibold text-foreground">Performance indicators</p>
              </div>
              <div className="px-5">
                <HealthRow
                  label="AI success rate"
                  value={`${successRate.toFixed(2)}%`}
                  status={successStatus}
                  sub="last 30 days"
                />
                <HealthRow
                  label="Avg response latency"
                  value={`${avgResponseMs.toLocaleString()} ms`}
                  status={latencyStatus}
                  sub="per AI request"
                />
                <HealthRow
                  label="Requests in period"
                  value={totalPeriodRequests.toLocaleString()}
                  status="good"
                />
                <HealthRow
                  label="Period error count"
                  value={totalPeriodFailed.toLocaleString()}
                  status={totalPeriodFailed === 0 ? "good" : totalPeriodFailed < 5 ? "warn" : "bad"}
                />
              </div>
            </div>

            <PlanDistribution data={data?.plan_distribution ?? []} />
          </div>
        )}
      </div>

      {/* ── Growth metrics ── */}
      <div>
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Growth · last {days} days</p>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <DailyChart
              data={data?.daily_new_users ?? []}
              label="New user signups"
              color="#10b981"
            />
            <DailyChart
              data={data?.daily_generations ?? []}
              label="Prompt generations"
              color="var(--primary)"
            />
          </div>
        )}
      </div>

      {/* ── Revenue ── */}
      {!isLoading && (data?.revenue_by_day?.length ?? 0) > 0 && (
        <div>
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Revenue · last {days} days</p>
          <RevenueTimeline data={data!.revenue_by_day} />
        </div>
      )}

      {/* ── Top categories + platforms ── */}
      <div>
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Usage breakdown</p>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <RankList
              label="Top categories"
              items={(data?.top_categories ?? []).map((d) => ({ name: d.category, count: d.count }))}
              color="var(--primary)"
            />
            <RankList
              label="Top platforms"
              items={(data?.top_platforms ?? []).map((d) => ({ name: d.platform, count: d.count }))}
              color="#38bdf8"
            />
          </div>
        )}
      </div>

    </div>
  );
}
