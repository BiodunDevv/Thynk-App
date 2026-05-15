"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Tag, Search, X, RefreshCw, Copy, Check,
  Percent, DollarSign, Calendar, Users, ToggleLeft,
  ToggleRight, Sparkles, AlertCircle, ChevronRight,
  Infinity, Clock,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminCoupons, createCoupon, type AdminCoupon } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ─────────────────────────────────────────────────────── */

function usagePct(coupon: AdminCoupon) {
  if (!coupon.max_redemptions) return null;
  return Math.min((coupon.redeemed_count / coupon.max_redemptions) * 100, 100);
}

function isExpired(coupon: AdminCoupon) {
  if (!coupon.valid_until) return false;
  return new Date(coupon.valid_until) < new Date();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="flex size-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      title="Copy code"
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/* ── coupon card ─────────────────────────────────────────────────── */

function CouponCard({
  coupon,
  onClick,
}: {
  coupon: AdminCoupon;
  onClick: () => void;
}) {
  const pct = usagePct(coupon);
  const expired = isExpired(coupon);
  const inactive = !coupon.is_active || expired;
  const DiscountIcon = coupon.discount_type === "percentage" ? Percent : DollarSign;

  return (
    <button
      onClick={onClick}
      className={`group flex flex-col border bg-card text-left transition-all duration-150 hover:shadow-md ${
        inactive
          ? "border-border opacity-60 hover:opacity-80"
          : "border-border hover:border-primary/40"
      }`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex size-9 items-center justify-center ${inactive ? "bg-muted" : "bg-primary/10"}`}>
            <DiscountIcon className={`size-4 ${inactive ? "text-muted-foreground" : "text-primary"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] font-bold tracking-wider text-foreground">
                {coupon.code}
              </span>
              <CopyButton text={coupon.code} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {coupon.discount_type === "percentage"
                ? `${coupon.discount_value}% off`
                : `₦${coupon.discount_value.toLocaleString()} off`}
              {coupon.minimum_amount > 0 && ` · min ₦${coupon.minimum_amount.toLocaleString()}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`font-mono text-[8px] uppercase tracking-wider px-2 py-0.5 ${
              expired
                ? "bg-destructive/10 text-destructive"
                : coupon.is_active
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-muted text-muted-foreground/60"
            }`}
          >
            {expired ? "Expired" : coupon.is_active ? "Active" : "Inactive"}
          </span>
          <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
        </div>
      </div>

      {/* Usage bar */}
      <div className="px-4 py-3.5">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="size-3" />
            {coupon.redeemed_count.toLocaleString()} used
          </span>
          <span className="text-muted-foreground">
            {coupon.max_redemptions
              ? `${coupon.max_redemptions.toLocaleString()} max`
              : <span className="flex items-center gap-1"><Infinity className="size-3" /> Unlimited</span>}
          </span>
        </div>
        {pct !== null ? (
          <div className="h-1 w-full overflow-hidden bg-muted">
            <div
              className={`h-full transition-all duration-500 ${
                pct >= 100
                  ? "bg-destructive"
                  : pct >= 80
                  ? "bg-orange-400"
                  : "bg-primary"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : (
          <div className="h-1 w-full bg-muted">
            <div
              className="h-full bg-primary/40"
              style={{ width: `${Math.min(coupon.redeemed_count * 2, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        {coupon.valid_until ? (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="size-3" />
            Expires {new Date(coupon.valid_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="size-3" />
            No expiry
          </span>
        )}
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
          {coupon.discount_type}
        </span>
      </div>
    </button>
  );
}

/* ── coupon detail drawer ────────────────────────────────────────── */

function CouponDrawer({ coupon, onClose }: { coupon: AdminCoupon; onClose: () => void }) {
  const pct = usagePct(coupon);
  const expired = isExpired(coupon);
  const DiscountIcon = coupon.discount_type === "percentage" ? Percent : DollarSign;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center bg-primary/10">
              <DiscountIcon className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-[16px] font-bold tracking-wider text-foreground">{coupon.code}</p>
                <CopyButton text={coupon.code} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {coupon.discount_type === "percentage" ? `${coupon.discount_value}% discount` : `₦${coupon.discount_value.toLocaleString()} off`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Status */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider px-2.5 py-1 ${
              expired ? "bg-destructive/10 text-destructive" : coupon.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
            }`}>
              <span className={`size-1.5 rounded-full ${expired ? "bg-destructive" : coupon.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              {expired ? "Expired" : coupon.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {coupon.description && (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{coupon.description}</p>
          )}
        </div>

        {/* Usage */}
        <div className="border-b border-border px-6 py-4">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Usage</p>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[24px] font-semibold text-foreground">{coupon.redeemed_count.toLocaleString()}</span>
            <span className="text-[13px] text-muted-foreground">
              {coupon.max_redemptions ? `/ ${coupon.max_redemptions.toLocaleString()}` : "/ ∞"}
            </span>
          </div>
          {pct !== null ? (
            <>
              <div className="h-1.5 w-full overflow-hidden bg-muted">
                <div
                  className={`h-full transition-all duration-500 ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-orange-400" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{Math.round(pct)}% of max redemptions used</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">Unlimited redemptions</p>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 space-y-3 px-6 py-4">
          {[
            { label: "Discount type", value: coupon.discount_type === "percentage" ? "Percentage" : "Fixed amount" },
            { label: "Discount value", value: coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₦${coupon.discount_value.toLocaleString()}` },
            { label: "Per user limit", value: `${coupon.per_user_limit} use${coupon.per_user_limit !== 1 ? "s" : ""} per user` },
            { label: "Minimum amount", value: coupon.minimum_amount > 0 ? `₦${coupon.minimum_amount.toLocaleString()}` : "None" },
            { label: "Valid from", value: coupon.valid_from ? new Date(coupon.valid_from).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Immediately" },
            { label: "Expires", value: coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Never" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
              <span className="text-[12px] font-medium text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── create modal ────────────────────────────────────────────────── */

function CreateCouponModal({ token, onClose }: { token: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({
    code: "",
    description: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 20,
    max_redemptions: "",
    per_user_limit: 1,
    minimum_amount: 0,
    valid_from: "",
    valid_until: "",
    is_active: true,
    applicable_plan_ids: [] as string[],
    currency: "NGN",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createCoupon(token, {
        code: form.code.toUpperCase().trim(),
        description: form.description || undefined,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        currency: form.currency || undefined,
        max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : undefined,
        per_user_limit: Number(form.per_user_limit),
        minimum_amount: Number(form.minimum_amount),
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : undefined,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : undefined,
        applicable_plan_ids: form.applicable_plan_ids,
        is_active: form.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      onClose();
    },
  });

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground/50">{hint}</span>}
      </div>
      {children}
    </div>
  );

  const inputCls = "w-full border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary";

  function suggestCode() {
    const words = ["SAVE", "THYNK", "LAUNCH", "PROMO", "BETA", "FIRST", "DEAL"];
    const word = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(Math.random() * 90) + 10;
    setForm((f) => ({ ...f, code: `${word}${num}` }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Admin action</p>
            <h3 className="mt-0.5 text-[15px] font-semibold text-foreground">Create discount coupon</h3>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-4">

          {/* Code */}
          <Field label="Coupon code">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                  placeholder="SAVE20"
                  className={`${inputCls} pl-9 font-mono text-[13px] uppercase tracking-wider`}
                />
              </div>
              <button
                onClick={suggestCode}
                className="flex items-center gap-1.5 border border-border bg-background px-3 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground whitespace-nowrap"
              >
                <Sparkles className="size-3.5" />
                Generate
              </button>
            </div>
          </Field>

          <Field label="Description" hint="Optional">
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Welcome discount for new users"
              className={inputCls}
            />
          </Field>

          {/* Discount type toggle */}
          <Field label="Discount type">
            <div className="flex border border-border">
              {(["percentage", "fixed"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, discount_type: t }))}
                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-[12px] font-medium transition-colors ${
                    form.discount_type === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "percentage" ? <Percent className="size-3.5" /> : <DollarSign className="size-3.5" />}
                  {t === "percentage" ? "Percentage" : "Fixed (₦)"}
                </button>
              ))}
            </div>
          </Field>

          {/* Discount value + quick picks */}
          <Field label={form.discount_type === "percentage" ? "Discount %" : "Discount amount (₦)"}>
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {(form.discount_type === "percentage"
                  ? [10, 15, 20, 25, 50]
                  : [500, 1000, 2000, 5000]
                ).map((v) => (
                  <button
                    key={v}
                    onClick={() => setForm((f) => ({ ...f, discount_value: v }))}
                    className={`flex-1 border py-1.5 font-mono text-[11px] transition-colors ${
                      form.discount_value === v
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {form.discount_type === "percentage" ? `${v}%` : `₦${v.toLocaleString()}`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                value={form.discount_value}
                onChange={(e) => setForm((f) => ({ ...f, discount_value: Number(e.target.value) }))}
                className={inputCls}
              />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Max redemptions" hint="Blank = unlimited">
              <input
                type="number"
                min="1"
                value={form.max_redemptions}
                onChange={(e) => setForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                placeholder="∞"
                className={inputCls}
              />
            </Field>
            <Field label="Per-user limit">
              <input
                type="number"
                min="1"
                value={form.per_user_limit}
                onChange={(e) => setForm((f) => ({ ...f, per_user_limit: Number(e.target.value) }))}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Minimum order amount (₦)" hint="0 = no minimum">
            <input
              type="number"
              min="0"
              value={form.minimum_amount}
              onChange={(e) => setForm((f) => ({ ...f, minimum_amount: Number(e.target.value) }))}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valid from" hint="Optional">
              <input type="date" value={form.valid_from}
                onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                className={inputCls} />
            </Field>
            <Field label="Expires on" hint="Optional">
              <input type="date" value={form.valid_until}
                onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                className={inputCls} />
            </Field>
          </div>

          {/* Active toggle */}
          <button
            onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
            className="flex w-full items-center justify-between border border-border bg-background px-4 py-3 hover:bg-muted/20"
          >
            <div className="flex items-center gap-3">
              {form.is_active
                ? <ToggleRight className="size-5 text-emerald-500" />
                : <ToggleLeft className="size-5 text-muted-foreground" />}
              <div className="text-left">
                <p className="text-[13px] font-medium text-foreground">Activate immediately</p>
                <p className="text-[11px] text-muted-foreground">Coupon will be usable as soon as it&apos;s created</p>
              </div>
            </div>
            <span className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 ${form.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              {form.is_active ? "On" : "Off"}
            </span>
          </button>

          {mutation.isError && (
            <div className="flex items-center gap-2.5 border border-destructive/20 bg-destructive/10 px-3.5 py-3">
              <AlertCircle className="size-4 shrink-0 text-destructive" />
              <p className="text-[12px] text-destructive">
                {(mutation.error as { message?: string })?.message ?? "Failed to create coupon."}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 border border-border bg-background px-4 py-2.5 text-[13px] text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.code.trim()}
            className="flex flex-1 items-center justify-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {mutation.isPending ? (
              "Creating…"
            ) : (
              <>
                <Tag className="size-4" />
                Create coupon
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────── */

type StatusFilter = "all" | "active" | "inactive" | "expired";

export default function AdminCouponsPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [selected, setSelected] = React.useState<AdminCoupon | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const { data: coupons = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-coupons", token],
    queryFn: () => getAdminCoupons(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const filtered = coupons.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || c.code.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    const expired = isExpired(c);
    const matchStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? c.is_active && !expired :
      statusFilter === "inactive" ? !c.is_active :
      statusFilter === "expired" ? expired : true;
    return matchSearch && matchStatus;
  });

  const activeCount = coupons.filter((c) => c.is_active && !isExpired(c)).length;
  const totalRedemptions = coupons.reduce((s, c) => s + c.redeemed_count, 0);

  return (
    <div className="px-6 py-6 lg:px-8">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Admin · Coupons</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Discount coupons</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {coupons.length} coupon{coupons.length !== 1 ? "s" : ""} · {activeCount} active · {totalRedemptions.toLocaleString()} total redemptions
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex shrink-0 items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          New coupon
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {(["all", "active", "inactive", "expired"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                statusFilter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search code or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 border border-border bg-card py-2 pl-9 pr-4 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex size-9 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {filtered.length} coupon{filtered.length !== 1 ? "s" : ""}
      </p>

      {isLoading && (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 border border-destructive/30 bg-destructive/10 px-5 py-4">
          <AlertCircle className="size-4 text-destructive" />
          <p className="text-[13px] text-destructive">Failed to load coupons.</p>
          <button onClick={() => refetch()} className="ml-auto font-mono text-[10px] uppercase tracking-wider text-destructive hover:opacity-70">Retry</button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 border border-border bg-card py-16 text-center">
          <div className="flex size-14 items-center justify-center bg-muted">
            <Tag className="size-6 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-foreground">No coupons found</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {search ? `No results for "${search}"` : "Create your first coupon above."}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CouponCard key={c.id} coupon={c} onClick={() => router.push(`/admin/dashboard/coupons/${c.id}`)} />
          ))}
        </div>
      )}

      {showCreate && <CreateCouponModal token={token} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
