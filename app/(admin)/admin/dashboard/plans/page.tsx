"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check, ChevronRight, Package, Pencil, Plus,
  Power, CheckCircle2, Trash2, X, Zap,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  createAdminPlan, deleteAdminPlan, getAdminPlans, toggleAdminPlan, updateAdminPlan,
  type AdminPlan, type PlanCreatePayload, type PlanUpdatePayload,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(price: number, currency: string) {
  if (price === 0) return "Free";
  const sym = currency === "NGN" ? "₦" : "$";
  return `${sym}${price.toLocaleString()}`;
}

const FEATURE_KEYS: { key: keyof AdminPlan; label: string }[] = [
  { key: "can_use_premium_templates", label: "Premium templates" },
  { key: "can_save_unlimited_prompts", label: "Unlimited saved prompts" },
  { key: "priority_generation", label: "Priority generation" },
];

/* ── Plan form modal ─────────────────────────────────────────────── */
type FormMode = { type: "create" } | { type: "edit"; plan: AdminPlan };

function PlanFormModal({
  mode,
  token,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  token: string;
  onClose: () => void;
  onSaved: (plan: AdminPlan) => void;
}) {
  const editing = mode.type === "edit" ? mode.plan : null;

  const [name, setName] = React.useState(editing?.name ?? "");
  const [slug, setSlug] = React.useState(editing?.slug ?? "");
  const [description, setDescription] = React.useState(editing?.description ?? "");
  const [price, setPrice] = React.useState(String(editing?.price ?? "0"));
  const [currency, setCurrency] = React.useState(editing?.currency ?? "NGN");
  const [billingInterval, setBillingInterval] = React.useState(editing?.billing_interval ?? "monthly");
  const [genLimit, setGenLimit] = React.useState(String(editing?.generation_limit ?? "5"));
  const [premiumTemplates, setPremiumTemplates] = React.useState(editing?.can_use_premium_templates ?? false);
  const [unlimitedPrompts, setUnlimitedPrompts] = React.useState(editing?.can_save_unlimited_prompts ?? false);
  const [priorityGen, setPriorityGen] = React.useState(editing?.priority_generation ?? false);
  const [isActive, setIsActive] = React.useState(editing?.is_active ?? true);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-generate slug from name when creating
  React.useEffect(() => {
    if (mode.type === "create") {
      setSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }, [name, mode.type]);

  const createMutation = useMutation({
    mutationFn: (payload: PlanCreatePayload) => createAdminPlan(token, payload),
    onSuccess: (plan) => { onSaved(plan); onClose(); },
    onError: (e: unknown) => setError((e as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PlanUpdatePayload) => updateAdminPlan(token, editing!.id, payload),
    onSuccess: (plan) => { onSaved(plan); onClose(); },
    onError: (e: unknown) => setError((e as Error).message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name, slug, description,
      price: parseFloat(price) || 0,
      currency,
      billing_interval: billingInterval,
      generation_limit: parseInt(genLimit) || 0,
      can_use_premium_templates: premiumTemplates,
      can_save_unlimited_prompts: unlimitedPrompts,
      priority_generation: priorityGen,
      is_active: isActive,
    };
    if (mode.type === "create") createMutation.mutate(payload);
    else updateMutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {mode.type === "create" ? "New plan" : "Edit plan"}
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-foreground">
              {mode.type === "create" ? "Create pricing plan" : `Editing — ${editing?.name}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
          <div className="space-y-5 px-6 py-5">

            {/* Name + Slug */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Plan name" required>
                <input
                  value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Pro"
                />
              </FormField>
              <FormField label="Slug" required hint={mode.type === "edit" ? "Read-only" : undefined}>
                <input
                  value={slug} onChange={(e) => setSlug(e.target.value)} required
                  readOnly={mode.type === "edit"}
                  className={`w-full border border-border bg-background px-3 py-2 font-mono text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${mode.type === "edit" ? "opacity-50 cursor-not-allowed" : ""}`}
                  placeholder="pro"
                />
              </FormField>
            </div>

            {/* Description */}
            <FormField label="Description" required>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} required rows={2}
                className="w-full resize-none border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Best for power users…"
              />
            </FormField>

            {/* Price + Currency + Interval */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Price" required>
                <input
                  type="number" min="0" step="0.01" value={price}
                  onChange={(e) => setPrice(e.target.value)} required
                  className="w-full border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="0"
                />
              </FormField>
              <FormField label="Currency">
                <select
                  value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="NGN">NGN ₦</option>
                  <option value="USD">USD $</option>
                  <option value="GBP">GBP £</option>
                </select>
              </FormField>
              <FormField label="Interval">
                <select
                  value={billingInterval} onChange={(e) => setBillingInterval(e.target.value)}
                  className="w-full border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </FormField>
            </div>

            {/* Generation limit */}
            <FormField label="Generation limit / period" hint="Number of AI prompts allowed per billing period">
              <input
                type="number" min="0" value={genLimit}
                onChange={(e) => setGenLimit(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="100"
              />
            </FormField>

            {/* Feature toggles */}
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Features</p>
              <div className="space-y-2 border border-border bg-muted/20 px-4 py-3">
                {[
                  { label: "Premium templates", value: premiumTemplates, set: setPremiumTemplates },
                  { label: "Unlimited saved prompts", value: unlimitedPrompts, set: setUnlimitedPrompts },
                  { label: "Priority generation", value: priorityGen, set: setPriorityGen },
                ].map(({ label, value, set }) => (
                  <label key={label} className="flex cursor-pointer items-center justify-between">
                    <span className="text-[13px] text-foreground">{label}</span>
                    <button
                      type="button"
                      onClick={() => set(!value)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Active status */}
            <label className="flex cursor-pointer items-center justify-between border border-border px-4 py-3">
              <div>
                <p className="text-[13px] font-medium text-foreground">Active</p>
                <p className="text-[11px] text-muted-foreground">Visible to users on the pricing page</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted-foreground/30"}`}
              >
                <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </label>

            {error && (
              <p className="border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={isPending}
              className="flex items-center gap-2 bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isPending && <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />}
              {mode.type === "create" ? "Create plan" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Delete confirm ──────────────────────────────────────────────── */
function DeleteModal({ plan, token, onClose, onDeleted }: {
  plan: AdminPlan; token: string; onClose: () => void; onDeleted: (id: string) => void;
}) {
  const mutation = useMutation({
    mutationFn: () => deleteAdminPlan(token, plan.id),
    onSuccess: () => { onDeleted(plan.id); onClose(); },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-border bg-card shadow-xl">
        <div className="px-6 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive">Destructive action</p>
          <h3 className="mt-1.5 text-[15px] font-semibold text-foreground">Delete "{plan.name}"?</h3>
          <p className="mt-2 text-[13px] text-muted-foreground">
            This permanently removes the plan. Active subscribers will not be immediately affected, but the plan will no longer appear in pricing.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex items-center gap-2 bg-destructive px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending && <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            Delete plan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Plan card ───────────────────────────────────────────────────── */
function PlanCard({ plan, token, onEdit, onDeleted }: {
  plan: AdminPlan; token: string;
  onEdit: (p: AdminPlan) => void;
  onDeleted: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [showDelete, setShowDelete] = React.useState(false);

  const toggleMutation = useMutation({
    mutationFn: () => toggleAdminPlan(token, plan.id),
    onSuccess: (updated) => {
      qc.setQueryData(["admin-plans", token], (old: AdminPlan[] | undefined) =>
        old?.map((p) => (p.id === updated.id ? updated : p)) ?? [updated],
      );
    },
  });

  const features = FEATURE_KEYS.filter((f) => plan[f.key as keyof AdminPlan]);

  return (
    <>
      <div className={`relative flex flex-col border bg-card transition-all ${plan.is_active ? "border-border" : "border-border opacity-60"}`}>
        {/* Status strip */}
        <div className={`h-0.5 w-full ${plan.is_active ? "bg-primary" : "bg-muted-foreground/30"}`} />

        <div className="flex flex-col gap-4 p-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-foreground">{plan.name}</p>
                {!plan.is_active && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{plan.slug}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(plan)}
                className="flex size-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                title="Edit"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}
                className={`flex size-7 items-center justify-center border transition-colors disabled:opacity-50 ${plan.is_active ? "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive" : "border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-500"}`}
                title={plan.is_active ? "Deactivate" : "Activate"}
              >
                <Power className="size-3" />
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="flex size-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="text-[26px] font-semibold leading-none tracking-tight text-foreground">
              {fmt(plan.price, plan.currency)}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {plan.price > 0 ? `per ${plan.billing_interval}` : "forever free"}
            </p>
          </div>

          {/* Description */}
          <p className="text-[13px] leading-relaxed text-muted-foreground">{plan.description}</p>

          {/* Generation limit */}
          <div className="flex items-center gap-2 border border-border bg-muted/30 px-3 py-2">
            <Zap className="size-3 text-primary" />
            <span className="font-mono text-[11px] text-foreground">
              {plan.generation_limit.toLocaleString()} generations / {plan.billing_interval}
            </span>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f.key} className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Check className="size-3 text-primary" />
                  {f.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Provider prices footer */}
        {Object.keys(plan.provider_prices).length > 0 && (
          <div className="mt-auto border-t border-border px-5 py-3">
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Provider prices</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(plan.provider_prices).map(([provider, pp]) => (
                <span key={provider} className="font-mono text-[11px] text-muted-foreground">
                  <span className="capitalize">{provider}</span>: {pp.currency} {pp.amount.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDelete && (
        <DeleteModal
          plan={plan} token={token}
          onClose={() => setShowDelete(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function AdminPlansPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const qc = useQueryClient();

  const [formMode, setFormMode] = React.useState<FormMode | null>(null);

  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ["admin-plans", token],
    queryFn: () => getAdminPlans(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  function handleSaved(plan: AdminPlan) {
    qc.setQueryData(["admin-plans", token], (old: AdminPlan[] | undefined) => {
      if (!old) return [plan];
      const exists = old.find((p) => p.id === plan.id);
      return exists ? old.map((p) => (p.id === plan.id ? plan : p)) : [plan, ...old];
    });
  }

  function handleDeleted(id: string) {
    qc.setQueryData(["admin-plans", token], (old: AdminPlan[] | undefined) =>
      old?.filter((p) => p.id !== id) ?? [],
    );
  }

  const activePlans = plans.filter((p) => p.is_active);
  const totalRevenuePlans = plans.filter((p) => p.price > 0);

  return (
    <div className="px-6 py-6 lg:px-8">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Admin · Pricing</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">Plans</h1>
        </div>
        <button
          onClick={() => setFormMode({ type: "create" })}
          className="flex items-center gap-2 border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Plus className="size-3.5" />
          New plan
        </button>
      </div>

      {/* Stats */}
      {!isLoading && !isError && plans.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
          {[
            { label: "Total plans", value: plans.length, icon: Package, color: "text-sky-400" },
            { label: "Active plans", value: activePlans.length, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Paid plans", value: totalRevenuePlans.length, icon: Zap, color: "text-primary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3.5 bg-card px-5 py-4">
              <Icon className={`size-4 ${color}`} />
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-[20px] font-semibold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-4 bg-card p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load plans.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && plans.length === 0 && (
        <div className="flex flex-col items-center gap-4 border border-border bg-card px-8 py-16 text-center">
          <Package className="size-8 text-muted-foreground/30" />
          <div>
            <p className="text-[14px] font-medium text-foreground">No plans yet</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Create your first pricing plan to get started.</p>
          </div>
          <button
            onClick={() => setFormMode({ type: "create" })}
            className="flex items-center gap-2 bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground"
          >
            <Plus className="size-3.5" />
            Create first plan
          </button>
        </div>
      )}

      {/* Plans grid */}
      {!isLoading && !isError && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              token={token}
              onEdit={(p) => setFormMode({ type: "edit", plan: p })}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {formMode && (
        <PlanFormModal
          mode={formMode}
          token={token}
          onClose={() => setFormMode(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ── Form field helper ───────────────────────────────────────────── */
function FormField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
        {required && <span className="text-primary">*</span>}
        {hint && <span className="ml-1 normal-case font-sans text-[10px] text-muted-foreground/60">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
