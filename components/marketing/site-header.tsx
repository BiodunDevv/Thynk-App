"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  UserRound,
  Zap,
  ArrowUpRight,
  LogOut,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  SunMedium,
  MoonStar,
  Monitor,
  ChevronRight,
  Heart,
} from "lucide-react";
import { useTheme } from "next-themes";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { ThynkLogo } from "@/components/brand/thynk-logo";
import { SavedPromptsPanel } from "@/components/workspace/saved-prompts-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthSession, clearStoredSession } from "@/lib/auth/session";
import { useAdminSession, clearAdminSession } from "@/lib/auth/admin-session";
import { signedInNavigation, siteNavigation } from "@/lib/constants/navigation";
import { getCurrentUser } from "@/lib/api/users";
import { getPlans } from "@/lib/api/plans";

/* ── Theme toggle (inline, no extra wrapper) ──────────────────────── */

function InlineThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const THEMES = [
    { value: "light", icon: SunMedium, label: "Light" },
    { value: "dark", icon: MoonStar, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ] as const;

  const active = mounted ? (theme ?? "system") : "system";
  const ActiveIcon = THEMES.find((t) => t.value === active)?.icon ?? Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Toggle theme"
          className="flex h-full items-center gap-1.5 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
        >
          <ActiveIcon className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36 border-border p-1">
        {THEMES.map(({ value, icon: Icon, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={[
              "flex items-center gap-2.5 px-3 py-2 text-[12px] cursor-pointer",
              active === value ? "text-foreground font-medium" : "text-muted-foreground",
            ].join(" ")}
          >
            <Icon className="size-3.5" />
            {label}
            {active === value && <ChevronRight className="ml-auto size-3 opacity-50" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Usage pill ───────────────────────────────────────────────────── */

function UsagePill({
  used,
  limit,
  planSlug,
}: {
  used: number;
  limit: number;
  planSlug: string;
}) {
  const isFree = planSlug === "free";
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  const isNear = pct >= 80;
  const isOut  = pct >= 100;

  /* SVG arc */
  const r = 8;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const accentClass = isOut ? "stroke-destructive" : isNear ? "stroke-orange-500" : "stroke-primary";
  const textClass   = isOut ? "text-destructive"   : isNear ? "text-orange-500"   : "text-foreground";
  const borderClass = isOut
    ? "border-destructive/30 hover:border-destructive/60"
    : isNear
    ? "border-orange-500/30 hover:border-orange-500/60"
    : "border-border hover:border-ring";

  return (
    <Link
      href="/pricing"
      className={[
        "group flex h-10 items-center gap-2.5 border bg-card px-3 shadow-sm transition-colors",
        borderClass,
      ].join(" ")}
      title={`${remaining} of ${limit} generations remaining`}
    >
      {/* Arc dial */}
      <span className="relative shrink-0">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="-rotate-90">
          <circle cx="10" cy="10" r={r} strokeWidth="2.2" className="stroke-muted" />
          <circle
            cx="10" cy="10" r={r}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            className={accentClass}
            style={{ transition: "stroke-dasharray 0.5s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <Zap className={["absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2", isOut ? "text-destructive" : isNear ? "text-orange-500" : "text-primary"].join(" ")} />
      </span>

      {/* Numbers */}
      <span className="flex flex-col leading-none">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {isFree ? "Free" : "Pro"}&nbsp;·&nbsp;gen
        </span>
        <span className={["font-mono text-[11px] font-semibold tabular-nums", textClass].join(" ")}>
          {remaining}
          <span className="font-normal text-muted-foreground/50">/{limit}</span>
        </span>
      </span>

      {/* Upgrade arrow — free only */}
      {isFree && (
        <ArrowUpRight className={["size-3 transition-colors", isOut || isNear ? "text-primary" : "text-muted-foreground/40 group-hover:text-primary"].join(" ")} />
      )}
    </Link>
  );
}

/* ── Admin indicator ──────────────────────────────────────────────── */

function AdminIndicator({ name }: { name: string }) {
  const router = useRouter();

  function handleSignOut() {
    clearAdminSession();
    router.push("/admin/sign-in");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-full items-center gap-2.5 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-primary" />
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-primary sm:block">
              Admin
            </span>
          </span>
          <span className="hidden max-w-27.5 truncate text-[13px] text-foreground sm:block">
            {name}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 border-border p-0">
        {/* Identity */}
        <div className="border-b border-border px-4 py-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <ShieldCheck className="size-3 text-primary" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
              Super Admin
            </span>
          </div>
          <p className="text-[13px] font-medium text-foreground">{name}</p>
        </div>

        {/* Actions */}
        <div className="py-1">
          <DropdownMenuItem asChild>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2.5 px-4 py-2 text-[13px]"
            >
              <LayoutDashboard className="size-3.5 text-muted-foreground" />
              Admin dashboard
              <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-border" />

        <div className="py-1">
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-destructive focus:text-destructive"
          >
            <LogOut className="size-3.5" />
            Sign out of admin
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Main header ──────────────────────────────────────────────────── */

export function SiteHeader() {
  const session = useAuthSession();
  const adminSession = useAdminSession();
  const { openAuthModal } = useAuthModal();
  const router = useRouter();
  const [savedOpen, setSavedOpen] = React.useState(false);
  const navigation = session ? signedInNavigation : siteNavigation;

  const accessToken = session?.tokens.access_token ?? "";

  const userQuery = useQuery({
    queryKey: ["user-me", accessToken],
    queryFn: () => getCurrentUser(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });

  const user = userQuery.data;
  const sessionPlanId = session?.plan?.plan_id ?? null;
  const plan = plansQuery.data?.find((p) => p.id === user?.current_plan_id)
    ?? plansQuery.data?.find((p) => p.id === sessionPlanId)
    ?? plansQuery.data?.find((p) => p.slug === "free");

  const used = user?.monthly_generation_count ?? 0;
  const limit = plan?.generation_limit ?? 5;
  const planSlug = plan?.slug ?? "free";

  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  function handleSignOut() {
    clearStoredSession();
    router.push("/");
  }

  // Admin name for display
  const adminName =
    adminSession?.user?.full_name ??
    adminSession?.user?.email?.split("@")[0] ??
    "Admin";

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">

        {/* Logo */}
        <Link href="/" className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex h-10 items-center border border-border bg-card px-3.5 shadow-sm">
            <ThynkLogo size="sm" />
          </div>
        </Link>

        {/* Nav pill (desktop) */}
        <nav className="hidden md:block">
          <div className="flex border border-border bg-card shadow-sm">
            {navigation.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex h-10 items-center px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  i < navigation.length - 1 ? "border-r border-border" : "",
                ].join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-2">

          {/* Usage pill — always visible for authenticated users */}
          {session && !adminSession && user && plan && (
            <UsagePill used={used} limit={limit} planSlug={planSlug} />
          )}

          {/* Actions pill */}
          <div className="flex h-10 shrink-0 items-stretch border border-border bg-card shadow-sm">

            {/* Theme toggle */}
            <div className="border-r border-border">
              <InlineThemeToggle />
            </div>

            {/* ── Saved prompts button — signed-in users only ── */}
            {session && !adminSession && (
              <button
                onClick={() => setSavedOpen(true)}
                title="Saved prompts"
                className="flex h-full items-center gap-1.5 border-r border-border px-3.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Heart className="size-3.5" />
                <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] sm:inline">Saved</span>
              </button>
            )}

            {/* ── Admin logged in ── */}
            {adminSession ? (
              <AdminIndicator name={adminName} />
            ) : session ? (
              /* ── User logged in ── */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none">
                    <UserRound className="size-4 shrink-0" />
                    <span className="hidden sm:inline max-w-30 truncate">
                      {session.user.email.split("@")[0]}
                    </span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 border-border p-0">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {session.user.full_name ?? session.user.email.split("@")[0]}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {session.user.email}
                    </p>
                  </div>

                  {user && plan && (
                    <div className="border-b border-border px-4 py-3">
                      {/* Header row */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Zap className="size-3 text-primary" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            Generations
                          </span>
                        </div>
                        <span className={["font-mono text-[11px] font-semibold tabular-nums", isAtLimit ? "text-destructive" : isNearLimit ? "text-orange-500" : "text-foreground"].join(" ")}>
                          {Math.max(limit - used, 0)}
                          <span className="font-normal text-muted-foreground/50"> left</span>
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 w-full overflow-hidden bg-muted">
                        <div
                          className={["h-full transition-all duration-500", isAtLimit ? "bg-destructive" : isNearLimit ? "bg-orange-500" : "bg-primary"].join(" ")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Sub-row */}
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                          {planSlug === "free" ? "Free · resets weekly" : planSlug.includes("monthly") ? "Pro · monthly" : "Pro · yearly"}
                        </span>
                        <span className="font-mono text-[9px] tabular-nums text-muted-foreground/50">
                          {used}/{limit} used
                        </span>
                      </div>

                      {planSlug === "free" && (
                        <Link
                          href="/pricing"
                          className={["mt-2.5 flex w-full items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-90", isAtLimit || isNearLimit ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-muted-foreground hover:text-foreground"].join(" ")}
                        >
                          <Zap className="size-3" />
                          {isAtLimit ? "Limit reached — Upgrade now" : "Upgrade to Pro"}
                          <ArrowUpRight className="size-3" />
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link href="/workspace" className="flex items-center gap-2.5 px-4 py-2 text-[13px]">
                        <LayoutDashboard className="size-3.5 text-muted-foreground" />
                        Workspace
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center gap-2.5 px-4 py-2 text-[13px]">
                        <Settings className="size-3.5 text-muted-foreground" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-border" />

                  <div className="py-1">
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="flex items-center gap-2.5 px-4 py-2 text-[13px] text-destructive focus:text-destructive"
                    >
                      <LogOut className="size-3.5" />
                      Sign out
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

            ) : (
              /* ── Signed out ── */
              <>
                <button
                  onClick={() => openAuthModal("sign-in")}
                  className="flex h-full items-center border-r border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Sign in
                </button>
                <button
                  onClick={() => openAuthModal("register")}
                  className="flex h-full items-center bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get started
                </button>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Saved prompts slide-over */}
      {savedOpen && <SavedPromptsPanel onClose={() => setSavedOpen(false)} />}
    </header>
  );
}
