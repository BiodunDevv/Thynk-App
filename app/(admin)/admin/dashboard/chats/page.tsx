"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight, MessageSquare } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminChats, type RequestChat } from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

function ChatDrawer({ chat, onClose }: { chat: RequestChat; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {chat.category} · {chat.status}
            </p>
            <button onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold text-foreground">{chat.title}</h3>
          {chat.is_reported && (
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-destructive">
              <AlertTriangle className="size-3.5" />
              This chat has been reported
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
          {chat.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={[
                  "max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground",
                ].join(" ")}
              >
                <p className="font-mono text-[9px] uppercase tracking-wider opacity-50 mb-1">
                  {msg.role}
                </p>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminChatsPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const [selected, setSelected] = React.useState<RequestChat | null>(null);
  const [filter, setFilter] = React.useState<"all" | "reported">("all");

  const { data: chats = [], isLoading, isError } = useQuery({
    queryKey: ["admin-chats", token],
    queryFn: () => getAdminChats(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const filtered = filter === "reported" ? chats.filter((c) => c.is_reported) : chats;

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Admin · Chats
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Request chats
          </h1>
        </div>
        <div className="flex gap-1">
          {(["all", "reported"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              {f === "all" ? "All chats" : "Reported"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="border border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-b border-border px-5 py-4 last:border-b-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load chats.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {filtered.length} chat{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="border border-border">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
                <MessageSquare className="size-8 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">
                  {filter === "reported" ? "No reported chats." : "No chats yet."}
                </p>
              </div>
            )}
            {filtered.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelected(chat)}
                className="flex w-full items-center gap-4 border-b border-border px-5 py-4 text-left last:border-b-0 hover:bg-muted/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {chat.is_reported && <AlertTriangle className="size-3.5 shrink-0 text-destructive" />}
                    <p className="truncate text-[13px] font-medium text-foreground">{chat.title}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {chat.category}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                      {chat.messages.length} msg{chat.messages.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(chat.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </>
      )}

      {selected && <ChatDrawer chat={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
