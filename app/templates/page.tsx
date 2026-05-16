"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Lock, Search, FileText,
  Palette, Code2, GraduationCap, Layers,
  Megaphone, PenLine, Briefcase, ChevronRight,
  X, LayoutGrid, List, SlidersHorizontal,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { SectionContainer } from "@/components/shared/section-container";
import { Skeleton } from "@/components/ui/skeleton";
import { getTemplates, type TemplateRecord } from "@/lib/api/templates";
import { useAuthSession } from "@/lib/auth/session";
import { useAuthModal } from "@/components/auth/auth-modal-provider";

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

/* ── Grid card — exact same design as admin TemplateCard ─────────── */

function TemplateCard({
  template,
  onUse,
}: {
  template: TemplateRecord;
  onUse: (t: TemplateRecord) => void;
}) {
  const meta = getCategoryMeta(template.category);
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onUse(template)}
      className="group flex flex-col border border-border bg-card text-left transition-all duration-150 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Cover */}
      <div className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${meta.gradient}`}>
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className={`flex size-14 items-center justify-center border border-white/10 bg-white/5 backdrop-blur-sm ${meta.iconColor}`}>
          <Icon className="size-7" strokeWidth={1.5} />
        </div>
        {template.is_premium && (
          <div className="absolute right-3 top-3 flex items-center gap-1 bg-card/90 px-2 py-1 backdrop-blur-sm">
            <Lock className="size-2.5 text-primary" />
            <span className="font-mono text-[8px] uppercase tracking-wider text-primary">Pro</span>
          </div>
        )}
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
    </button>
  );
}

/* ── List row ────────────────────────────────────────────────────── */

function TemplateRow({
  template,
  onUse,
}: {
  template: TemplateRecord;
  onUse: (t: TemplateRecord) => void;
}) {
  const meta = getCategoryMeta(template.category);
  const Icon = meta.icon;

  return (
    <button
      onClick={() => onUse(template)}
      className="group grid w-full grid-cols-[56px_1fr_120px_80px_100px] items-center border-b border-border px-5 py-3.5 text-left last:border-b-0 transition-colors hover:bg-muted/10"
    >
      {/* Icon square — same frosted-glass style, smaller */}
      <div className={`flex size-9 items-center justify-center bg-gradient-to-br ${meta.gradient} border border-border`}>
        <Icon className={`size-4 ${meta.iconColor}`} strokeWidth={1.5} />
      </div>

      <span className="flex items-start gap-2 truncate pr-4">
        <span className="truncate text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
          {template.title}
        </span>
        {template.is_premium && (
          <span className="flex shrink-0 items-center gap-0.5 border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wider text-primary">
            <Lock className="size-2" />
            Pro
          </span>
        )}
      </span>

      <span className={`font-mono text-[9px] uppercase tracking-wider ${meta.iconColor}`}>
        {meta.label}
      </span>

      <span className="flex justify-center">
        <span className="size-2 rounded-full bg-emerald-500" />
      </span>

      <span className="flex justify-end">
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 transition-colors group-hover:text-primary">
          Use →
        </span>
      </span>
    </button>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-border bg-card">
      <Skeleton className="h-28 rounded-none" />
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex gap-1 pt-0.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function TemplatesPage() {
  const session = useAuthSession();
  const { openAuthModal } = useAuthModal();
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [showPremiumOnly, setShowPremiumOnly] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    if (cat && CATEGORY_META[cat]) setActiveCategory(cat);
  }, []);

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
    staleTime: 5 * 60_000,
  });

  const templates = templatesQuery.data ?? [];

  const filtered = templates.filter((t) => {
    const matchCat = activeCategory === "all" || t.category === activeCategory;
    const matchPremium = !showPremiumOnly || t.is_premium;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchCat && matchSearch && matchPremium;
  });

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    for (const t of templates) counts[t.category] = (counts[t.category] ?? 0) + 1;
    return counts;
  }, [templates]);

  function handleUse(template: TemplateRecord) {
    if (!session) { openAuthModal("register"); return; }
    window.location.href = `/workspace?prompt=${encodeURIComponent(template.template_content)}`;
  }

  function clearFilters() {
    setSearch("");
    setActiveCategory("all");
    setShowPremiumOnly(false);
  }

  const hasFilters = search.trim() || activeCategory !== "all" || showPremiumOnly;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* ── Hero ──────────────────────────────── */}
        <SectionContainer as="div" className="pb-10 pt-14 sm:pt-20">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 border border-border bg-card px-3.5 py-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {templates.length > 0 ? `${templates.length} Templates` : "Templates"}
                </span>
              </div>
              <h1 className="text-[clamp(1.9rem,4.5vw,3rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground">
                Prompt structures
                <br />
                <span className="text-muted-foreground">built for real work.</span>
              </h1>
              <p className="mt-4 max-w-lg text-[14.5px] leading-relaxed text-muted-foreground">
                Expert-crafted frameworks for every workflow. Pick a template,
                customise it in the workspace, and generate precise AI outputs — faster.
              </p>
            </div>

            {!session && (
              <button
                onClick={() => openAuthModal("register")}
                className="group inline-flex shrink-0 items-center gap-2 bg-primary px-6 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Get started free
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="mt-10 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory("all")}
              className={[
                "flex items-center gap-1.5 border px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors",
                activeCategory === "all"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              All
              {templates.length > 0 && <span className="opacity-50">{templates.length}</span>}
            </button>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const Icon = meta.icon;
              const count = categoryCounts[key] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={[
                    "flex items-center gap-1.5 border px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors",
                    activeCategory === key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon className="size-3" strokeWidth={1.5} />
                  {meta.label}
                  <span className="opacity-50">{count}</span>
                </button>
              );
            })}
          </div>
        </SectionContainer>

        {/* ── Toolbar ───────────────────────────── */}
        <SectionContainer as="div" className="pb-5">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-border bg-card py-2 pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Pro filter */}
            <button
              onClick={() => setShowPremiumOnly((v) => !v)}
              className={[
                "flex items-center gap-1.5 border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.15em] transition-colors",
                showPremiumOnly
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              <SlidersHorizontal className="size-3" />
              Pro only
            </button>

            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                <X className="size-3" /> Clear
              </button>
            )}

            <div className="flex-1" />

            {/* View toggle */}
            <div className="flex border border-border">
              <button
                onClick={() => setViewMode("grid")}
                className={[
                  "flex items-center px-3 py-2 transition-colors",
                  viewMode === "grid" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={[
                  "flex items-center border-l border-border px-3 py-2 transition-colors",
                  viewMode === "list" ? "bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                <List className="size-3.5" />
              </button>
            </div>
          </div>
        </SectionContainer>

        {/* ── Results ───────────────────────────── */}
        <SectionContainer as="div" className="pb-20">

          {/* Count */}
          {!templatesQuery.isLoading && !templatesQuery.isError && filtered.length > 0 && (
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {filtered.length} template{filtered.length !== 1 ? "s" : ""}
              {activeCategory !== "all" && ` · ${getCategoryMeta(activeCategory).label}`}
              {search && ` · "${search}"`}
            </p>
          )}

          {/* Loading */}
          {templatesQuery.isLoading && (
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Error */}
          {templatesQuery.isError && (
            <div className="border border-border bg-muted/50 px-6 py-5 text-[13px] text-muted-foreground">
              Templates could not be loaded. Please refresh the page.
            </div>
          )}

          {/* No templates at all */}
          {!templatesQuery.isLoading && !templatesQuery.isError && templates.length === 0 && (
            <div className="flex flex-col items-center gap-5 border border-border bg-card px-8 py-20 text-center">
              <div className="flex size-14 items-center justify-center border border-border bg-muted/50">
                <FileText className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">Templates coming soon</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Our team is curating them for launch.{" "}
                  <Link href="/workspace" className="text-foreground underline underline-offset-2">Start from scratch</Link>{" "}
                  in the meantime.
                </p>
              </div>
            </div>
          )}

          {/* Empty search/filter */}
          {!templatesQuery.isLoading && !templatesQuery.isError && templates.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-4 border border-border bg-card px-8 py-14 text-center">
              <Search className="size-7 text-muted-foreground/40" strokeWidth={1.5} />
              <div>
                <p className="text-[14px] font-medium text-foreground">No templates match your filters</p>
                <p className="mt-1 text-[13px] text-muted-foreground">Try a different search term or category.</p>
              </div>
              <button
                onClick={clearFilters}
                className="mt-1 flex items-center gap-1.5 border border-border bg-card px-4 py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
              >
                <X className="size-3.5" /> Clear all filters
              </button>
            </div>
          )}

          {/* Grid */}
          {!templatesQuery.isLoading && !templatesQuery.isError && filtered.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={handleUse} />
              ))}
            </div>
          )}

          {/* List */}
          {!templatesQuery.isLoading && !templatesQuery.isError && filtered.length > 0 && viewMode === "list" && (
            <div className="border border-border bg-card">
              {/* List header */}
              <div className="grid grid-cols-[56px_1fr_120px_80px_100px] border-b border-border bg-muted/30 px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                <span />
                <span>Title</span>
                <span>Category</span>
                <span className="text-center">Active</span>
                <span className="text-right">Action</span>
              </div>
              {filtered.map((t) => (
                <TemplateRow key={t.id} template={t} onUse={handleUse} />
              ))}
            </div>
          )}
        </SectionContainer>

        {/* ── CTA strip ─────────────────────────── */}
        <SectionContainer as="div" className="border-t border-border pb-16 pt-12">
          <div className="relative overflow-hidden border border-border bg-card px-8 py-10">
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Lock className="size-3.5 text-primary" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Pro plan</span>
                </div>
                <h3 className="text-[1.25rem] font-semibold tracking-tight text-foreground">
                  Unlock every premium template.
                </h3>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  Plus unlimited generations, advanced models, and priority support.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 bg-primary px-6 py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  View pricing
                  <ArrowRight className="size-3.5" />
                </Link>
                <span className="text-[11px] text-muted-foreground">No credit card required to start</span>
              </div>
            </div>
          </div>
        </SectionContainer>
      </main>

      <SiteFooter />
    </div>
  );
}
