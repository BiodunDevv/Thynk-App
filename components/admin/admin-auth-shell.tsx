import * as React from "react";

import { ThynkLogo } from "@/components/brand/thynk-logo";
import { cn } from "@/lib/utils";

export function AdminAuthShell({
  title,
  subtitle,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-screen flex-col items-center justify-center overflow-hidden bg-background px-4", className)}>

      {/* Subtle grid backdrop */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(to right, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* Logo lockup */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="border border-border bg-card px-4 py-3 shadow-sm">
            <ThynkLogo size="md" />
          </div>

          {badge && (
            <span className="mt-4 inline-flex items-center gap-1.5 border border-border bg-muted px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              {badge}
            </span>
          )}

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {children}

        {/* Footer */}
        <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
          Thynk · Admin portal
        </p>
      </div>
    </div>
  );
}
