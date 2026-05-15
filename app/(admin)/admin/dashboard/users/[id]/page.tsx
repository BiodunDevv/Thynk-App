"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Mail, Calendar, BarChart2, ShieldCheck, Zap,
  CheckCircle, XCircle, Ban, BadgeCheck, CreditCard, RefreshCw,
  UserRound, ChevronRight,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminUser,
  toggleUserStatus,
  grantCredits,
  type AdminUser,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ─────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-emerald-500/20 text-emerald-400",
  "bg-violet-500/20 text-violet-400",
  "bg-sky-500/20 text-sky-400",
  "bg-amber-500/20 text-amber-400",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}
function initials(user: AdminUser) {
  if (user.full_name) return user.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return user.email[0].toUpperCase();
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/* ── Grant Credits Modal ─────────────────────────────────────────── */

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

function GrantCreditsModal({
  user,
  token,
  onClose,
}: {
  user: AdminUser;
  token: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState<number>(10);
  const [custom, setCustom] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [done, setDone] = React.useState(false);

  const finalAmount = custom ? parseInt(custom, 10) : amount;

  const mutation = useMutation({
    mutationFn: () => grantCredits(token, user.id, finalAmount, reason),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["admin-user", user.id] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Grant Credits</p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-foreground">{user.full_name ?? user.email}</h2>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle className="size-10 text-emerald-400" />
            <p className="text-[15px] font-medium text-foreground">
              {finalAmount} credits granted successfully.
            </p>
            <button onClick={onClose} className="mt-2 border border-border bg-card px-5 py-2 text-[13px] font-medium text-foreground hover:bg-muted">
              Close
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5 px-6 py-5"
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          >
            {/* Quick pick */}
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Amount</p>
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAmount(a); setCustom(""); }}
                    className={[
                      "flex-1 border py-2 font-mono text-[12px] transition-colors",
                      amount === a && !custom
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Custom amount…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Reason */}
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Reason</p>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Compensation for downtime…"
                className="w-full border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {mutation.isError && (
              <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                Failed to grant credits. Try again.
              </p>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !reason.trim() || isNaN(finalAmount) || finalAmount < 1}
                className="flex-1 bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? "Granting…" : `Grant ${finalAmount || "?"} credits`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const qc = useQueryClient();
  const [showGrant, setShowGrant] = React.useState(false);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => getAdminUser(token, id),
    enabled: Boolean(token && id),
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleUserStatus(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-user", id] }),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/50" />
        <p className="text-[14px] text-muted-foreground">User not found.</p>
        <Link href="/admin/dashboard/users" className="text-[13px] text-foreground underline">
          Back to users
        </Link>
      </div>
    );
  }

  const isActive = user.is_active;
  const isVerified = user.is_verified;
  const isPro = user.subscription_status === "active";

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link href="/admin/dashboard/users" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="size-3" />
            Users
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{user.full_name ?? user.email.split("@")[0]}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">

        {/* Profile header */}
        <div className="flex flex-col gap-5 border border-border bg-card sm:flex-row sm:items-center sm:justify-between p-6">
          <div className="flex items-center gap-4">
            <div className={`flex size-16 shrink-0 items-center justify-center text-xl font-bold ${avatarColor(user.id)}`}>
              {initials(user)}
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">{user.full_name ?? "—"}</h1>
              <p className="text-[13px] text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  <span className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  {isActive ? "Active" : "Inactive"}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-400">
                    <BadgeCheck className="size-2.5" /> Verified
                  </span>
                )}
                {isPro && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                    <Zap className="size-2.5" /> Pro
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowGrant(true)}
              className="flex items-center gap-1.5 border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <Zap className="size-3.5" />
              Grant credits
            </button>
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
                isActive
                  ? "border border-destructive/30 bg-destructive/10 text-destructive"
                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {isActive ? <Ban className="size-3.5" /> : <CheckCircle className="size-3.5" />}
              {toggleMutation.isPending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 border border-border bg-card sm:grid-cols-4">
          {[
            { icon: BarChart2, label: "Total prompts", value: user.prompt_generation_count ?? 0, color: "text-primary" },
            { icon: RefreshCw, label: "This month", value: user.monthly_generation_count ?? 0, color: "text-sky-400" },
            { icon: CreditCard, label: "Plan", value: isPro ? "Pro" : "Free", color: "text-amber-400" },
            { icon: ShieldCheck, label: "Role", value: user.role === "SUPER_ADMIN" ? "Admin" : "User", color: "text-violet-400" },
          ].map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label} className={`flex flex-col gap-1 p-5 ${i < arr.length - 1 ? "border-r border-border" : ""}`}>
              <Icon className={`size-4 ${color}`} />
              <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-foreground">Account details</h2>
          </div>
          <div className="px-6">
            <DetailRow label="User ID">
              <span className="font-mono text-[11px] text-muted-foreground">{user.id}</span>
            </DetailRow>
            <DetailRow label="Email">
              <a href={`mailto:${user.email}`} className="flex items-center gap-1 text-primary hover:underline">
                <Mail className="size-3.5" />
                {user.email}
              </a>
            </DetailRow>
            <DetailRow label="Joined">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                {fmt(user.created_at)}
              </div>
            </DetailRow>
            <DetailRow label="Email verified">
              {isVerified
                ? <span className="flex items-center gap-1 text-emerald-400"><BadgeCheck className="size-3.5" /> Yes</span>
                : <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="size-3.5" /> No</span>}
            </DetailRow>
            <DetailRow label="Account status">
              {isActive
                ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="size-3.5" /> Active</span>
                : <span className="flex items-center gap-1 text-destructive"><Ban className="size-3.5" /> Inactive</span>}
            </DetailRow>
            <DetailRow label="Subscription">
              <span className={isPro ? "text-primary" : "text-muted-foreground"}>
                {user.subscription_status ? user.subscription_status.replace("_", " ") : "Free"}
              </span>
            </DetailRow>
            <DetailRow label="Plan ID">
              <span className="font-mono text-[11px] text-muted-foreground">{user.current_plan_id ?? "—"}</span>
            </DetailRow>
          </div>
        </div>

      </div>

      {showGrant && user && (
        <GrantCreditsModal user={user} token={token} onClose={() => setShowGrant(false)} />
      )}
    </div>
  );
}
