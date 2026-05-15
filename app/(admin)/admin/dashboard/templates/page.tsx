"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, FileText, Search, Lock, Globe, Layers,
  Code2, GraduationCap, Megaphone, PenLine, Briefcase,
  Palette, ChevronRight, X, RefreshCw, Eye, EyeOff,
  Tag, Sparkles, ImageIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getTemplates, type TemplateRecord } from "@/lib/api/templates";
import { createTemplate, type CreateTemplatePayload } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── category meta ───────────────────────────────────────────────── */

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ElementType; gradient: string; iconColor: string }
> = {
  design:      { label: "Design",       icon: Palette,       gradient: "from-violet-500/20 to-purple-500/10",   iconColor: "text-violet-400" },
  development: { label: "Development",  icon: Code2,         gradient: "from-sky-500/20 to-blue-500/10",        iconColor: "text-sky-400" },
  student:     { label: "Student",      icon: GraduationCap, gradient: "from-emerald-500/20 to-teal-500/10",    iconColor: "text-emerald-400" },
  content:     { label: "Content",      icon: Layers,        gradient: "from-amber-500/20 to-orange-500/10",    iconColor: "text-amber-400" },
  marketing:   { label: "Marketing",    icon: Megaphone,     gradient: "from-primary/20 to-red-500/10",         iconColor: "text-primary" },
  writing:     { label: "Writing",      icon: PenLine,       gradient: "from-pink-500/20 to-rose-500/10",       iconColor: "text-pink-400" },
  business:    { label: "Business",     icon: Briefcase,     gradient: "from-slate-500/20 to-zinc-500/10",      iconColor: "text-slate-400" },
};

const CATEGORIES = Object.keys(CATEGORY_META);

/* ── template card ───────────────────────────────────────────────── */

function TemplateCard({
  template,
  onClick,
}: {
  template: TemplateRecord;
  onClick: () => void;
}) {
  const meta = CATEGORY_META[template.category] ?? {
    label: template.category,
    icon: FileText,
    gradient: "from-muted/40 to-muted/10",
    iconColor: "text-muted-foreground",
  };
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col border border-border bg-card text-left transition-all duration-150 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Cover image area */}
      <div className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${meta.gradient}`}>
        {/* Decorative pattern */}
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
        {/* Premium badge */}
        {template.is_premium && (
          <div className="absolute right-3 top-3 flex items-center gap-1 bg-card/90 px-2 py-1 backdrop-blur-sm">
            <Lock className="size-2.5 text-primary" />
            <span className="font-mono text-[8px] uppercase tracking-wider text-primary">Pro</span>
          </div>
        )}
        {/* Active indicator */}
        <div className={`absolute left-3 top-3 size-2 rounded-full ${template.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {template.title}
          </h3>
          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
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
          {template.is_active ? "Published" : "Draft"}
        </span>
      </div>
    </button>
  );
}

/* ── template detail drawer ──────────────────────────────────────── */

