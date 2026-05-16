"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Mail, Calendar, BarChart2, ShieldCheck, Zap,
  CheckCircle, XCircle, Ban, BadgeCheck, CreditCard, RefreshCw,
  ChevronRight, MessageSquare, Layers, Clock, Search,
  ChevronDown, ChevronUp, Copy, Check, X,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminUser,
  getAdminUserChats,
  toggleUserStatus,
  grantCredits,
  type AdminUser,
} from "@/lib/api/admin";
import type { RequestChatRecord } from "@/lib/api/chats";
import { useAdminSession } from "@/lib/auth/admin-session";

/* ── helpers ─────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-emerald-500/20 text-emerald-400",
  "bg-violet-500/20 text-violet-400",
  "bg-sky-500/20 text-sky-400",
  "bg-amber-500/20 text-amber-400",
];
function avatarColor(id: string) {
  return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
}
function initials(user: AdminUser) {
  if (user.full_name) return user.full_name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return user.email[0].toUpperCase();
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function fmtTime(d: string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const CATEGORY_COLORS: Record<string, string> = {
  design:      "bg-violet-500/10 text-violet-400",
  development: "bg-sky-500/10 text-sky-400",
  student:     "bg-amber-500/10 text-amber-400",
  content:     "bg-emerald-500/10 text-emerald-400",
  marketing:   "bg-pink-500/10 text-pink-400",
  writing:     "bg-orange-500/10 text-orange-400",
  business:    "bg-blue-500/10 text-blue-400",
};

/* ── Grant Credits Modal ─────────────────────────────────────────── */
const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

