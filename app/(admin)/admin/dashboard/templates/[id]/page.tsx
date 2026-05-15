"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronRight, Lock, Globe, Tag, Sparkles,
  Code2, GraduationCap, FileText, Megaphone, PenLine,
  Briefcase, Zap, Eye, EyeOff, Trash2, ToggleLeft, ToggleRight, XCircle,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminTemplate,
  toggleTemplate,
  deleteTemplate,
  type AdminTemplate,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── Category meta ───────────────────────────────────────────────── */

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; gradient: string; iconColor: string }> = {
  design:      { label: "Design",      icon: Sparkles,      gradient: "from-violet-500/25 via-purple-500/10 to-transparent", iconColor: "text-violet-400" },
  development: { label: "Development", icon: Code2,         gradient: "from-sky-500/25 via-blue-500/10 to-transparent",     iconColor: "text-sky-400" },
  student:     { label: "Student",     icon: GraduationCap, gradient: "from-emerald-500/25 via-teal-500/10 to-transparent",  iconColor: "text-emerald-400" },
  content:     { label: "Content",     icon: FileText,      gradient: "from-amber-500/25 via-orange-500/10 to-transparent",  iconColor: "text-amber-400" },
  marketing:   { label: "Marketing",   icon: Megaphone,     gradient: "from-primary/25 via-red-500/10 to-transparent",       iconColor: "text-primary" },
  writing:     { label: "Writing",     icon: PenLine,       gradient: "from-pink-500/25 via-rose-500/10 to-transparent",     iconColor: "text-pink-400" },
  business:    { label: "Business",    icon: Briefcase,     gradient: "from-slate-500/25 via-zinc-500/10 to-transparent",    iconColor: "text-slate-400" },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? { label: category, icon: Zap, gradient: "from-primary/20 to-transparent", iconColor: "text-primary" };
}

/* ── Detail row ──────────────────────────────────────────────────── */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <div className="text-right text-[13px] text-foreground">{children}</div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function AdminTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const qc = useQueryClient();
  const [showRaw, setShowRaw] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { data: template, isLoading, isError } = useQuery({
    queryKey: ["admin-template", id],
    queryFn: () => getAdminTemplate(token, id),
    enabled: Boolean(token && id),
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleTemplate(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-template", id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTemplate(token, id),
    onSuccess: () => router.push("/admin/dashboard/templates"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/50" />
        <p className="text-[14px] text-muted-foreground">Template not found.</p>
        <Link href="/admin/dashboard/templates" className="text-[13px] text-foreground underline">Back to templates</Link>
      </div>
    );
  }

  const meta = getCategoryMeta(template.category);
  const Icon = meta.icon;

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link href="/admin/dashboard/templates" className="flex items-center gap-1 transition-colors hover:text-foreground">
            <ArrowLeft className="size-3" />
            Templates
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{template.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">

        {/* Cover card */}
        <div className="border border-border overflow-hidden">
          {/* Gradient cover */}
          <div className={`relative flex h-36 items-end overflow-hidden bg-gradient-to-br ${meta.gradient} px-6 py-5`}>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "16px 16px" }}
            />
            <Icon className={`absolute right-6 top-4 size-24 opacity-[0.07] ${meta.iconColor}`} />
            <div className="relative flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${meta.iconColor}`} />
                <span className={`font-mono text-[9px] font-bold uppercase tracking-[0.2em] ${meta.iconColor}`}>{meta.label}</span>
                {template.is_premium && (
                  <span className="flex items-center gap-1 border border-primary/30 bg-card/80 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-primary backdrop-blur-sm">
                    <Lock className="size-2.5" /> Pro
                  </span>
                )}
                <span className={`flex items-center gap-1 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${template.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/60 text-muted-foreground"}`}>
                  {template.is_active ? <Globe className="size-2.5" /> : <EyeOff className="size-2.5" />}
                  {template.is_active ? "Published" : "Hidden"}
                </span>
              </div>
              <h1 className="text-[20px] font-semibold leading-tight text-foreground">{template.title}</h1>
            </div>
          </div>

          {/* Meta below cover */}
          <div className="bg-card px-6 py-4">
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">{template.description}</p>
            {template.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {template.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 border border-border bg-background px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    <Tag className="size-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={`flex items-center gap-1.5 border px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${
              template.is_active
                ? "border-border bg-card text-muted-foreground hover:text-foreground"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {template.is_active ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
            {toggleMutation.isPending ? "Saving…" : template.is_active ? "Unpublish" : "Publish"}
          </button>

          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 border border-destructive/30 bg-destructive/10 px-4 py-2 text-[12px] font-medium text-destructive transition-opacity hover:opacity-80"
          >
            <Trash2 className="size-3.5" />
            Delete template
          </button>
        </div>

        {/* Template content */}
        <div className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-foreground">Template content</h2>
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {showRaw ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
              {showRaw ? "Formatted" : "Raw"}
            </button>
          </div>
          <div className="px-6 py-5">
            {showRaw ? (
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-foreground">
                {template.template_content}
              </pre>
            ) : (
              <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
                {template.template_content}
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-[13px] font-semibold text-foreground">Details</h2>
          </div>
          <div className="px-6">
            <DetailRow label="Template ID">
              <span className="font-mono text-[11px] text-muted-foreground">{template.id}</span>
            </DetailRow>
            <DetailRow label="Category">{meta.label}</DetailRow>
            <DetailRow label="Premium">{template.is_premium ? "Yes — Pro only" : "No — Free"}</DetailRow>
            <DetailRow label="Published">{template.is_active ? "Yes" : "No"}</DetailRow>
            <DetailRow label="Tags">
              {template.tags.length > 0 ? template.tags.join(", ") : "—"}
            </DetailRow>
          </div>
        </div>

      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-foreground">Delete template?</h3>
            <p className="mt-2 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{template.title}</span> will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-destructive py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
