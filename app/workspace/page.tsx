"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Send, Download, Copy, ChevronRight,
  RefreshCw, ChevronDown, ChevronUp, History,
  Sparkles, ArrowRight,
} from "lucide-react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { SiteHeader } from "@/components/marketing/site-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/lib/auth/session";
import { getAccessToken } from "@/lib/auth/session";
import {
  getMyRequestChats,
  createRequestChat,
  addMessageToChat,
  generateFinalPrompt,
  regenerateFinalPrompt,
  type RequestChatRecord,
} from "@/lib/api/chats";

// ── Thinking indicator ───────────────────────────────────────────
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 0.2, 0.4].map((delay, i) => (
          <span
            key={i}
            className="block size-2 rounded-full bg-primary"
            style={{ animation: `thynk-pulse 1.2s ease-in-out ${delay}s infinite` }}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        Thynk is thinking…
      </span>
      <style>{`
        @keyframes thynk-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Variation hints ──────────────────────────────────────────────
const VARIATION_HINTS = [
  { label: "More concise",     value: "Make it significantly shorter and more direct." },
  { label: "More detailed",    value: "Expand with more context, examples, and nuance." },
  { label: "Different tone",   value: "Reframe with a fresh tone — different register and voice." },
  { label: "Step-by-step",     value: "Structure it as a clear numbered step-by-step process." },
  { label: "Creative angle",   value: "Take a more creative and unconventional approach." },
  { label: "Technical depth",  value: "Add technical precision, terminology, and specificity." },
];

// ── Final prompt card ─────────────────────────────────────────────
interface FinalPromptCardProps {
  content: string;
  version: number;
  totalVersions: number;
  variationHint?: string;
  isLatest: boolean;
  onRegenerate: (hint?: string) => void;
  isRegenerating: boolean;
  onViewVersion: (direction: "prev" | "next") => void;
}

function FinalPromptCard({
  content,
  version,
  totalVersions,
  variationHint,
  isLatest,
  onRegenerate,
  isRegenerating,
  onViewVersion,
}: FinalPromptCardProps) {
  const [showRaw, setShowRaw] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showRegenPanel, setShowRegenPanel] = React.useState(false);
  const [customHint, setCustomHint] = React.useState("");
  const [selectedHint, setSelectedHint] = React.useState<string | null>(null);

  function handleCopy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thynk-prompt-v${version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRegenerateSubmit() {
    const hint = customHint.trim() || selectedHint || undefined;
    onRegenerate(hint);
    setShowRegenPanel(false);
    setCustomHint("");
    setSelectedHint(null);
  }

  return (
    <div className="w-full border border-primary/30 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-primary">
            Generated Prompt
          </span>
          {/* Version badge */}
          {totalVersions > 1 && (
            <div className="flex items-center gap-1 border border-border bg-background px-2 py-0.5">
              <History className="size-2.5 text-muted-foreground" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                v{version}/{totalVersions}
              </span>
              <div className="ml-0.5 flex items-center gap-0.5">
                <button
                  disabled={version <= 1}
                  onClick={() => onViewVersion("prev")}
                  className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3" />
                </button>
                <button
                  disabled={version >= totalVersions}
                  onClick={() => onViewVersion("next")}
                  className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3" />
                </button>
              </div>
            </div>
          )}
          {variationHint && (
            <span className="max-w-[180px] truncate font-mono text-[9px] italic text-muted-foreground/60">
              "{variationHint}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            {showRaw ? "Formatted" : "Raw"}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy className="size-3" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="size-3" />
            .md
          </button>
        </div>
      </div>

      {/* Content */}
      {showRaw ? (
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
          {content}
        </pre>
      ) : (
        <div className="p-4">
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-foreground">
            {content}
          </pre>
        </div>
      )}

      {/* Regenerate strip — only on latest version */}
      {isLatest && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowRegenPanel(!showRegenPanel)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`size-3 text-muted-foreground ${isRegenerating ? "animate-spin" : ""}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {isRegenerating ? "Regenerating…" : "Request new variation"}
              </span>
            </div>
            {showRegenPanel ? (
              <ChevronUp className="size-3.5 text-muted-foreground/40" />
            ) : (
              <ChevronDown className="size-3.5 text-muted-foreground/40" />
            )}
          </button>

          {showRegenPanel && !isRegenerating && (
            <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3">
              {/* Quick hint chips */}
              <p className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Direction (optional)
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {VARIATION_HINTS.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => setSelectedHint(selectedHint === h.value ? null : h.value)}
                    className={`border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                      selectedHint === h.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>

              {/* Custom hint input */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Or describe what to change…"
                  value={customHint}
                  onChange={(e) => setCustomHint(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegenerateSubmit()}
                  className="w-full border border-border bg-background px-3 py-2 font-sans text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] text-muted-foreground/50">
                  {totalVersions > 1 ? `${totalVersions} versions so far` : "First version"}
                </p>
                <button
                  onClick={handleRegenerateSubmit}
                  className="flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
                >
                  <Sparkles className="size-3" />
                  Generate
                  <ArrowRight className="size-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────
type FinalMessage = RequestChatRecord["messages"][number] & { _viewingVersion?: number };

function MessageBubble({
  message,
  allFinalMessages,
  viewingVersion,
  onViewVersion,
  onRegenerate,
  isRegenerating,
}: {
  message: FinalMessage;
  allFinalMessages: RequestChatRecord["messages"];
  viewingVersion: number;
  onViewVersion: (direction: "prev" | "next") => void;
  onRegenerate: (hint?: string) => void;
  isRegenerating: boolean;
}) {
  const isUser = message.role === "user";
  const isFinal = message.metadata?.is_final === true;
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isFinal) {
    const totalVersions = allFinalMessages.length;
    const version = (message.metadata?.version as number | undefined) ?? 1;
    const isLatest = viewingVersion === totalVersions;
    const variationHint = message.metadata?.variation_hint as string | undefined;

    return (
      <div className="w-full py-2">
        <FinalPromptCard
          content={message.content}
          version={viewingVersion}
          totalVersions={totalVersions}
          variationHint={variationHint || undefined}
          isLatest={isLatest}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating}
          onViewVersion={onViewVersion}
        />
        <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">{time}</p>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} py-1`}>
      <div className="max-w-[80%]">
        <div
          className={
            isUser
              ? "bg-primary text-primary-foreground px-4 py-2.5 text-[14px] leading-relaxed"
              : "border border-border bg-muted px-4 py-2.5 text-[14px] leading-relaxed text-foreground"
          }
        >
          {message.content}
        </div>
        <p className={`mt-1 font-mono text-[10px] text-muted-foreground ${isUser ? "text-right" : "text-left"}`}>
          {time}
        </p>
      </div>
    </div>
  );
}

// ── New chat modal ────────────────────────────────────────────────
const CATEGORIES = [
  "design", "development", "student", "content",
  "marketing", "writing", "business",
] as const;

function NewChatModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (chat: RequestChatRecord) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("design");
  const [message, setMessage] = React.useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return createRequestChat({ title: title || "Untitled Chat", category, message }, token);
    },
    onSuccess: (chat) => {
      onCreated(chat);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            New Chat
          </span>
          <button
            onClick={onClose}
            className="text-lg leading-none text-muted-foreground transition-colors hover:text-foreground"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Title
            </label>
            <input
              type="text"
              placeholder="My chat..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Opening message
            </label>
            <Textarea
              placeholder="Describe what you want to create..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[100px] resize-none border-border bg-background text-[14px] focus-visible:ring-1"
            />
          </div>
          {mutation.isError && (
            <p className="text-[12px] text-destructive">
              {(mutation.error as Error)?.message ?? "Something went wrong."}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!message.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Creating…" : "Start chat"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main workspace page ───────────────────────────────────────────
export default function WorkspacePage() {
  const session = useAuthSession();
  const router = useRouter();
  const { openAuthModal } = useAuthModal();
  const queryClient = useQueryClient();

  const [activeChatId, setActiveChatId] = React.useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [isThinking, setIsThinking] = React.useState(false);
  const [upgradeBanner, setUpgradeBanner] = React.useState(false);
  // Which version of the final prompt is currently displayed (1-indexed)
  const [viewingVersion, setViewingVersion] = React.useState(1);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (session === null) {
      openAuthModal("sign-in");
      router.push("/");
    }
  }, [session, router, openAuthModal]);

  const accessToken = session?.tokens.access_token ?? "";

  const { data: chats = [], refetch: refetchChats } = useQuery({
    queryKey: ["request-chats"],
    queryFn: () => getMyRequestChats(accessToken),
    enabled: Boolean(accessToken),
  });

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  // All final-prompt messages in the active chat, sorted chronologically
  const finalMessages = React.useMemo(
    () => (activeChat?.messages ?? []).filter((m) => m.metadata?.is_final === true),
    [activeChat],
  );

  // Jump to latest version when a new one is added
  React.useEffect(() => {
    if (finalMessages.length > 0) setViewingVersion(finalMessages.length);
  }, [finalMessages.length]);

  // The final message currently being displayed
  const displayedFinalMessage = finalMessages[viewingVersion - 1] ?? null;

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, isThinking]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChatId) throw new Error("No active chat");
      return addMessageToChat(activeChatId, content, accessToken);
    },
    onMutate: () => setIsThinking(true),
    onSuccess: (updatedChat) => {
      setIsThinking(false);
      queryClient.setQueryData(["request-chats"], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat],
      );
    },
    onError: (err: unknown) => {
      setIsThinking(false);
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 403) setUpgradeBanner(true);
    },
  });

  const generateFinalMutation = useMutation({
    mutationFn: () => {
      if (!activeChatId) throw new Error("No active chat");
      return generateFinalPrompt(activeChatId, accessToken);
    },
    onMutate: () => setIsThinking(true),
    onSuccess: (updatedChat) => {
      setIsThinking(false);
      queryClient.setQueryData(["request-chats"], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat],
      );
    },
    onError: (err: unknown) => {
      setIsThinking(false);
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 403) setUpgradeBanner(true);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (variationHint?: string) => {
      if (!activeChatId) throw new Error("No active chat");
      return regenerateFinalPrompt(activeChatId, accessToken, variationHint);
    },
    onMutate: () => setIsThinking(true),
    onSuccess: (updatedChat) => {
      setIsThinking(false);
      queryClient.setQueryData(["request-chats"], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat],
      );
    },
    onError: (err: unknown) => {
      setIsThinking(false);
      const status = (err as { status?: number })?.status;
      if (status === 429 || status === 403) setUpgradeBanner(true);
    },
  });

  function handleViewVersion(direction: "prev" | "next") {
    setViewingVersion((v) =>
      direction === "prev" ? Math.max(1, v - 1) : Math.min(finalMessages.length, v + 1),
    );
  }

  function handleSend() {
    const content = inputValue.trim();
    if (!content || isThinking) return;
    setInputValue("");
    sendMessageMutation.mutate(content);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  if (session === null) return null;

  const showGenerateButton = (activeChat?.messages.length ?? 0) >= 3;
  const hasFinalPrompt = finalMessages.length > 0;

  // Build the message list, replacing all final-prompt messages with a single displayed one
  const displayMessages = React.useMemo(() => {
    if (!activeChat) return [];
    const seen = new Set<string>();
    return activeChat.messages.filter((m) => {
      if (!m.metadata?.is_final) return true;
      // Keep only the one we want to display
      if (seen.size === 0 && m === displayedFinalMessage) {
        seen.add(m.id);
        return true;
      }
      return false;
    });
  }, [activeChat, displayedFinalMessage]);

  return (
    <div className="flex h-screen flex-col">
      <SiteHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-card md:flex">
          <div className="border-b border-border p-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-[12px]"
              onClick={() => setShowNewChatModal(true)}
            >
              <Plus className="size-3.5" />
              New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.length === 0 ? (
              <p className="p-4 text-center text-[12px] text-muted-foreground">No chats yet.</p>
            ) : (
              chats.map((chat) => {
                const chatFinals = chat.messages.filter((m) => m.metadata?.is_final);
                return (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`group w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      chat.id === activeChatId ? "bg-muted" : ""
                    }`}
                  >
                    <p className="truncate text-[13px] font-medium text-foreground">{chat.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {chat.category}
                      </span>
                      {chatFinals.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-primary/70">
                          <Sparkles className="size-2.5" />
                          {chatFinals.length}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            {activeChat ? (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-[14px] font-semibold text-foreground">{activeChat.title}</h1>
                  <span className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {activeChat.category}
                  </span>
                  {hasFinalPrompt && (
                    <span className="flex items-center gap-1 border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                      <Sparkles className="size-2.5" />
                      {finalMessages.length} version{finalMessages.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden text-[12px]"
                    onClick={() => setShowNewChatModal(true)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  {showGenerateButton && !hasFinalPrompt && (
                    <Button
                      size="sm"
                      className="text-[12px]"
                      disabled={generateFinalMutation.isPending || isThinking}
                      onClick={() => generateFinalMutation.mutate()}
                    >
                      {generateFinalMutation.isPending ? "Generating…" : "Generate Final Prompt"}
                      <ChevronRight className="ml-1 size-3.5" />
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-muted-foreground">Workspace</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 text-[12px]"
                  onClick={() => setShowNewChatModal(true)}
                >
                  <Plus className="size-3.5 mr-1" />
                  New chat
                </Button>
              </div>
            )}
          </div>

          {/* Upgrade banner */}
          {upgradeBanner && (
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3">
              <p className="text-[13px] text-foreground">
                You&apos;ve used all 5 free generations today. Upgrade to Pro for 2,500/month.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="default" className="text-[12px]" onClick={() => router.push("/pricing")}>
                  Upgrade
                </Button>
                <button
                  onClick={() => setUpgradeBanner(false)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8">
            {!activeChat ? (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <p className="text-[15px] text-muted-foreground">
                  Select a chat or start a new one
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowNewChatModal(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  New chat
                </Button>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-1">
                {displayMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    allFinalMessages={finalMessages}
                    viewingVersion={viewingVersion}
                    onViewVersion={handleViewVersion}
                    onRegenerate={(hint) => regenerateMutation.mutate(hint)}
                    isRegenerating={regenerateMutation.isPending}
                  />
                ))}
                {isThinking && <ThinkingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          {activeChat && (
            <div className="border-t border-border bg-card px-4 py-3 md:px-8">
              <div className="mx-auto max-w-2xl">
                <div className="relative border border-border bg-background">
                  <Textarea
                    placeholder="Type your message… (⌘+Enter to send)"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isThinking}
                    className="min-h-[72px] resize-none border-0 bg-transparent pr-14 text-[14px] leading-relaxed shadow-none focus-visible:ring-0"
                  />
                  <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isThinking}
                      className="flex size-8 items-center justify-center bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      <Send className="size-3.5" />
                    </button>
                    <span className="font-mono text-[9px] text-muted-foreground/60">
                      {inputValue.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onCreated={(chat) => {
            queryClient.setQueryData(["request-chats"], (old: RequestChatRecord[] | undefined) =>
              old ? [chat, ...old] : [chat],
            );
            setActiveChatId(chat.id);
            setShowNewChatModal(false);
            refetchChats();
          }}
        />
      )}
    </div>
  );
}
