"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, ChevronRight, CheckCircle, Clock, XCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPayments, type AdminPayment } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ElementType; color: string }> = {
    success: { icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-400" },
    pending: { icon: Clock,       color: "bg-amber-500/10 text-amber-400" },
    failed:  { icon: XCircle,     color: "bg-destructive/10 text-destructive" },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${c.color}`}>
      <Icon className="size-2.5" />
      {status}
    </span>
  );
}

import * as React from "react";

export default function AdminPaymentsPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";

  const { data: payments = [], isLoading, isError } = useQuery({
    queryKey: ["admin-payments", token],
    queryFn: () => getAdminPayments(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const successPayments = payments.filter((p) => p.status === "success");
  const total = successPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="px-6 py-6 lg:px-8">

      {/* Header */}
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Admin · Payments</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">Payments</h1>
      </div>

      {/* Revenue callout */}
      {!isLoading && !isError && payments.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
          {[
            { label: "Total revenue", value: `₦${total.toLocaleString()}`, icon: CreditCard, color: "text-emerald-400" },
            { label: "Successful", value: successPayments.length.toString(), icon: CheckCircle, color: "text-emerald-400" },
            { label: "All payments", value: payments.length.toString(), icon: Clock, color: "text-sky-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3.5 bg-card px-5 py-4">
              <Icon className={`size-4 ${color}`} />
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-[18px] font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="border border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load payments.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="border border-border">
          {/* Table header */}
          <div className="grid grid-cols-[1.5fr_1fr_110px_100px_130px_32px] border-b border-border bg-card px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            <span>User</span>
            <span>Provider</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Date</span>
            <span />
          </div>

          {payments.length === 0 && (
            <div className="px-5 py-12 text-center text-[13px] text-muted-foreground">No payments yet.</div>
          )}

          {payments.map((p) => (
            <Link
              key={p.id}
              href={`/admin/dashboard/payments/${p.id}`}
              className="grid grid-cols-[1.5fr_1fr_110px_100px_130px_32px] items-center border-b border-border px-5 py-3.5 last:border-b-0 transition-colors hover:bg-muted/10"
            >
              <span className="truncate font-mono text-[11px] text-muted-foreground">{p.user_id.slice(-10)}</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{p.provider}</span>
              <span className="text-[13px] font-medium text-foreground">
                {p.currency?.toUpperCase() === "NGN" ? "₦" : "$"}{p.amount.toLocaleString()}
              </span>
              <StatusBadge status={p.status} />
              <span className="text-[12px] text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <ChevronRight className="size-3.5 text-muted-foreground/40" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