function TemplateDrawer({ template, onClose }: { template: TemplateRecord; onClose: () => void }) {
  const meta = CATEGORY_META[template.category] ?? { label: template.category, icon: FileText, gradient: "from-muted/40 to-muted/10", iconColor: "text-muted-foreground" };
  const Icon = meta.icon;
  const [showRaw, setShowRaw] = React.useState(false);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
        {/* Cover */}
        <div className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${meta.gradient}`}>
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className={`flex size-16 items-center justify-center border border-white/10 bg-white/5 ${meta.iconColor}`}>
            <Icon className="size-8" strokeWidth={1.5} />
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex size-8 items-center justify-center bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[9px] uppercase tracking-[0.15em] ${meta.iconColor}`}>{meta.label}</span>
            {template.is_premium && (
              <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-primary">
                <Lock className="size-2.5" /> Pro
              </span>
            )}
            <span className={`ml-auto flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider ${template.is_active ? "text-emerald-400" : "text-muted-foreground/50"}`}>
              <span className={`size-1.5 rounded-full ${template.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              {template.is_active ? "Published" : "Draft"}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{template.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{template.description}</p>
          {template.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {template.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 border border-border bg-muted/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  <Tag className="size-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content preview */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Template content</span>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {showRaw ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              {showRaw ? "Formatted" : "Raw"}
            </button>
          </div>
          {showRaw ? (
            <pre className="overflow-x-auto whitespace-pre-wrap border border-border bg-background p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {template.template_content}
            </pre>
          ) : (
            <div className="border border-border bg-background p-4 text-[13px] leading-[1.8] text-muted-foreground whitespace-pre-wrap">
              {template.template_content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── create modal ────────────────────────────────────────────────── */

function CreateTemplateModal({ token, onClose }: { token: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [form, setForm] = React.useState<CreateTemplatePayload>({
    title: "",
    description: "",
    category: "content",
    tags: [],
    is_premium: false,
    is_active: true,
    template_content: "",
  });
  const [tagsInput, setTagsInput] = React.useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createTemplate(token, {
        ...form,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      onClose();
    },
  });

  const meta = CATEGORY_META[form.category] ?? CATEGORY_META.content;
  const Icon = meta.icon;

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              New template · Step {step} of 2
            </p>
            <h3 className="mt-0.5 text-[15px] font-semibold text-foreground">
              {step === 1 ? "Template details" : "Content & settings"}
            </h3>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Category visual picker */}
              <Field label="Category">
                <div className="grid grid-cols-4 gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const m = CATEGORY_META[cat];
                    const CatIcon = m.icon;
                    return (
                      <button
                        key={cat}
                        onClick={() => setForm((f) => ({ ...f, category: cat }))}
                        className={`flex flex-col items-center gap-1.5 border p-2.5 transition-all ${
                          form.category === cat
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:border-border/60 hover:bg-muted/30"
                        }`}
                      >
                        <CatIcon className={`size-4 ${form.category === cat ? "text-primary" : m.iconColor}`} strokeWidth={1.5} />
                        <span className={`font-mono text-[8px] uppercase tracking-wider ${form.category === cat ? "text-primary" : "text-muted-foreground"}`}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Live preview chip */}
              <div className={`flex items-center gap-3 border border-border bg-gradient-to-r ${meta.gradient} p-3`}>
                <div className={`flex size-9 items-center justify-center bg-white/10 ${meta.iconColor}`}>
                  <Icon className="size-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{form.title || "Template title"}</p>
                  <p className={`font-mono text-[9px] uppercase tracking-wider ${meta.iconColor}`}>{meta.label}</p>
                </div>
              </div>

              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Product launch email sequence"
                  className="w-full border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What does this template help users achieve?"
                  rows={2}
                  className="w-full resize-none border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </Field>

              <Field label="Tags (comma-separated)">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. email, launch, marketing"
                    className="w-full border border-border bg-background py-2.5 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </Field>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Prompt template content">
                <textarea
                  value={form.template_content}
                  onChange={(e) => setForm((f) => ({ ...f, template_content: e.target.value }))}
                  placeholder={`Write the prompt template here.\n\nTip: Use [placeholders] for user-customisable parts.`}
                  rows={10}
                  className="w-full resize-none border border-border bg-background px-3 py-3 font-mono text-[12px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-right font-mono text-[9px] text-muted-foreground/50">
                  {form.template_content.length} chars
                </p>
              </Field>

              {/* Toggle settings */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center justify-between border border-border bg-background px-3 py-3 hover:bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <Lock className="size-3.5 text-primary" />
                    <div>
                      <p className="text-[12px] font-medium text-foreground">Premium only</p>
                      <p className="text-[10px] text-muted-foreground">Requires Pro plan</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_premium}
                    onChange={(e) => setForm((f) => ({ ...f, is_premium: e.target.checked }))}
                    className="accent-primary"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between border border-border bg-background px-3 py-3 hover:bg-muted/20">
                  <div className="flex items-center gap-2.5">
                    <Globe className="size-3.5 text-emerald-500" />
                    <div>
                      <p className="text-[12px] font-medium text-foreground">Published</p>
                      <p className="text-[10px] text-muted-foreground">Visible to users</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="accent-primary"
                  />
                </label>
              </div>

              {mutation.isError && (
                <p className="border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-[12px] text-destructive">
                  {(mutation.error as { message?: string })?.message ?? "Failed to create template."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-6 py-4">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="border border-border bg-background px-4 py-2.5 text-[13px] text-foreground hover:bg-muted"
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            className="border border-border bg-background px-4 py-2.5 text-[13px] text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!form.title.trim() || !form.description.trim()}
              className="ml-auto flex items-center gap-2 bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.template_content.trim()}
              className="ml-auto flex items-center gap-2 bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {mutation.isPending ? (
                "Creating…"
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Create template
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────── */

export default function AdminTemplatesPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const router = useRouter();
  const [showCreate, setShowCreate] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState("all");
  const [selected, setSelected] = React.useState<TemplateRecord | null>(null);
  const [view, setView] = React.useState<"grid" | "list">("grid");

  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
    staleTime: 60_000,
  });

  const allCats = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.toLowerCase().includes(q));
    const matchCat = catFilter === "all" || t.category === catFilter;
    return matchSearch && matchCat;
  });

  const premiumCount = templates.filter((t) => t.is_premium).length;
  const activeCount = templates.filter((t) => t.is_active).length;

  return (
    <div className="px-6 py-6 lg:px-8">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Admin · Templates</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Prompt templates</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {templates.length} templates · {premiumCount} premium · {activeCount} published
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex shrink-0 items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          New template
        </button>
      </div>

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Category filters */}
        <div className="flex flex-wrap gap-1">
          {allCats.map((cat) => {
            const m = CATEGORY_META[cat];
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors ${
                  catFilter === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {m && <m.icon className="size-3" />}
                {m?.label ?? "All"}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 border border-border bg-card py-2 pl-9 pr-4 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {/* View toggle */}
          <div className="flex border border-border">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  view === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="flex size-9 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {filtered.length} template{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col bg-card">
              <Skeleton className="h-28 w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 border border-destructive/30 bg-destructive/10 px-5 py-4">
          <FileText className="size-4 shrink-0 text-destructive" />
          <p className="text-[13px] text-destructive">Failed to load templates.</p>
          <button onClick={() => refetch()} className="ml-auto font-mono text-[10px] uppercase tracking-wider text-destructive hover:opacity-70">Retry</button>
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 border border-border bg-card py-16 text-center">
          <div className="flex size-14 items-center justify-center bg-muted">
            <ImageIcon className="size-6 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-foreground">No templates found</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {search ? `No results for "${search}"` : "Create your first template above."}
            </p>
          </div>
          {search && (
            <button onClick={() => setSearch("")} className="font-mono text-[10px] uppercase tracking-wider text-primary hover:opacity-70">
              Clear search
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        view === "grid" ? (
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} onClick={() => router.push(`/admin/dashboard/templates/${t.id}`)} />
            ))}
          </div>
        ) : (
          <div className="border border-border">
            <div className="grid grid-cols-[1fr_120px_80px_60px_80px] border-b border-border px-5 py-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              <span>Title</span>
              <span>Category</span>
              <span>Premium</span>
              <span>Active</span>
              <span className="text-right">Tags</span>
            </div>
            {filtered.map((t) => {
              const m = CATEGORY_META[t.category];
              const RowIcon = m?.icon ?? FileText;
              return (
                <Link
                  key={t.id}
                  href={`/admin/dashboard/templates/${t.id}`}
                  className="grid w-full grid-cols-[1fr_120px_80px_60px_80px] items-center border-b border-border px-5 py-3.5 text-left last:border-b-0 transition-colors hover:bg-muted/10"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <RowIcon className={`size-3.5 shrink-0 ${m?.iconColor ?? "text-muted-foreground"}`} />
                    <span className="truncate text-[13px] font-medium text-foreground">{t.title}</span>
                  </span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${m?.iconColor ?? "text-muted-foreground"}`}>{m?.label ?? t.category}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${t.is_premium ? "text-primary" : "text-muted-foreground/50"}`}>{t.is_premium ? "Pro" : "Free"}</span>
                  <span className={`size-2 rounded-full ${t.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <span className="text-right text-[11px] text-muted-foreground">{t.tags.slice(0, 2).join(", ")}</span>
                </Link>
              );
            })}
          </div>
        )
      )}

      {showCreate && <CreateTemplateModal token={token} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
