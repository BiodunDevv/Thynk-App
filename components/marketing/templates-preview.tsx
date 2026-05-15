"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Lock, FileText,
  Palette, Code2, GraduationCap, Layers,
  Megaphone, PenLine, Briefcase, ChevronRight,
} from "lucide-react";

import { SectionContainer } from "@/components/shared/section-container";
import { Skeleton } from "@/components/ui/skeleton";
import { getTemplates, type TemplateRecord } from "@/lib/api/templates";

/* ── Category meta — identical to admin dashboard ────────────────── */

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; gradient: string; iconColor: string }
> = {
  design:      { label: "Design",      icon: Palette,       gradient: "from-violet-500/20 to-purple-500/10",  iconColor: "text-violet-400" },
  development: { label: "Development", icon: Code2,         gradient: "from-sky-500/20 to-blue-500/10",       iconColor: "text-sky-400" },
  student:     { label: "Student",     icon: GraduationCap, gradient: "from-emerald-500/20 to-teal-500/10",   iconColor: "text-emerald-400" },
  content:     { label: "Content",     icon: Layers,        gradient: "from-amber-500/20 to-orange-500/10",   iconColor: "text-amber-400" },
  marketing:   { label: "Marketing",   icon: Megaphone,     gradient: "from-primary/20 to-red-500/10",        iconColor: "text-primary" },
  writing:     { label: "Writing",     icon: PenLine,       gradient: "from-pink-500/20 to-rose-500/10",      iconColor: "text-pink-400" },
  business:    { label: "Business",    icon: Briefcase,     gradient: "from-slate-500/20 to-zinc-500/10",     iconColor: "text-slate-400" },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? {
    label: category,
    icon: FileText,
    gradient: "from-muted/40 to-muted/10",
    iconColor: "text-muted-foreground",
  };
}

import * as React from "react";

/* ── Card — exact same structure as admin TemplateCard ───────────── */

function MiniTemplateCard({ template }: { template: TemplateRecord }) {
  const meta = getCategoryMeta(template.category);
  const Icon = meta.icon;

  return (
    <Link
      href="/templates"
      className="group flex flex-col border border-border bg-card text-left transition-all duration-150 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Cover */}
      <div className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${meta.gradient}`}>
        {/* Crosshatch grid — same as admin */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Frosted-glass icon square */}
        <div className={`flex size-14 items-center justify-center border border-white/10 bg-white/5 backdrop-blur-sm ${meta.iconColor}`}>
          <Icon className="size-7" strokeWidth={1.5} />
        </div>
        {/* Pro badge */}
        {template.is_premium && (
          <div className="absolute right-3 top-3 flex items-center gap-1 bg-card/90 px-2 py-1 backdrop-blur-sm">
            <Lock className="size-2.5 text-primary" />
            <span className="font-mono text-[8px] uppercase tracking-wider text-primary">Pro</span>
          </div>
        )}
        {/* Active dot */}
        <div className="absolute left-3 top-3 size-2 rounded-full bg-emerald-500" />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {template.title}
          </h3>
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary/60" />
        </div>
        <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
          {template.description}
        </p>
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <span className={`font-mono text-[9px] uppercase tracking-[0.15em] ${meta.iconColor}`}>
          {meta.label}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40">
          Use template
        </span>
      </div>
    </Link>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-border bg-card">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-1 pt-0.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────── */

export function TemplatesPreview() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
    staleTime: 5 * 60_000,
  });

  const templates = (data ?? []).slice(0, 6);
  const hasTemplates = !isLoading && !isError && templates.length > 0;
  const isEmpty = !isLoading && !isError && templates.length === 0;
  const totalCount = data?.length ?? 0;

  return (
    <SectionContainer as="section" className="border-t border-border py-20">

      {/* Header */}
      <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 border border-border bg-card px-3.5 py-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Templates
            </span>
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-foreground">
            Start with structure.{" "}
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">Ship faster.</span>
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
            Expert-crafted prompt frameworks for every workflow. Pick one,
            customise it in the workspace, and generate precise AI outputs in seconds.
          </p>
        </div>

        <Link
          href="/templates"
          className="group inline-flex shrink-0 items-center gap-2 border border-border bg-card px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Browse all templates
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="border border-border bg-muted/50 px-6 py-5 text-[13px] text-muted-foreground">
          Templates could not be loaded.{" "}
          <Link href="/templates" className="text-foreground underline underline-offset-2">
            View the templates page
          </Link>
          .
        </div>
      )}

      {/* Empty */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-4 border border-border bg-card px-8 py-16 text-center">
          <FileText className="size-8 text-muted-foreground/30" />
          <div>
            <p className="text-[14px] font-medium text-foreground">Templates coming soon</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Being curated for launch.{" "}
              <Link href="/workspace" className="text-foreground underline underline-offset-2">
                Start from scratch
              </Link>{" "}
              in the workspace.
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {hasTemplates && (
        <>
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <MiniTemplateCard key={t.id} template={t} />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Showing {templates.length} of {totalCount} template{totalCount !== 1 ? "s" : ""}
            </p>
            {totalCount > 6 && (
              <Link
                href="/templates"
                className="group flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                +{totalCount - 6} more
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </>
      )}

      {/* Category chips */}
      <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-8">
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const Icon = meta.icon;
          return (
            <Link
              key={key}
              href={`/templates?category=${key}`}
              className="group flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 transition-colors hover:border-primary/30 hover:bg-muted"
            >
              <Icon className={`size-3 ${meta.iconColor} opacity-70 group-hover:opacity-100`} />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover:text-foreground">
                {meta.label}
              </span>
            </Link>
          );
        })}
      </div>
    </SectionContainer>
  );
}
