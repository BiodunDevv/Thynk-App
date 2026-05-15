"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Zap, CheckCircle, XCircle, Users, ShieldCheck,
  CreditCard, UserX, ChevronRight, X, Mail, Calendar,
  BarChart2, BadgeCheck, Ban, RefreshCw,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUsers, grantCredits, type AdminUser } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ─────────────────────────────────────────────────────── */

function initials(user: AdminUser) {
  if (user.full_name) {
    return user.full_name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return user.email[0].toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-emerald-500/20 text-emerald-400",
  "bg-violet-500/20 text-violet-400",
  "bg-sky-500/20 text-sky-400",
  "bg-amber-500/20 text-amber-400",
];

function avatarColor(id: string) {
  const n = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[n];
}

function Avatar({ user }: { user: AdminUser }) {
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center font-mono text-[11px] font-semibold ${avatarColor(user.id)}`}
    >
      {initials(user)}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 ${
        active
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-muted text-muted-foreground/60"
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* ── stat card ───────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
        <div className={`flex size-7 items-center justify-center ${accent ?? "bg-primary/10"}`}>
          <Icon className={`size-3.5 ${accent ? "" : "text-primary"}`} />
        </div>
      </div>
      <div>
        <p className="text-[1.75rem] font-semibold leading-none tracking-tight text-foreground">{value}</p>
        {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

/* ── grant credits modal ─────────────────────────────────────────── */

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
  const [amount, setAmount] = React.useState("10");
  const [reason, setReason] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () => grantCredits(token, user.id, parseInt(amount), reason),
    onSuccess: () => {
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setTimeout(onClose, 1800);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Grant credits</p>
            <h3 className="mt-0.5 text-[15px] font-semibold text-foreground">
              {user.full_name ?? user.email.split("@")[0]}
            </h3>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-12 items-center justify-center bg-emerald-500/10">
                <CheckCircle className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">Credits granted</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{amount} credits added to {user.email}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* quick amounts */}
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  Quick amounts
                </label>
                <div className="flex gap-1.5">
                  {["5", "10", "25", "50", "100"].map((n) => (
                    <button
                      key={n}
                      onClick={() => setAmount(n)}
                      className={`flex-1 border py-1.5 font-mono text-[11px] transition-colors ${
                        amount === n
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  Custom amount
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2.5 text-[14px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                  Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Beta tester reward"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {mutation.isError && (
                <p className="border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  {(mutation.error as { message?: string })?.message ?? "Failed to grant credits."}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 border border-border bg-background px-4 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !reason.trim() || !amount || Number(amount) < 1}
                  className="flex-1 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {mutation.isPending ? "Granting…" : `Grant ${amount} credits`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── user detail drawer ──────────────────────────────────────────── */

function UserDrawer({ user, token, onClose }: { user: AdminUser; token: string; onClose: () => void }) {
  const [showGrant, setShowGrant] = React.useState(false);

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
        <div className="flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-6 py-5">
            <div className="flex items-center gap-3.5">
              <div className={`flex size-12 items-center justify-center text-[15px] font-bold ${avatarColor(user.id)}`}>
                {initials(user)}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">
                  {user.full_name ?? "—"}
                </p>
                <p className="text-[12px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
            {[
              { icon: BarChart2, label: "Generations", value: user.monthly_generation_count.toLocaleString() },
              { icon: ShieldCheck, label: "Role", value: user.role === "SUPER_ADMIN" ? "Admin" : "User" },
              { icon: BadgeCheck, label: "Verified", value: user.is_verified ? "Yes" : "No" },
              { icon: RefreshCw, label: "Status", value: user.is_active ? "Active" : "Inactive" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col gap-1 bg-card px-4 py-4">
                <Icon className="size-3.5 text-muted-foreground" />
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                <p className="text-[14px] font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="flex-1 space-y-4 px-6 py-5">
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Calendar className="size-3.5 shrink-0" />
              <span>Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            {user.current_plan_id && (
              <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                <CreditCard className="size-3.5 shrink-0" />
                <span>Plan ID: {user.current_plan_id.slice(-8)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-border p-5 space-y-2">
            <button
              onClick={() => setShowGrant(true)}
              className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Zap className="size-4" />
              Grant credits
            </button>
          </div>
        </div>
      </div>

      {showGrant && (
        <GrantCreditsModal user={user} token={token} onClose={() => setShowGrant(false)} />
      )}
    </>
  );
}

/* ── page ────────────────────────────────────────────────────────── */

type Filter = "all" | "active" | "inactive" | "verified" | "paying";

export default function AdminUsersPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [selected, setSelected] = React.useState<AdminUser | null>(null);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users", token],
    queryFn: () => getAdminUsers(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q);
    const matchFilter =
      filter === "all" ? true :
      filter === "active" ? u.is_active :
      filter === "inactive" ? !u.is_active :
      filter === "verified" ? u.is_verified :
      filter === "paying" ? Boolean(u.current_plan_id) : true;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    verified: users.filter((u) => u.is_verified).length,
    paying: users.filter((u) => u.current_plan_id).length,
  };

  return (
    <div className="px-6 py-6 lg:px-8">

      {/* Page header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Admin · Users</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">User management</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          View, filter, and manage all registered Thynk users.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.total} sub="All registered" />
        <StatCard icon={CheckCircle} label="Active" value={stats.active} sub={`${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% of total`} accent="bg-emerald-500/10" />
        <StatCard icon={BadgeCheck} label="Verified" value={stats.verified} sub="Email confirmed" accent="bg-sky-500/10" />
        <StatCard icon={CreditCard} label="Paying" value={stats.paying} sub="On a paid plan" accent="bg-violet-500/10" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          {(["all", "active", "inactive", "verified", "paying"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search + refresh */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 border border-border bg-card py-2 pl-9 pr-4 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="flex size-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        {search && ` matching "${search}"`}
      </p>

      {/* Table */}
      {isLoading && (
        <div className="border border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
              <Skeleton className="size-9" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-14" />
              <Skeleton className="size-4" />
              <Skeleton className="size-4" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 border border-destructive/30 bg-destructive/10 px-5 py-4">
          <UserX className="size-4 shrink-0 text-destructive" />
          <p className="text-[13px] text-destructive">Failed to load users. Check your connection.</p>
          <button onClick={() => refetch()} className="ml-auto font-mono text-[10px] uppercase tracking-wider text-destructive hover:opacity-70">
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="border border-border">
          {/* Header row */}
          <div className="grid grid-cols-[48px_1fr_1.2fr_90px_72px_72px_72px] items-center border-b border-border px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            <span />
            <span>Name</span>
            <span>Email</span>
            <span>Plan</span>
            <span className="text-center">Verified</span>
            <span className="text-center">Active</span>
            <span className="text-right">Usage</span>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="flex size-12 items-center justify-center bg-muted">
                <Users className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-[13px] text-muted-foreground">No users match your search.</p>
            </div>
          )}

          {filtered.map((user) => (
            <Link
              key={user.id}
              href={`/admin/dashboard/users/${user.id}`}
              className="grid w-full grid-cols-[48px_1fr_1.2fr_90px_72px_72px_72px] items-center border-b border-border px-5 py-3.5 text-left last:border-b-0 transition-colors hover:bg-muted/10"
            >
              <Avatar user={user} />

              <span className="truncate pr-4 text-[13px] font-medium text-foreground">
                {user.full_name ?? <span className="text-muted-foreground/50">—</span>}
              </span>

              <span className="truncate pr-4 text-[12px] text-muted-foreground">{user.email}</span>

              <span>
                {user.current_plan_id ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5">Pro</span>
                ) : (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 bg-muted px-1.5 py-0.5">Free</span>
                )}
              </span>

              <span className="flex justify-center">
                {user.is_verified
                  ? <CheckCircle className="size-4 text-emerald-500" />
                  : <XCircle className="size-4 text-muted-foreground/30" />}
              </span>

              <span className="flex justify-center">
                {user.is_active
                  ? <CheckCircle className="size-4 text-emerald-500" />
                  : <Ban className="size-4 text-muted-foreground/30" />}
              </span>

              <span className="flex items-center justify-end gap-2">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {user.monthly_generation_count.toLocaleString()}
                </span>
                <ChevronRight className="size-3.5 text-muted-foreground/30" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
