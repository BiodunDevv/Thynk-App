"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronRight, DollarSign, Calendar, CreditCard,
  CheckCircle, XCircle, Clock, User,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPayment, type AdminPayment } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    success:  { icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Success" },
    pending:  { icon: Clock,       color: "bg-amber-500/10 text-amber-400 border-amber-500/20",       label: "Pending" },
    failed:   { icon: XCircle,     color: "bg-destructive/10 text-destructive border-destructive/20",  label: "Failed" },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${c.color}`}>
      <Icon className="size-3.5" />
      {c.label}
    </span>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <div className="text-right text-[13px] text-foreground">{children}</div>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";

  const { data: payment, isLoading, isError } = useQuery({
    queryKey: ["admin-payment", id],
    queryFn: () => getAdminPayment(token, id),
    enabled: Boolean(token && id),
  });

  if (isLoading) {
    return <div className="space-y-4 p-8"><Skeleton className="h-40" /><Skeleton className="h-60" /></div>;
  }

  if (isError || !payment) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/50" />
        <p className="text-[14px] text-muted-foreground">Payment not found.</p>
        <Link href="/admin/dashboard/payments" className="text-[13px] text-foreground underline">Back to payments</Link>
      </div>
    );
  }

  const isSuccess = payment.status === "success";

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link href="/admin/dashboard/payments" className="flex items-center gap-1 transition-colors hover:text-foreground">
            <ArrowLeft className="size-3" /> Payments
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-mono text-[9px]">{payment.id}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">

        {/* Summary card */}
        <div className="border border-border bg-card overflow-hidden">
          <div className={`relative flex items-center justify-between overflow-hidden px-6 py-6 ${isSuccess ? "bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent" : "bg-gradient-to-br from-muted/40 to-transparent"}`}>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "14px 14px" }}
            />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{payment.provider}</p>
              <p className="mt-1 text-[32px] font-bold tabular-nums text-foreground">
                {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="ml-1 text-[16px] font-medium text-muted-foreground">{payment.currency.toUpperCase()}</span>
              </p>
            </div>
            <div className="relative">
              <StatusBadge status={payment.status} />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 border border-border bg-card sm:grid-cols-3">
          {[
            { icon: DollarSign, label: "Amount", value: `${payment.amount.toFixed(2)} ${payment.currency.toUpperCase()}`, color: "text-emerald-400" },
            { icon: CreditCard, label: "Provider", value: payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1), color: "text-sky-400" },
            { icon: Calendar, label: "Date", value: new Date(payment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), color: "text-violet-400" },
          ].map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label} className={`flex flex-col gap-1 p-5 ${i < arr.length - 1 ? "border-r border-border" : ""}`}>
              <Icon className={`size-4 ${color}`} />
              <p className="mt-1 text-[16px] font-semibold text-foreground">{value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Full details */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-foreground">Payment details</h2>
          </div>
          <div className="px-6">
            <DetailRow label="Payment ID">
              <span className="font-mono text-[11px] text-muted-foreground">{payment.id}</span>
            </DetailRow>
            <DetailRow label="User ID">
              <Link
                href={`/admin/dashboard/users/${payment.user_id}`}
                className="flex items-center gap-1 text-primary hover:underline font-mono text-[11px]"
              >
                <User className="size-3.5" />
                {payment.user_id}
              </Link>
            </DetailRow>
            <DetailRow label="Plan ID">
              <span className="font-mono text-[11px] text-muted-foreground">{payment.plan_id}</span>
            </DetailRow>
            <DetailRow label="Provider">{payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}</DetailRow>
            <DetailRow label="Status"><StatusBadge status={payment.status} /></DetailRow>
            <DetailRow label="Amount">
              {payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {payment.currency.toUpperCase()}
            </DetailRow>
            <DetailRow label="Date & time">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                {fmt(payment.created_at)}
              </div>
            </DetailRow>
          </div>
        </div>

      </div>
    </div>
  );
}
