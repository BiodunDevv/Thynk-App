"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Layers,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminPayment, getAdminUser } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

function fmt(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShort(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
) {
  const sym = (currency ?? "").toUpperCase() === "NGN" ? "₦" : "$";
  if (!Number.isFinite(amount)) return `${sym}—`;
  return `${sym}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

function cap(s: string | null | undefined) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "pending";
  const cfg: Record<
    string,
    { icon: React.ElementType; color: string; label: string }
  > = {
    success: {
      icon: CheckCircle,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      label: "Success",
    },
    pending: {
      icon: Clock,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      label: "Pending",
    },
    failed: {
      icon: XCircle,
      color: "bg-destructive/10 text-destructive border-destructive/20",
      label: "Failed",
    },
    cancelled: {
      icon: XCircle,
      color: "bg-muted text-muted-foreground border-border",
      label: "Cancelled",
    },
  };
  const c = cfg[s] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${c.color}`}
    >
      <Icon className="size-3" />
      {c.label}
    </span>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-3.5 last:border-b-0">
      <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground pt-0.5">
        {label}
      </span>
      <div className="text-right text-[13px] text-foreground break-all">
        {children}
      </div>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";

  const {
    data: payment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-payment", id],
    queryFn: () => getAdminPayment(token, id),
    enabled: Boolean(token && id),
  });

  const needsUserFallback = Boolean(
    payment?.user_id && !payment?.user_name && !payment?.user_email,
  );
  const { data: paymentUser } = useQuery({
    queryKey: ["admin-payment-user", payment?.user_id],
    queryFn: () => getAdminUser(token, payment!.user_id!),
    enabled: Boolean(token && needsUserFallback && payment?.user_id),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-5 p-6 lg:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/40" />
        <p className="text-[14px] font-medium text-foreground">
          Payment not found
        </p>
        <p className="text-[12px] text-muted-foreground">
          This payment record doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/admin/dashboard/payments"
          className="mt-2 flex items-center gap-1.5 border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-3" /> Back to payments
        </Link>
      </div>
    );
  }

  const isSuccess = payment.status === "success";
  const isPending = payment.status === "pending" || !payment.status;
  const resolvedUserLabel =
    payment.user_name ||
    payment.user_email ||
    paymentUser?.full_name ||
    paymentUser?.email ||
    payment.user_id ||
    "Unknown customer";

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link
            href="/admin/dashboard/payments"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Payments
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/30" />
          <span className="max-w-[240px] truncate text-foreground">
            {payment.plan_snapshot?.name ??
              payment.plan_name ??
              payment.provider_reference ??
              payment.id}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* Hero card */}
        <div
          className={[
            "relative overflow-hidden border bg-card",
            isSuccess
              ? "border-emerald-500/20"
              : isPending
                ? "border-amber-500/20"
                : "border-border",
          ].join(" ")}
        >
          {/* Background texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div
            className={[
              "relative flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between",
              isSuccess
                ? "bg-emerald-500/[0.06]"
                : isPending
                  ? "bg-amber-500/[0.04]"
                  : "bg-muted/20",
            ].join(" ")}
          >
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                {cap(payment.provider)} payment
              </p>
              <p className="mt-1.5 text-[2.5rem] font-bold leading-none tabular-nums text-foreground">
                {fmtAmount(payment.amount, payment.currency)}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
                {fmtShort(payment.created_at)}
              </p>
            </div>
            <StatusBadge status={payment.status} />
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {[
            {
              icon: CreditCard,
              label: "Provider",
              value: cap(payment.provider),
              color: "text-sky-400",
            },
            {
              icon: Layers,
              label: "Amount",
              value: fmtAmount(payment.amount, payment.currency),
              color: "text-emerald-400",
            },
            {
              icon: CheckCircle,
              label: "Status",
              value: cap(payment.status),
              color: isSuccess
                ? "text-emerald-400"
                : isPending
                  ? "text-amber-400"
                  : "text-destructive",
            },
            {
              icon: Calendar,
              label: "Date",
              value: fmtShort(payment.created_at),
              color: "text-violet-400",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex flex-col gap-1 bg-card px-4 py-4">
              <Icon className={`size-3.5 ${color}`} />
              <p className="mt-1 text-[14px] font-semibold text-foreground leading-tight">
                {value}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Full detail table */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Payment record
            </p>
            <h2 className="mt-0.5 text-[14px] font-semibold text-foreground">
              Full details
            </h2>
          </div>
          <div className="px-6">
            <DetailRow label="Payment ID">
              <span className="font-mono text-[11px] text-muted-foreground">
                {payment.id}
              </span>
            </DetailRow>

            {payment.provider_reference && (
              <DetailRow label="Reference">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {payment.provider_reference}
                </span>
              </DetailRow>
            )}

            <DetailRow label="User">
              {payment.user_id ? (
                <Link
                  href={`/admin/dashboard/users/${payment.user_id}`}
                  className="flex items-center justify-end gap-1.5 text-primary hover:underline"
                >
                  <User className="size-3.5" />
                  <div className="text-right">
                    <p className="text-[12px] font-medium">
                      {resolvedUserLabel}
                    </p>
                  </div>
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>

            <DetailRow label="Plan">
              {payment.plan_snapshot?.name ? (
                <div className="space-y-0.5 text-right">
                  <p className="text-[13px] font-medium text-foreground">
                    {payment.plan_snapshot.name}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {payment.plan_snapshot.billing_interval ?? "billing"}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </DetailRow>

            <DetailRow label="Provider">
              <span className="font-mono text-[12px]">
                {cap(payment.provider)}
              </span>
            </DetailRow>

            <DetailRow label="Amount">
              <span className="font-mono text-[13px] font-semibold">
                {fmtAmount(payment.amount, payment.currency)}
              </span>
            </DetailRow>

            <DetailRow label="Currency">
              <span className="font-mono text-[12px]">
                {(payment.currency ?? "—").toUpperCase()}
              </span>
            </DetailRow>

            <DetailRow label="Status">
              <StatusBadge status={payment.status} />
            </DetailRow>

            <DetailRow label="Created">
              <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5" />
                <span className="text-[12px]">{fmt(payment.created_at)}</span>
              </div>
            </DetailRow>

            {payment.updated_at && (
              <DetailRow label="Updated">
                <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span className="text-[12px]">{fmt(payment.updated_at)}</span>
                </div>
              </DetailRow>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {payment.user_id && (
            <Link
              href={`/admin/dashboard/users/${payment.user_id}`}
              className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="size-3.5" />
              View user
            </Link>
          )}
          <Link
            href="/admin/dashboard/payments"
            className="flex items-center gap-2 border border-border bg-card px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All payments
          </Link>
        </div>
      </div>
    </div>
  );
}
