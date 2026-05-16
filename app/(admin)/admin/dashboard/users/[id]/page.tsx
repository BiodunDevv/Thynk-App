"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  BarChart2,
  Calendar,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Mail,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserX,
  XCircle,
  Zap,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  deactivateAdminUser,
  deleteAdminUser,
  getAdminUser,
  getAdminUserChats,
  grantCredits,
  reactivateAdminUser,
  type AdminDeleteUserResult,
  type AdminUser,
  type AdminUserChatOutput,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-emerald-500/20 text-emerald-400",
  "bg-sky-500/20 text-sky-400",
  "bg-amber-500/20 text-amber-400",
  "bg-violet-500/20 text-violet-400",
];

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}

function initials(user: AdminUser) {
  if (user.full_name) {
    return user.full_name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }
  return user.email[0].toUpperCase();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <div className="text-right text-[13px] text-foreground">{children}</div>
    </div>
  );
}

function FinalOutputsPanel({ chats }: { chats: AdminUserChatOutput[] }) {
  const normalizedChats = React.useMemo(
    () =>
      chats.map((chat) => ({
        ...chat,
        final_outputs: Array.isArray(chat.final_outputs) ? chat.final_outputs : [],
      })),
    [chats],
  );

  const [selectedChatId, setSelectedChatId] = React.useState<string | null>(
    normalizedChats.find((chat) => chat.generated_prompt_count > 0)?.id ?? normalizedChats[0]?.id ?? null,
  );

  const selectedChat =
    (selectedChatId ? normalizedChats.find((chat) => chat.id === selectedChatId) : null) ??
    normalizedChats.find((chat) => chat.generated_prompt_count > 0) ??
    normalizedChats[0] ??
    null;

  if (!normalizedChats.length) {
    return (
      <div className="border border-border bg-card px-6 py-12 text-center">
        <MessageSquareText className="mx-auto size-10 text-muted-foreground/35" />
        <p className="mt-4 text-[14px] font-medium text-foreground">No final outputs yet</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          This user has not generated a final prompt output in the workspace yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Final outputs
          </p>
        </div>
        <div className="divide-y divide-border">
          {normalizedChats.map((chat) => {
            const active = chat.id === selectedChat?.id;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  active ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {chat.title}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      {chat.category} · {chat.generated_prompt_count} output
                      {chat.generated_prompt_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  {active && <ChevronRight className="mt-0.5 size-3 text-primary" />}
                </div>
                {chat.latest_output_preview && (
                  <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">
                    {chat.latest_output_preview}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Review surface
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-foreground">
            {selectedChat?.title ?? "Final outputs"}
          </h2>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Admin review only includes completed outputs. Raw private conversation history is intentionally hidden.
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-border px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Category
              </p>
              <p className="mt-1 text-[13px] font-medium text-foreground">
                {selectedChat?.category ?? "—"}
              </p>
            </div>
            <div className="border border-border px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-[13px] font-medium text-foreground">
                {selectedChat?.status ?? "—"}
              </p>
            </div>
            <div className="border border-border px-4 py-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Created
              </p>
              <p className="mt-1 text-[13px] font-medium text-foreground">
                {fmtDate(selectedChat?.created_at)}
              </p>
            </div>
          </div>

          {selectedChat && selectedChat.final_outputs.length > 0 ? (
            <div className="space-y-4">
              {selectedChat.final_outputs.map((output, index) => (
                <div key={`${selectedChat.id}-${index}`} className="border border-border">
                  <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      Final output {index + 1}
                    </p>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-4 text-[12px] leading-6 text-foreground">
                    {output}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border px-6 py-10 text-center">
              <p className="text-[13px] text-muted-foreground">
                This chat exists, but it does not contain a completed final output yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GrantCreditsModal({
  user,
  token,
  onClose,
}: {
  user: AdminUser;
  token: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState(10);
  const [custom, setCustom] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [done, setDone] = React.useState(false);
  const finalAmount = custom ? parseInt(custom, 10) : amount;

  const mutation = useMutation({
    mutationFn: () => grantCredits(token, user.id, finalAmount, reason),
    onSuccess: () => {
      setDone(true);
      qc.invalidateQueries({ queryKey: ["admin-user", user.id] });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Grant Credits
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-foreground">
            {user.full_name ?? user.email}
          </h2>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle className="size-10 text-emerald-400" />
            <p className="text-[15px] font-medium text-foreground">
              {finalAmount} credits granted.
            </p>
            <button
              onClick={onClose}
              className="mt-2 border border-border bg-card px-5 py-2 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5 px-6 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Amount
              </p>
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setAmount(value);
                      setCustom("");
                    }}
                    className={[
                      "flex-1 border py-2 font-mono text-[12px] transition-colors",
                      amount === value && !custom
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Custom amount…"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Reason
              </p>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Compensation for downtime…"
                className="w-full border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {mutation.isError && (
              <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                Failed to grant credits. Try again.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  mutation.isPending ||
                  !reason.trim() ||
                  Number.isNaN(finalAmount) ||
                  finalAmount < 1
                }
                className="flex-1 bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {mutation.isPending ? "Granting…" : `Grant ${finalAmount || "?"} credits`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ConfirmAccountActionModal({
  title,
  description,
  confirmLabel,
  tone = "destructive",
  isPending,
  result,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "destructive" | "warning";
  isPending: boolean;
  result?: AdminDeleteUserResult | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const buttonClass =
    tone === "warning"
      ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
      : "bg-destructive text-destructive-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Account action
          </p>
          <h2 className="mt-0.5 text-[16px] font-semibold text-foreground">{title}</h2>
        </div>

        {result ? (
          <div className="space-y-4 px-6 py-5">
            <p className="text-[13px] text-foreground">
              The user account was removed successfully.
            </p>
            <div className="border border-border bg-muted/20 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Deleted related records
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.entries(result.deleted_related_records).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border border-border px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {key.replaceAll("_", " ")}
                    </span>
                    <span className="text-[12px] font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 px-6 py-5">
            <p className="text-[13px] leading-6 text-muted-foreground">{description}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={onConfirm}
                className={`flex-1 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${buttonClass}`}
              >
                {isPending ? "Working…" : confirmLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const qc = useQueryClient();

  const [tab, setTab] = React.useState<"details" | "outputs">("details");
  const [showGrant, setShowGrant] = React.useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleteResult, setDeleteResult] = React.useState<AdminDeleteUserResult | null>(null);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => getAdminUser(token, id),
    enabled: Boolean(token && id),
  });

  const {
    data: userChats = [],
    isLoading: chatsLoading,
  } = useQuery({
    queryKey: ["admin-user-chats", id],
    queryFn: () => getAdminUserChats(token, id),
    enabled: Boolean(token && id && tab === "outputs"),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateAdminUser(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowDeactivateConfirm(false);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateAdminUser(token, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminUser(token, id),
    onSuccess: (result) => {
      setDeleteResult(result);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  React.useEffect(() => {
    if (deleteResult) {
      const timer = window.setTimeout(() => {
        router.push("/admin/dashboard/users");
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [deleteResult, router]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/50" />
        <p className="text-[14px] text-muted-foreground">User not found.</p>
        <Link
          href="/admin/dashboard/users"
          className="text-[13px] text-foreground underline"
        >
          Back to users
        </Link>
      </div>
    );
  }

  const isActive = user.is_active;
  const isVerified = user.is_verified;
  const isPro = user.subscription_status === "active";

  return (
    <div className="min-h-full">
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link
            href="/admin/dashboard/users"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3" />
            Users
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">
            {user.full_name ?? user.email.split("@")[0]}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-5 border border-border bg-card p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex size-16 shrink-0 items-center justify-center text-xl font-bold ${avatarColor(user.id)}`}>
              {initials(user)}
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">
                {user.full_name ?? "—"}
              </h1>
              <p className="text-[13px] text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isActive ? "bg-emerald-500" : "bg-muted-foreground/40"
                    }`}
                  />
                  {isActive ? "Active" : "Inactive"}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-400">
                    <CheckCircle className="size-2.5" />
                    Verified
                  </span>
                )}
                {isPro && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                    <Zap className="size-2.5" />
                    Pro
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowGrant(true)}
              className="flex items-center gap-1.5 border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              <Zap className="size-3.5" />
              Grant credits
            </button>
            {isActive ? (
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                className="flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] font-medium text-amber-400"
              >
                <UserX className="size-3.5" />
                Deactivate
              </button>
            ) : (
              <button
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
                className="flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-medium text-emerald-400 disabled:opacity-50"
              >
                <RefreshCw className="size-3.5" />
                {reactivateMutation.isPending ? "Restoring…" : "Reactivate"}
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 bg-destructive px-4 py-2 text-[12px] font-medium text-destructive-foreground"
            >
              <Trash2 className="size-3.5" />
              Delete account
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 border border-border bg-card sm:grid-cols-4">
          {[
            { icon: BarChart2, label: "Total prompts", value: user.prompt_generation_count ?? 0, color: "text-primary" },
            { icon: RefreshCw, label: "This month", value: user.monthly_generation_count ?? 0, color: "text-sky-400" },
            { icon: CreditCard, label: "Plan", value: isPro ? "Pro" : "Free", color: "text-amber-400" },
            { icon: ShieldCheck, label: "Role", value: user.role === "SUPER_ADMIN" ? "Admin" : "User", color: "text-violet-400" },
          ].map(({ icon: Icon, label, value, color }, i, arr) => (
            <div
              key={label}
              className={`flex flex-col gap-1 p-5 ${i < arr.length - 1 ? "border-r border-border" : ""}`}
            >
              <Icon className={`size-4 ${color}`} />
              <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="border border-border bg-card">
          <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            {[
              { key: "details", label: "Account details" },
              { key: "outputs", label: "Final outputs" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key as "details" | "outputs")}
                className={`px-3 py-2 text-[12px] font-medium transition-colors ${
                  tab === item.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "details" ? (
            <div className="px-6">
              <DetailRow label="User ID">
                <span className="font-mono text-[11px] text-muted-foreground">{user.id}</span>
              </DetailRow>
              <DetailRow label="Email">
                <a href={`mailto:${user.email}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Mail className="size-3.5" />
                  {user.email}
                </a>
              </DetailRow>
              <DetailRow label="Joined">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {fmtDate(user.created_at)}
                </div>
              </DetailRow>
              <DetailRow label="Email verified">
                {isVerified ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="size-3.5" />
                    Yes
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <XCircle className="size-3.5" />
                    No
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Account status">
                {isActive ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="size-3.5" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Ban className="size-3.5" />
                    Deactivated
                  </span>
                )}
              </DetailRow>
            <DetailRow label="Subscription">
              <span className={isPro ? "text-primary" : "text-muted-foreground"}>
                {user.subscription_status ? user.subscription_status.replace("_", " ") : "Free"}
              </span>
            </DetailRow>
            <DetailRow label="Points remaining">
              <span className="font-mono text-[12px] text-foreground">
                {safeNumber(user.credits_remaining).toLocaleString()}
              </span>
            </DetailRow>
            <DetailRow label="Plan ID">
              <span className="font-mono text-[11px] text-muted-foreground">
                {user.current_plan_id ?? "—"}
                </span>
              </DetailRow>
            </div>
          ) : (
            <div className="p-6">
              {chatsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <FinalOutputsPanel chats={userChats} />
              )}
            </div>
          )}
        </div>
      </div>

      {showGrant && <GrantCreditsModal user={user} token={token} onClose={() => setShowGrant(false)} />}

      {showDeactivateConfirm && (
        <ConfirmAccountActionModal
          title="Deactivate this account?"
          description="This is the soft-delete path. The user account stays in the system, but the user will no longer be able to sign in or use the product until an admin restores access."
          confirmLabel="Deactivate account"
          tone="warning"
          isPending={deactivateMutation.isPending}
          onClose={() => setShowDeactivateConfirm(false)}
          onConfirm={() => deactivateMutation.mutate()}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmAccountActionModal
          title="Delete this account permanently?"
          description="This is irreversible. The user record will be removed and user-owned application data will be deleted. Billing payments are preserved for audit with customer snapshots."
          confirmLabel="Delete permanently"
          isPending={deleteMutation.isPending}
          result={deleteResult}
          onClose={() => {
            setShowDeleteConfirm(false);
            if (!deleteResult) return;
            router.push("/admin/dashboard/users");
          }}
          onConfirm={() => deleteMutation.mutate()}
        />
      )}
    </div>
  );
}
