"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, ChevronRight, Copy, Check, Plus,
  Filter, Tag, ArrowUpRight, X, FileText,
  Layers, LayoutList, Hash, Calendar, User,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminPrompts,
  createTemplate,
  type AdminPrompt,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ─────────────────────────────────────────────────────── */
function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  design:      "bg-violet-500/10 text-violet-400 border-violet-500/20",
  development: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  student:     "bg-amber-500/10 text-amber-400 border-amber-500/20",
  content:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  marketing:   "bg-pink-500/10 text-pink-400 border-pink-500/20",
  writing:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  business:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function CategoryBadge({ category }: { category: string }) {
  const cls = CATEGORY_COLORS[category] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] ${cls}`}>
      {category}
    </span>
  );
}

/* ── Add to Template modal ───────────────────────────────────────── */
function AddTemplateModal({
  prompt,
  token,
  onClose,
}: {
  prompt: AdminPrompt;
  token: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState(prompt.title);
  const [description, setDescription] = React.useState("");
  const [tags, setTags] = React.useState(prompt.category);
  const [isPremium, setIsPremium] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      createTemplate(token, {
        title: title.trim(),
        description: description.trim(),
        category: prompt.category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_premium: isPremium,
        is_active: true,
        template_content: prompt.generated_prompt,
      }),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["admin-templates"] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Save as Template</p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-foreground">Add to template library</h2>
          </div>
          <button onClick={onClose} className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="flex size-12 items-center justify-center bg-emerald-500/10">
              <Check className="size-6 text-emerald-400" />
            </div>
            <p className="text-[15px] font-semibold text-foreground">Template created.</p>
            <p className="text-[13px] text-muted-foreground">"{title}" is now live in the template library.</p>
            <div className="mt-2 flex gap-2">
              <button onClick={onClose} className="border border-border bg-card px-5 py-2 text-[13px] font-medium text-foreground hover:bg-muted">
                Close
              </button>
              <a href="/admin/dashboard/templates" className="flex items-center gap-1.5 bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90">
                View templates <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 px-6 py-5"
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          >
            {/* Prompt preview */}
            <div className="border border-border bg-muted/30 p-4">
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Prompt preview</p>
              <p className="line-clamp-4 text-[12px] leading-relaxed text-muted-foreground">{prompt.generated_prompt}</p>
              <div className="mt-2 flex items-center gap-2">
                <CategoryBadge category={prompt.category} />
                {prompt.platform && (
                  <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">{prompt.platform}</span>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Title</label>
              <input
                type="text" required
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Description</label>
              <textarea
                rows={2} required
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this template helps with…"
                className="w-full border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Tags <span className="normal-case opacity-50">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="design, ui, layout"
                className="w-full border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Premium toggle */}
            <label className="flex cursor-pointer items-center gap-3">
              <div
                className={`relative h-5 w-9 border transition-colors ${isPremium ? "border-primary bg-primary" : "border-border bg-muted"}`}
                onClick={() => setIsPremium(!isPremium)}
              >
                <span className={`absolute top-0.5 size-4 bg-white shadow transition-transform ${isPremium ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-[13px] text-foreground">Mark as premium template</span>
            </label>

            {mutation.isError && (
              <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                Failed to create template. Try again.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || !title.trim() || !description.trim()}
                className="flex flex-1 items-center justify-center gap-1.5 bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? "Creating…" : <><Plus className="size-3.5" />Create template</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Prompt detail panel ─────────────────────────────────────────── */
function PromptDetailPanel({
  prompt,
  onSaveAsTemplate,
  onClose,
}: {
  prompt: AdminPrompt;
  onSaveAsTemplate: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(prompt.generated_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Prompt detail</p>
          <h2 className="mt-1 truncate text-[14px] font-semibold text-foreground">{prompt.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <CategoryBadge category={prompt.category} />
            {prompt.tone && (
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">{prompt.tone}</span>
            )}
            {prompt.platform && (
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">{prompt.platform}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto space-y-5 p-5">
        {/* Original input */}
        {prompt.rough_input && (
          <div>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Original input</p>
            <div className="border border-border bg-muted/30 p-4">
              <p className="text-[12px] leading-relaxed text-muted-foreground">{prompt.rough_input}</p>
            </div>
          </div>
        )}

        {/* Generated prompt */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Generated prompt</p>
            <button onClick={handleCopy} className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
              {copied ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
            </button>
          </div>
          <div className="border border-primary/20 bg-primary/[0.03] p-4">
            <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-foreground">{prompt.generated_prompt}</pre>
          </div>
        </div>

        {/* Metadata */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Metadata</p>
          </div>
          <div className="divide-y divide-border">
            {([
              { label: "Prompt ID",     value: prompt.id,            mono: true },
              { label: "User ID",       value: prompt.user_id,       mono: true },
              { label: "Created",       value: fmt(prompt.created_at) },
              prompt.complexity    && { label: "Complexity",    value: prompt.complexity },
              prompt.output_format && { label: "Output format", value: prompt.output_format },
            ] as ({ label: string; value: string; mono?: boolean } | false)[])
              .filter(Boolean)
              .map((row) => {
                const r = row as { label: string; value: string; mono?: boolean };
                return (
                  <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{r.label}</span>
                    <span className={`text-right text-[11px] ${r.mono ? "font-mono text-muted-foreground/70" : "text-foreground"}`}>
                      {r.value}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <button
          onClick={onSaveAsTemplate}
          className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <FileText className="size-3.5" />
          Save as template
        </button>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
const CATEGORIES_ALL = ["all", "design", "development", "student", "content", "marketing", "writing", "business"] as const;

export default function AdminPromptsPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";

  const [search, setSearch] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("all");
  const [selectedPrompt, setSelectedPrompt] = React.useState<AdminPrompt | null>(null);
  const [showAddTemplate, setShowAddTemplate] = React.useState(false);

  const { data: prompts = [], isLoading, isError } = useQuery({
    queryKey: ["admin-prompts", token],
    queryFn: () => getAdminPrompts(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase();
    return prompts.filter((p) => {
      const matchCat = filterCategory === "all" || p.category === filterCategory;
      const matchSearch = !q
        || p.title.toLowerCase().includes(q)
        || p.generated_prompt.toLowerCase().includes(q)
        || p.category.includes(q);
      return matchCat && matchSearch;
    });
  }, [prompts, search, filterCategory]);

  const categoryCount = React.useMemo(() => {
    const map: Record<string, number> = { all: prompts.length };
    prompts.forEach((p) => { map[p.category] = (map[p.category] ?? 0) + 1; });
    return map;
  }, [prompts]);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Dashboard · Prompts</p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">Generated Prompts</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Browse user-generated prompts and save quality ones as templates.
            </p>
          </div>
          {!isLoading && prompts.length > 0 && (
            <div className="flex shrink-0 items-center gap-3 border border-border bg-card px-4 py-2.5">
              <Hash className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[13px] tabular-nums font-semibold text-foreground">{prompts.length.toLocaleString()}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">prompts total</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, content, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-border bg-background py-2 pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="size-3 shrink-0 text-muted-foreground" />
            {CATEGORIES_ALL.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={[
                  "shrink-0 border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors",
                  filterCategory === cat
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
              >
                {cat}
                {categoryCount[cat] !== undefined && (
                  <span className="ml-1 opacity-50">({categoryCount[cat]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className={`flex flex-col overflow-y-auto ${selectedPrompt ? "hidden lg:flex lg:w-[480px] lg:shrink-0" : "flex-1"}`}>
          {isLoading ? (
            <div className="space-y-px p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border border-border bg-card p-4 space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : isError ? (
            /* ── Error state ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
              <div className="flex size-14 items-center justify-center border border-destructive/20 bg-destructive/5">
                <LayoutList className="size-6 text-destructive/50" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground">Could not load prompts</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  The endpoint may not be available yet. Restart the backend server and try again.
                </p>
              </div>
            </div>
          ) : prompts.length === 0 ? (
            /* ── Empty state — no prompts in the system at all ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-24 text-center">
              <div className="flex size-16 items-center justify-center border border-border bg-muted/30">
                <Layers className="size-7 text-muted-foreground/30" />
              </div>
              <div className="max-w-xs">
                <p className="text-[15px] font-medium text-foreground">No prompts generated yet</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  When users generate prompts from the workspace, they will appear here for review and curation.
                </p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2 border border-border bg-card px-4 py-2.5">
                  <User className="size-3 text-muted-foreground" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Waiting for user activity</span>
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            /* ── No search results ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
              <Search className="size-7 text-muted-foreground/25" />
              <p className="text-[14px] font-medium text-foreground">No results</p>
              <p className="text-[12px] text-muted-foreground">No prompts match "{search}".</p>
              <button
                onClick={() => { setSearch(""); setFilterCategory("all"); }}
                className="mt-1 font-mono text-[10px] uppercase tracking-wider text-primary hover:opacity-70"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p) => {
                const isActive = selectedPrompt?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPrompt(isActive ? null : p)}
                    className={[
                      "group w-full border-l-2 px-5 py-4 text-left transition-colors",
                      isActive
                        ? "border-l-primary bg-primary/5"
                        : "border-l-transparent hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-foreground">{p.title}</p>
                          <CategoryBadge category={p.category} />
                        </div>
                        <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{p.generated_prompt}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60">
                            <Calendar className="size-2.5" />{fmt(p.created_at)}
                          </span>
                          {p.platform && (
                            <span className="font-mono text-[9px] text-muted-foreground/60">{p.platform}</span>
                          )}
                          {p.tone && (
                            <span className="font-mono text-[9px] text-muted-foreground/50">{p.tone}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <ChevronRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrompt(p);
                            setShowAddTemplate(true);
                          }}
                          className="flex items-center gap-1 border border-border bg-card px-2 py-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground opacity-0 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary group-hover:opacity-100"
                        >
                          <Tag className="size-2.5" />Template
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedPrompt && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <PromptDetailPanel
              prompt={selectedPrompt}
              onSaveAsTemplate={() => setShowAddTemplate(true)}
              onClose={() => setSelectedPrompt(null)}
            />
          </div>
        )}
      </div>

      {/* Add template modal */}
      {showAddTemplate && selectedPrompt && (
        <AddTemplateModal
          prompt={selectedPrompt}
          token={token}
          onClose={() => setShowAddTemplate(false)}
        />
      )}
    </div>
  );
}
