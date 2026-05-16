"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  X, Heart, Copy, Check, ArrowRight, Search,
  Clock, Layers, ExternalLink, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthSession } from "@/lib/auth/session";
import {
  getMyRequestChats,
  toggleFavoriteChat,
  type RequestChatRecord,
} from "@/lib/api/chats";

/* ── Category colour map ─────────────────────────────────────────── */
const CAT_COLOR: Record<string, string> = {
  design:      "text-violet-400 bg-violet-500/10 border-violet-500/20",
  development: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  student:     "text-amber-400 bg-amber-500/10 border-amber-500/20",
  content:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  marketing:   "text-pink-400 bg-pink-500/10 border-pink-500/20",
  writing:     "text-orange-400 bg-orange-500/10 border-orange-500/20",
  business:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

function catColor(category: string) {
  return CAT_COLOR[category] ?? "text-muted-foreground bg-muted border-border";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ── Prompt card ─────────────────────────────────────────────────── */
function PromptCard({
  chat,
  onOpen,
  onUnfavorite,
}: {
  chat: RequestChatRecord;
  onOpen: () => void;
  onUnfavorite: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const finalMessages = chat.messages.filter((m) => m.metadata?.is_final === true);
  const latestFinal = finalMessages[finalMessages.length - 1];

  function handleCopy() {
    if (!latestFinal) return;
    navigator.clipboard.writeText(latestFinal.content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group border border-border bg-card transition-colors hover:border-border/80 hover:bg-muted/30">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${catColor(chat.category)}`}>
              {chat.category}
            </span>
            {finalMessages.length > 0 && (
              <span className="flex items-center gap-0.5 font-mono text-[8px] text-muted-foreground/50">
                <Layers className="size-2.5" />
                {finalMessages.length} version{finalMessages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="truncate text-[13px] font-medium text-foreground">{chat.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {latestFinal && (
            <button
              onClick={handleCopy}
              title="Copy latest prompt"
              className="flex size-6 items-center justify-center text-muted-foreground/40 transition-colors hover:text-foreground"
            >
              {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
            </button>
          )}
          <button
            onClick={onUnfavorite}
            title="Remove from saved"
            className="flex size-6 items-center justify-center text-rose-500/60 transition-colors hover:text-rose-500"
          >
            <Heart className="size-3.5 fill-rose-500/60 hover:fill-rose-500" />
          </button>
        </div>
      </div>

      {/* Preview of latest prompt */}
      {latestFinal ? (
        <div className="mx-4 mb-3 overflow-hidden border border-border/60 bg-background px-3 py-2.5">
          <p className="line-clamp-3 text-[11.5px] leading-relaxed text-muted-foreground">
            {latestFinal.content}
          </p>
        </div>
      ) : (
        <div className="mx-4 mb-3 flex items-center gap-2 border border-dashed border-border px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground/40 italic">No prompt generated yet</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 px-4 py-2">
        <div className="flex items-center gap-1 text-muted-foreground/40">
          <Clock className="size-2.5" />
          <span className="font-mono text-[9px]">{timeAgo(chat.updated_at ?? chat.created_at)}</span>
        </div>
        <button
          onClick={onOpen}
          className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open workspace <ExternalLink className="size-2.5" />
        </button>
      </div>
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────── */
export function SavedPromptsPanel({ onClose }: { onClose: () => void }) {
  const session = useAuthSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const accessToken = session?.tokens.access_token ?? "";

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["request-chats"],
    queryFn: () => getMyRequestChats(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 30_000,
  });

  const unfavoriteMutation = useMutation({
    mutationFn: (chatId: string) => toggleFavoriteChat(chatId, accessToken),
    onSuccess: (updated) => {
      queryClient.setQueryData(["request-chats"], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updated.id ? updated : c)) : [updated],
      );
      toast.success("Removed from saved");
    },
  });

  const favorited = chats.filter((c) => c.is_favorite);
  const filtered = favorited.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.title.toLowerCase().includes(q);
  });

  /* Close on Escape */
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="size-3.5 fill-rose-500 text-rose-500" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Saved Prompts
              </span>
            </div>
            <p className="mt-0.5 text-[15px] font-semibold text-foreground">
              {favorited.length} saved workspace{favorited.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        {favorited.length > 0 && (
          <div className="border-b border-border px-5 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Search saved prompts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-border bg-background py-2 pl-9 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 animate-pulse border border-border bg-muted/20" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex size-14 items-center justify-center border border-dashed border-border bg-muted/30">
                <Inbox className="size-6 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground">
                  {search ? "No results" : "Nothing saved yet"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {search
                    ? "Try a different search term"
                    : "Generate a prompt in your workspace and hit the heart icon to save it here."}
                </p>
              </div>
              {!search && (
                <button
                  onClick={() => { onClose(); router.push("/workspace"); }}
                  className="flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
                >
                  Open workspace <ArrowRight className="size-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {filtered.map((chat) => (
                <PromptCard
                  key={chat.id}
                  chat={chat}
                  onOpen={() => {
                    onClose();
                    router.push(`/workspace?chat=${chat.id}`);
                  }}
                  onUnfavorite={() => unfavoriteMutation.mutate(chat.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="border-t border-border px-5 py-3">
            <button
              onClick={() => { onClose(); router.push("/workspace"); }}
              className="flex w-full items-center justify-center gap-2 border border-border bg-background py-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Layers className="size-3" />
              Open workspace
            </button>
          </div>
        )}
      </div>
    </>
  );
}
