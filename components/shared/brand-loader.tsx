"use client";

import * as React from "react";

import { ThynkLogo } from "@/components/brand/thynk-logo";
import { cn } from "@/lib/utils";

export function BrandLoader({ className }: { className?: string }) {
  const [progress, setProgress] = React.useState(12);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          return 100;
        }

        const nextStep = value > 80 ? 4 : value > 55 ? 6 : 8;
        return Math.min(100, value + nextStep);
      });
    }, 180);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center bg-background px-6",
        className,
      )}
    >
      <div className="w-full max-w-md border border-border bg-card p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="animate-pulse">
            <ThynkLogo size="lg" />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
            Preparing your prompt workspace with a calmer, cleaner AI flow.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Loading</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${progress}%`, transition: "width 200ms ease" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
