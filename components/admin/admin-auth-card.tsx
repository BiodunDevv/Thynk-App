import * as React from "react";

import { cn } from "@/lib/utils";

export function AdminAuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border border-border bg-card shadow-sm", className)}>
      <div className="p-7">{children}</div>
    </div>
  );
}

export function AdminAuthField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminSubmitButton({
  label,
  loadingLabel,
  loading = false,
}: {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading && loadingLabel ? (
        <span className="flex items-center gap-2">
          <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          {loadingLabel}
        </span>
      ) : label}
    </button>
  );
}