function GrantCreditsModal({ user, token, onClose }: { user: AdminUser; token: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = React.useState(10);
  const [custom, setCustom] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [done, setDone] = React.useState(false);
  const finalAmount = custom ? parseInt(custom, 10) : amount;

  const mutation = useMutation({
    mutationFn: () => grantCredits(token, user.id, finalAmount, reason),
    onSuccess: () => { setDone(true); qc.invalidateQueries({ queryKey: ["admin-user", user.id] }); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Grant Credits</p>
          <h2 className="mt-0.5 text-[15px] font-semibold text-foreground">{user.full_name ?? user.email}</h2>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <CheckCircle className="size-10 text-emerald-400" />
            <p className="text-[15px] font-medium text-foreground">{finalAmount} credits granted.</p>
            <button onClick={onClose} className="mt-2 border border-border bg-card px-5 py-2 text-[13px] font-medium text-foreground hover:bg-muted">Close</button>
          </div>
        ) : (
          <form className="flex flex-col gap-5 px-6 py-5" onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Amount</p>
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button key={a} type="button" onClick={() => { setAmount(a); setCustom(""); }}
                    className={["flex-1 border py-2 font-mono text-[12px] transition-colors", amount === a && !custom ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"].join(" ")}>
                    {a}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Custom amount…" value={custom} onChange={(e) => setCustom(e.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Reason</p>
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Compensation for downtime…"
                className="w-full border border-border bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring" required />
            </div>
            {mutation.isError && (
              <p className="border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">Failed to grant credits. Try again.</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 border border-border bg-card py-2.5 text-[13px] font-medium text-foreground hover:bg-muted">Cancel</button>
              <button type="submit" disabled={mutation.isPending || !reason.trim() || isNaN(finalAmount) || finalAmount < 1}
                className="flex-1 bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                {mutation.isPending ? "Granting…" : `Grant ${finalAmount || "?"} credits`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
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

/* ── Chat viewer ─────────────────────────────────────────────────── */
function ChatViewer({ chat, onClose }: { chat: RequestChatRecord; onClose: () => void }) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const finalMessages = chat.messages.filter((m) => m.metadata?.is_final);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="flex h-full max-h-[80vh] w-full max-w-2xl flex-col border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Chat transcript</p>
            <h2 className="mt-0.5 truncate text-[14px] font-semibold text-foreground">{chat.title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className={`px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${CATEGORY_COLORS[chat.category] ?? "bg-muted text-muted-foreground"}`}>
                {chat.category}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground/60">
                {chat.messages.length} messages
              </span>
              {finalMessages.length > 0 && (
                <span className="flex items-center gap-0.5 font-mono text-[9px] text-primary/70">
                  <Layers className="size-2.5" />{finalMessages.length} prompt{finalMessages.length !== 1 ? "s" : ""} generated
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {chat.messages.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-muted-foreground">No messages in this chat.</p>
          ) : (
            chat.messages.map((msg) => {
              const isUser = msg.role === "user";
              const isFinal = msg.metadata?.is_final === true;

              if (isFinal) {
                return (
                  <div key={msg.id} className="border border-primary/20 bg-primary/3 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="size-3 text-primary" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-primary">Generated Prompt</span>
                      </div>
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === msg.id ? <><Check className="size-3" />Copied</> : <><Copy className="size-3" />Copy</>}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-foreground">{msg.content}</pre>
                    <p className="mt-2 text-right font-mono text-[9px] text-muted-foreground">{fmtTime(msg.created_at)}</p>
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2.5`}>
                  {!isUser && (
                    <div className="flex size-6 shrink-0 items-center justify-center border border-primary/20 bg-primary/5 mt-0.5">
                      <Zap className="size-3 text-primary" />
                    </div>
                  )}
                  <div className="max-w-[78%]">
                    <div className={isUser
                      ? "bg-primary px-3 py-2 text-[12px] leading-relaxed text-primary-foreground"
                      : "border border-border bg-card px-3 py-2 text-[12px] leading-relaxed text-foreground"
                    }>
                      {msg.content}
                    </div>
                    <p className={`mt-0.5 font-mono text-[9px] text-muted-foreground/60 ${isUser ? "text-right" : "text-left"}`}>
                      {fmtTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3">
          <p className="font-mono text-[9px] text-muted-foreground/60">
            Started {fmtDate(chat.created_at)} · {chat.status}
            {chat.is_reported && <span className="ml-2 text-destructive">⚠ Reported</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Chat list section ───────────────────────────────────────────── */
function UserChatsSection({ userId, token }: { userId: string; token: string }) {
  const [search, setSearch] = React.useState("");
  const [viewingChat, setViewingChat] = React.useState<RequestChatRecord | null>(null);

  const { data: chats = [], isLoading, isError } = useQuery({
    queryKey: ["admin-user-chats", userId],
    queryFn: () => getAdminUserChats(token, userId),
    enabled: Boolean(token && userId),
    staleTime: 30_000,
  });

  const filtered = chats.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.category.includes(search.toLowerCase()),
  );

  const totalFinals = chats.reduce((acc, c) => acc + c.messages.filter((m) => m.metadata?.is_final).length, 0);

  return (
    <>
      <div className="border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-[13px] font-semibold text-foreground">Chat history</h2>
            {!isLoading && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {chats.length} conversation{chats.length !== 1 ? "s" : ""}
                {totalFinals > 0 && ` · ${totalFinals} prompt${totalFinals !== 1 ? "s" : ""} generated`}
              </p>
            )}
          </div>
          {chats.length > 0 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text" placeholder="Search chats…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-44 border border-border bg-background py-1.5 pl-8 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-px p-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : isError ? (
          <p className="px-5 py-6 text-[12px] text-muted-foreground">Failed to load chat history.</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquare className="size-7 text-muted-foreground/20" />
            <p className="text-[12px] text-muted-foreground">{chats.length === 0 ? "No chats yet." : "No results for your search."}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((chat) => {
              const finals = chat.messages.filter((m) => m.metadata?.is_final);
              const lastMsg = chat.messages.at(-1);
              const catColor = CATEGORY_COLORS[chat.category] ?? "bg-muted text-muted-foreground";

              return (
                <button
                  key={chat.id}
                  onClick={() => setViewingChat(chat)}
                  className="group w-full px-5 py-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-foreground">{chat.title}</p>
                        {chat.is_reported && (
                          <span className="font-mono text-[8px] uppercase tracking-wider text-destructive">⚠ reported</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${catColor}`}>{chat.category}</span>
                        {finals.length > 0 && (
                          <span className="flex items-center gap-0.5 font-mono text-[9px] text-primary/70">
                            <Layers className="size-2.5" />{finals.length}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60">
                          <Clock className="size-2.5" />{fmtTime(chat.created_at)}
                        </span>
                      </div>
                      {lastMsg && (
                        <p className="mt-1 truncate text-[10px] text-muted-foreground/50">{lastMsg.content.slice(0, 80)}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                      <span className="font-mono text-[9px] text-muted-foreground/50">{chat.messages.length} msg</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {viewingChat && (
        <ChatViewer chat={viewingChat} onClose={() => setViewingChat(null)} />
      )}
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const qc = useQueryClient();
  const [showGrant, setShowGrant] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"details" | "chats">("details");

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => getAdminUser(token, id),
    enabled: Boolean(token && id),
  });

  const toggleMutation = useMutation({
    mutationFn: () => toggleUserStatus(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-user", id] }),
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex flex-col items-center gap-4 p-16 text-center">
        <XCircle className="size-10 text-destructive/50" />
        <p className="text-[14px] text-muted-foreground">User not found.</p>
        <Link href="/admin/dashboard/users" className="text-[13px] text-foreground underline">Back to users</Link>
      </div>
    );
  }

  const isActive = user.is_active;
  const isVerified = user.is_verified;
  const isPro = user.subscription_status === "active";

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <Link href="/admin/dashboard/users" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="size-3" />Users
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-foreground">{user.full_name ?? user.email.split("@")[0]}</span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">

        {/* Profile header */}
        <div className="flex flex-col gap-5 border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex size-16 shrink-0 items-center justify-center text-xl font-bold ${avatarColor(user.id)}`}>
              {initials(user)}
            </div>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">{user.full_name ?? "—"}</h1>
              <p className="text-[13px] text-muted-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  <span className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                  {isActive ? "Active" : "Inactive"}
                </span>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-400">
                    <BadgeCheck className="size-2.5" /> Verified
                  </span>
                )}
                {isPro && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                    <Zap className="size-2.5" /> Pro
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowGrant(true)}
              className="flex items-center gap-1.5 border border-border bg-background px-4 py-2 text-[12px] font-medium text-foreground hover:bg-muted">
              <Zap className="size-3.5" />Grant credits
            </button>
            <button onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}
              className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80 disabled:opacity-50 ${isActive ? "border border-destructive/30 bg-destructive/10 text-destructive" : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}>
              {isActive ? <Ban className="size-3.5" /> : <CheckCircle className="size-3.5" />}
              {toggleMutation.isPending ? "Saving…" : isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 border border-border bg-card sm:grid-cols-4">
          {[
            { icon: BarChart2,  label: "Total prompts", value: user.prompt_generation_count ?? 0,  color: "text-primary" },
            { icon: RefreshCw, label: "This month",     value: user.monthly_generation_count ?? 0, color: "text-sky-400" },
            { icon: CreditCard, label: "Plan",          value: isPro ? "Pro" : "Free",              color: "text-amber-400" },
            { icon: ShieldCheck, label: "Role",         value: user.role === "SUPER_ADMIN" ? "Admin" : "User", color: "text-violet-400" },
          ].map(({ icon: Icon, label, value, color }, i, arr) => (
            <div key={label} className={`flex flex-col gap-1 p-5 ${i < arr.length - 1 ? "border-r border-border" : ""}`}>
              <Icon className={`size-4 ${color}`} />
              <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(["details", "chats"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {tab === "details" ? "Account Details" : "Chat History"}
            </button>
          ))}
        </div>

        {/* Tab: Account details */}
        {activeTab === "details" && (
          <div className="border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-[13px] font-semibold text-foreground">Account details</h2>
            </div>
            <div className="px-6">
              <DetailRow label="User ID">
                <span className="font-mono text-[11px] text-muted-foreground">{user.id}</span>
              </DetailRow>
              <DetailRow label="Email">
                <a href={`mailto:${user.email}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Mail className="size-3.5" />{user.email}
                </a>
              </DetailRow>
              <DetailRow label="Joined">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />{fmtDate(user.created_at)}
                </div>
              </DetailRow>
              <DetailRow label="Email verified">
                {isVerified
                  ? <span className="flex items-center gap-1 text-emerald-400"><BadgeCheck className="size-3.5" /> Yes</span>
                  : <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="size-3.5" /> No</span>}
              </DetailRow>
              <DetailRow label="Account status">
                {isActive
                  ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="size-3.5" /> Active</span>
                  : <span className="flex items-center gap-1 text-destructive"><Ban className="size-3.5" /> Inactive</span>}
              </DetailRow>
              <DetailRow label="Subscription">
                <span className={isPro ? "text-primary" : "text-muted-foreground"}>
                  {user.subscription_status ? user.subscription_status.replace("_", " ") : "Free"}
                </span>
              </DetailRow>
              <DetailRow label="Plan ID">
                <span className="font-mono text-[11px] text-muted-foreground">{user.current_plan_id ?? "—"}</span>
              </DetailRow>
            </div>
          </div>
        )}

        {/* Tab: Chat history */}
        {activeTab === "chats" && (
          <UserChatsSection userId={user.id} token={token} />
        )}

      </div>

      {showGrant && user && (
        <GrantCreditsModal user={user} token={token} onClose={() => setShowGrant(false)} />
      )}
    </div>
  );
}
