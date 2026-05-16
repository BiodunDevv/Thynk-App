"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Search, CheckCircle, XCircle, Users,
  CreditCard, UserX, ChevronRight, BadgeCheck, Ban, RefreshCw,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUsers, type AdminUser } from "@/lib/api/admin";
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

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
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

/* ── page ────────────────────────────────────────────────────────── */

type Filter = "all" | "active" | "inactive" | "verified" | "paying";

export default function AdminUsersPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

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
          <div className="grid grid-cols-[48px_1fr_1.2fr_90px_80px_72px_72px_72px] items-center border-b border-border px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            <span />
            <span>Name</span>
            <span>Email</span>
            <span>Plan</span>
            <span className="text-right">Credits</span>
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
              className="grid w-full grid-cols-[48px_1fr_1.2fr_90px_80px_72px_72px_72px] items-center border-b border-border px-5 py-3.5 text-left last:border-b-0 transition-colors hover:bg-muted/10"
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

              <span className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {safeNumber(user.credits_remaining).toLocaleString()}
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
                  {safeNumber(user.monthly_generation_count).toLocaleString()}
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
