"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronRight, Tag, Calendar, Users, Percent,
  DollarSign, ToggleLeft, ToggleRight, Trash2, Copy, Check, XCircle,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminCoupon, toggleCoupon, deleteCoupon, type AdminCoupon,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ─────────────────────────────────────────────────────── */

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function isExpired(coupon: AdminCoupon) {
  if (!coupon.valid_until) return false;
  return new Date(coupon.valid_until) < new Date();
}

function usagePercent(coupon: AdminCoupon) {
  if (!coupon.max_redemptions) return 0;
  return Math.min((coupon.redeemed_count / coupon.max_redemptions) * 100, 100);
}

/* ── Copy button ─────────────────────────────────────────────────── */

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ── Detail row ──────────────────────────────────────────────────── */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <div className="text-right text-[13px] text-foreground">{children}</div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function AdminCouponDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { data: coupon, isLoading, isError } = useQuery({
    queryKey: ["admin-coupon", id],
    queryFn: () => getAdminCoupon(token, id),
    enabled: Boolean(token && id),
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleCoupon(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupon", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCoupon(token, id),
    onSuccess: () => router.push("/admin/dashboard/coupons"),
  });

  if (isLoading) {
    return <div className="space-y-4 p-8"><Skeleton className="h-40" /><Skeleton className="h-8 w-48" /><Skeleton className="h-60" /></div>;
  }

  if (isError || !coupon) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/50" />
        <p className="text-[14px] text-muted-foreground">Coupon not found.</p>
        <Link href="/admin/dashboard/coupons" className="text-[13px] text-foreground underline">Back to coupons</Link>
      </div>
    );
  }

  const expired = isExpired(coupon);
  const pct = usagePercent(coupon);
  const isPercentage = coupon.discount_type === "percentage";

  const statusLabel = expired ? "Expired" : coupon.is_active ? "Active" : "Inactive";
  const statusColor = expired
    ? "bg-destructive/10 text-destructive"
    : coupon.is_active
    ? "bg-emerald-500/10 text-emerald-400"
    : "bg-muted text-muted-foreground";

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link href="/admin/dashboard/coupons" className="flex items-center gap-1 transition-colors hover:text-foreground">
            <ArrowLeft className="size-3" /> Coupons
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-mono tracking-widest">{coupon.code}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">

        {/* Header card */}
        <div className="border border-border bg-card">
          {/* Gradient band */}
          <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 py-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "14px 14px" }}
            />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[26px] font-bold tracking-[0.15em] text-foreground">
                  {coupon.code}
                </span>
                <CopyButton value={coupon.code} />
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{coupon.description ?? "No description"}</p>
            </div>
            <div className="relative flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 border border-primary/20 bg-primary/10 px-3 py-1.5">
                {isPercentage
                  ? <Percent className="size-4 text-primary" />
                  : <DollarSign className="size-4 text-primary" />}
                <span className="font-mono text-[20px] font-bold text-primary">
                  {isPercentage ? `${coupon.discount_value}%` : `${coupon.discount_value}`}
                </span>
              </div>
              <span className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Usage bar */}
          {coupon.max_redemptions && (
            <div className="border-t border-border px-6 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Usage</span>
                <span className="font-mono text-[12px] text-foreground">
                  {coupon.redeemed_count}
                  <span className="text-muted-foreground">/{coupon.max_redemptions}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden bg-muted">
                <div
                  className={`h-full transition-all duration-700 ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-orange-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                {Math.round(pct)}% used · {(coupon.max_redemptions - coupon.redeemed_count)} remaining
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending || expired}
            className={`flex items-center gap-1.5 border px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40 ${
              coupon.is_active
                ? "border-border bg-card text-muted-foreground hover:text-foreground"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {coupon.is_active ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
            {toggleMutation.isPending ? "Saving…" : coupon.is_active ? "Deactivate" : "Activate"}
          </button>

          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 border border-destructive/30 bg-destructive/10 px-4 py-2 text-[12px] font-medium text-destructive transition-opacity hover:opacity-80"
          >
            <Trash2 className="size-3.5" />
            Delete coupon
          </button>
        </div>

        {/* Details */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-foreground">Coupon details</h2>
          </div>
          <div className="px-6">
            <DetailRow label="Coupon ID">
              <span className="font-mono text-[11px] text-muted-foreground">{coupon.id}</span>
            </DetailRow>
            <DetailRow label="Discount type">
              <span className="flex items-center gap-1">
                {isPercentage ? <Percent className="size-3.5 text-muted-foreground" /> : <DollarSign className="size-3.5 text-muted-foreground" />}
                {isPercentage ? `${coupon.discount_value}% off` : `${coupon.discount_value} ${coupon.currency ?? "USD"} off`}
              </span>
            </DetailRow>
            <DetailRow label="Max redemptions">
              <span className="flex items-center gap-1">
                <Users className="size-3.5 text-muted-foreground" />
                {coupon.max_redemptions ?? "Unlimited"}
              </span>
            </DetailRow>
            <DetailRow label="Per-user limit">{coupon.per_user_limit} use{coupon.per_user_limit !== 1 ? "s" : ""} per user</DetailRow>
            <DetailRow label="Times redeemed">{coupon.redeemed_count}</DetailRow>
            <DetailRow label="Minimum amount">
              {coupon.minimum_amount > 0 ? `${coupon.minimum_amount} ${coupon.currency ?? "USD"}` : "None"}
            </DetailRow>
            <DetailRow label="Valid from">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5 text-muted-foreground" />
                {fmtDate(coupon.valid_from)}
              </span>
            </DetailRow>
            <DetailRow label="Valid until">
              <span className={`flex items-center gap-1 ${expired ? "text-destructive" : ""}`}>
                <Calendar className="size-3.5 text-muted-foreground" />
                {fmtDate(coupon.valid_until)}
                {expired && " (expired)"}
              </span>
            </DetailRow>
            <DetailRow label="Applicable plans">
              {coupon.applicable_plan_ids.length > 0 ? coupon.applicable_plan_ids.join(", ") : "All plans"}
            </DetailRow>
          </div>
        </div>

      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-foreground">Delete coupon?</h3>
            <p className="mt-2 text-[13px] text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{coupon.code}</span> will be permanently removed.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-destructive py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
