"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight, CheckCircle, Clock, XCircle,
  TrendingUp, Users, DollarSign, Search,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPayments } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ──────────────────────────────────────────────────────── */

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtAmount(amount: number | null | undefined, currency: string | null | undefined) {
  const sym = (currency ?? "").toUpperCase() === "NGN" ? "₦" : "$";
  if (!Number.isFinite(amount)) return `${sym}—`;
  return `${sym}${Number(amount).toLocaleString()}`;
}

function cap(s: string | null | undefined) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function paymentUserLabel(payment: {
  user_name?: string | null;
  user_email?: string | null;
  user_id?: string | null;
}) {
  return payment.user_name || payment.user_email || "Unknown customer";
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "pending";
  const cfg: Record<string, { icon: React.ElementType; color: string }> = {
    success:   { icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-400" },
    pending:   { icon: Clock,       color: "bg-amber-500/10 text-amber-400" },
    failed:    { icon: XCircle,     color: "bg-destructive/10 text-destructive" },
    cancelled: { icon: XCircle,     color: "bg-muted text-muted-foreground" },
  };
  const c = cfg[s] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${c.color}`}>
      <Icon className="size-2.5" />
      {s}
    </span>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */

export default function AdminPaymentsPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const { data: payments = [], isLoading, isError } = useQuery({
    queryKey: ["admin-payments", token],
    queryFn: () => getAdminPayments(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  /* Derived stats */
  const successPayments = payments.filter((p) => p.status === "success");
  const pendingPayments = payments.filter((p) => p.status === "pending" || !p.status);
  const totalRevenue = successPayments.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? Number(p.amount) : 0), 0);
  const uniqueUsers = new Set(payments.map((p) => p.user_id).filter(Boolean)).size;

  /* Filtered list */
  const filtered = payments.filter((p) => {
    const matchesStatus = statusFilter === "all" || (p.status ?? "pending") === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (p.id ?? "").toLowerCase().includes(q) ||
      (p.user_id ?? "").toLowerCase().includes(q) ||
      (p.user_name ?? "").toLowerCase().includes(q) ||
      (p.user_email ?? "").toLowerCase().includes(q) ||
      (p.provider_reference ?? "").toLowerCase().includes(q) ||
      (p.provider ?? "").toLowerCase().includes(q) ||
      (p.plan_name ?? p.plan_snapshot?.name ?? "").toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="px-6 py-6 lg:px-8">

      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Admin · Payments
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">Payments</h1>
      </div>

      {/* Stat cards */}
      {!isLoading && !isError && (
        <div className="mb-6 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {[
            {
              icon: DollarSign,
              label: "Total revenue",
              value: `₦${totalRevenue.toLocaleString()}`,
              color: "text-emerald-400",
              sub: `${successPayments.length} successful`,
            },
            {
              icon: CheckCircle,
              label: "Successful",
              value: successPayments.length.toString(),
              color: "text-emerald-400",
              sub: `${payments.length > 0 ? Math.round((successPayments.length / payments.length) * 100) : 0}% success rate`,
            },
            {
              icon: Clock,
              label: "Pending",
              value: pendingPayments.length.toString(),
              color: "text-amber-400",
              sub: "awaiting confirmation",
            },
            {
              icon: Users,
              label: "Unique payers",
              value: uniqueUsers.toString(),
              color: "text-sky-400",
              sub: `${payments.length} total transactions`,
            },
          ].map(({ icon: Icon, label, value, color, sub }) => (
            <div key={label} className="flex flex-col gap-0.5 bg-card px-5 py-4">
              <Icon className={`size-4 ${color}`} />
              <p className="mt-2 text-[20px] font-bold tabular-nums text-foreground">{value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/50">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!isLoading && !isError && payments.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search by ID, user, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 border border-border bg-background py-2 pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            {[
              { id: "all", label: "All" },
              { id: "success", label: "Successful" },
              { id: "pending", label: "Pending" },
              { id: "failed", label: "Failed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={[
                  "px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors border",
                  statusFilter === f.id
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
            {filtered.length} of {payments.length}
          </span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="border border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-5 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="border border-destructive/30 bg-destructive/5 px-5 py-4 text-[13px] text-destructive">
          Failed to load payments. Please refresh.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <div className="border border-border">
          {/* Table header */}
          <div className="hidden grid-cols-[1fr_110px_120px_100px_110px_32px] border-b border-border bg-muted/30 px-5 py-2.5 sm:grid">
            {["Reference", "Provider", "Amount", "Status", "Date", ""].map((h) => (
              <span key={h} className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                {h}
              </span>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <TrendingUp className="size-8 text-muted-foreground/20" />
              <p className="text-[13px] font-medium text-foreground">
                {search || statusFilter !== "all" ? "No results" : "No payments yet"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Try clearing your search or filter."
                  : "Payments will appear here once users start checking out."}
              </p>
            </div>
          )}

          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/admin/dashboard/payments/${p.id}`}
              className="flex flex-col gap-2 border-b border-border px-5 py-3.5 transition-colors last:border-b-0 hover:bg-muted/10 sm:grid sm:grid-cols-[1fr_110px_120px_100px_110px_32px] sm:items-center sm:gap-0"
            >
              {/* Reference + user */}
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] text-foreground">
                  {p.provider_reference ?? p.id.slice(-12)}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-foreground/85">
                  {paymentUserLabel(p)}
                </p>
                {p.plan_snapshot?.name ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {p.plan_snapshot.name}
                  </p>
                ) : null}
                {p.user_id && !p.user_name && !p.user_email && (
                  <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/50">
                    user: {p.user_id.slice(-10)}
                  </p>
                )}
              </div>

              {/* Provider */}
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {cap(p.provider)}
              </span>

              {/* Amount */}
              <span className="text-[13px] font-semibold text-foreground">
                {fmtAmount(p.amount, p.currency)}
              </span>

              {/* Status */}
              <StatusBadge status={p.status} />

              {/* Date */}
              <span className="text-[11px] text-muted-foreground">{fmtDate(p.created_at)}</span>

              {/* Arrow */}
              <ChevronRight className="size-3.5 text-muted-foreground/30" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
