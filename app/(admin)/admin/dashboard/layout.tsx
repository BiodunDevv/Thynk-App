"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Package,
  Tag,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
  HeadphonesIcon,
  Layers,
  BarChart2,
} from "lucide-react";

import { ThynkLogo } from "@/components/brand/thynk-logo";
import { useAdminSession, useAdminSessionState, clearAdminSession } from "@/lib/auth/admin-session";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/dashboard/users", label: "Users", icon: Users },
  { href: "/admin/dashboard/support", label: "Support", icon: HeadphonesIcon },
  { href: "/admin/dashboard/prompts", label: "Prompts", icon: Layers },
  { href: "/admin/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/dashboard/templates", label: "Templates", icon: FileText },
  { href: "/admin/dashboard/plans", label: "Plans", icon: Package },
  { href: "/admin/dashboard/coupons", label: "Coupons", icon: Tag },
];

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAdminSessionState();
  const router = useRouter();

  React.useEffect(() => {
    if (ready && session === null) {
      router.replace("/admin/sign-in");
    }
  }, [ready, session, router]);

  if (!ready || !session) return null;
  return <>{children}</>;
}

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAdminSession();

  function handleSignOut() {
    clearAdminSession();
    router.push("/admin/sign-in");
  }

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <ThynkLogo size="sm" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Admin
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-2 px-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/50">
              Navigation
            </span>
          </div>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={[
                      "flex items-center gap-3 px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="ml-auto size-3 text-primary" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User + sign out */}
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex size-7 shrink-0 items-center justify-center bg-primary/10">
              <Zap className="size-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-foreground">
                {session?.user.full_name ?? session?.user.email.split("@")[0]}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                Super admin
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <AdminGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="size-4" />
            </button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                Thynk · Admin portal
              </span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
