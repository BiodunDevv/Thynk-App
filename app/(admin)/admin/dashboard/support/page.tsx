"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, ChevronRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminTickets,
  replyToTicket,
  updateTicketStatus,
  updateTicketPriority,
  type SupportTicket,
} from "@/lib/api/admin";
import { useAdminSession } from "@/lib/auth/admin-session";

const STATUS_COLORS: Record<string, string> = {
  open: "text-emerald-500 bg-emerald-500/10",
  pending_user: "text-orange-400 bg-orange-400/10",
  resolved: "text-muted-foreground bg-muted",
  closed: "text-muted-foreground/50 bg-muted",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-orange-400",
  high: "text-destructive",
  urgent: "text-destructive font-bold",
};

function TicketDrawer({
  ticket,
  token,
  onClose,
}: {
  ticket: SupportTicket;
  token: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = React.useState("");

  const replyMutation = useMutation({
    mutationFn: () => replyToTicket(token, ticket.id, reply),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateTicketStatus(token, ticket.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: string) => updateTicketPriority(token, ticket.id, priority),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-tickets"] }),
  });

  const publicMessages = ticket.messages.filter((m) => !m.is_internal);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Ticket #{ticket.id.slice(-6).toUpperCase()}
            </p>
            <button onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">
              Close
            </button>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold text-foreground">{ticket.subject}</h3>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              defaultValue={ticket.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              className="border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {["open", "pending_user", "resolved", "closed"].map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
            <select
              defaultValue={ticket.priority}
              onChange={(e) => priorityMutation.mutate(e.target.value)}
              className="border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
          {publicMessages.length === 0 && (
            <p className="text-[13px] text-muted-foreground">No messages yet.</p>
          )}
          {publicMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={[
                  "max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed",
                  msg.sender_type === "admin"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground",
                ].join(" ")}
              >
                {msg.message}
                <p className="mt-1 text-[10px] opacity-50">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        <div className="border-t border-border p-4 space-y-2">
          <textarea
            placeholder="Type your reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            className="w-full resize-none border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {replyMutation.isError && (
            <p className="text-[12px] text-destructive">Failed to send reply.</p>
          )}
          <button
            onClick={() => replyMutation.mutate()}
            disabled={replyMutation.isPending || !reply.trim()}
            className="flex w-full items-center justify-center gap-1.5 bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {replyMutation.isPending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const session = useAdminSession();
  const token = session?.tokens.access_token ?? "";
  const [selected, setSelected] = React.useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("all");

  const { data: tickets = [], isLoading, isError } = useQuery({
    queryKey: ["admin-tickets", token],
    queryFn: () => getAdminTickets(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const filtered = tickets.filter((t) => statusFilter === "all" || t.status === statusFilter);

  return (
    <div className="px-6 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Admin · Support
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Support tickets
          </h1>
        </div>
        <div className="flex gap-1">
          {["all", "open", "pending_user", "resolved", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                "border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
                statusFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="border border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 border-b border-border px-5 py-4 last:border-b-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          Failed to load tickets.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="border border-border">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
                <MessageSquare className="size-8 text-muted-foreground/30" />
                <p className="text-[13px] text-muted-foreground">No tickets in this category.</p>
              </div>
            )}
            {filtered.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className="flex w-full items-center gap-4 border-b border-border px-5 py-4 text-left last:border-b-0 hover:bg-muted/10 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{ticket.subject}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 ${STATUS_COLORS[ticket.status] ?? "text-muted-foreground bg-muted"}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${PRIORITY_COLORS[ticket.priority] ?? "text-muted-foreground"}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(ticket.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </>
      )}

      {selected && (
        <TicketDrawer ticket={selected} token={token} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
