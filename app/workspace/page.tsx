"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send, Download, Copy, ChevronRight,
  RefreshCw, ChevronDown, ChevronUp, History,
  ArrowRight, Zap, Clock, ImagePlus,
  MessageSquare, ArrowLeft, X, Search, Plus,
  Heart, Check, CornerDownRight, BookOpen, Layers, Trash2, Brain, Maximize2, Minimize2,
} from "lucide-react";

import { toast } from "sonner";

import { SiteHeader } from "@/components/marketing/site-header";
import { useAuthSession, getAccessToken } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/api/users";
import { getPlans } from "@/lib/api/plans";
import { getTemplates } from "@/lib/api/templates";
import {
  getMyRequestChats,
  createRequestChat,
  addMessageToChat,
  clearRequestChats,
  deleteRequestChat,
  generateFinalPrompt,
  regenerateFinalPrompt,
  toggleFavoriteChat,
  type ClarificationPayload,
  type ClarificationQuestion,
  type PromptStep,
  type RequestChatRecord,
  type RequestChatMessageMetadata,
} from "@/lib/api/chats";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ═══════════════════════════════════════════════════════════════════
   THINKING INDICATOR
═══════════════════════════════════════════════════════════════════ */
const THINKING_LABELS = [
  "Synthesizing context",
  "Distilling intent",
  "Triangulating concepts",
  "Crystallising structure",
  "Extrapolating nuance",
  "Orchestrating semantics",
  "Disambiguating scope",
  "Architecting response",
];

function ThinkingIndicator() {
  const [labelIdx, setLabelIdx] = React.useState(() =>
    Math.floor(Math.random() * THINKING_LABELS.length),
  );
  const [fade, setFade] = React.useState(true);

  React.useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setLabelIdx((i) => (i + 1) % THINKING_LABELS.length);
        setFade(true);
      }, 200);
    }, 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex items-center gap-3 border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-1">
        {[0, 0.18, 0.36].map((delay, i) => (
          <span
            key={i}
            className="block size-1.5 rounded-full bg-primary/70"
            style={{ animation: `thynk-think 1.1s ease-in-out ${delay}s infinite` }}
          />
        ))}
      </div>
      <Zap className="size-3 text-primary" style={{ animation: "thynk-pulse 2s ease-in-out infinite" }} />
      <span
        className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-opacity duration-200"
        style={{ opacity: fade ? 1 : 0 }}
      >
        Thynking — {THINKING_LABELS[labelIdx]}
      </span>
      <style>{`
        @keyframes thynk-think {
          0%,100%{opacity:.15;transform:translateY(0)}
          50%{opacity:1;transform:translateY(-3px)}
        }
        @keyframes thynk-pulse {
          0%,100%{opacity:0.5}
          50%{opacity:1}
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   VARIATION HINTS
═══════════════════════════════════════════════════════════════════ */
const VARIATION_HINTS = [
  { label: "More concise",    value: "Make it significantly shorter and more direct." },
  { label: "More detailed",   value: "Expand with more context, examples, and nuance." },
  { label: "Different tone",  value: "Reframe with a fresh tone — different register and voice." },
  { label: "Step-by-step",   value: "Structure it as a clear numbered step-by-step process." },
  { label: "Creative angle",  value: "Take a more creative and unconventional approach." },
  { label: "Technical depth", value: "Add technical precision, terminology, and specificity." },
];

function parsePromptDocumentSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const promptMatch = normalized.match(/## Prompt\s*([\s\S]*?)(?=\n## |\s*$)/i);
  const whyMatch = normalized.match(/## Why this works\s*([\s\S]*?)(?=\n## |\s*$)/i);
  const bestUsedMatch = normalized.match(/## Best used with\s*([\s\S]*?)(?=\n## |\s*$)/i);

  return {
    prompt: promptMatch?.[1]?.trim() ?? normalized,
    why: whyMatch?.[1]?.trim() ?? "",
    bestUsedWith: bestUsedMatch?.[1]?.trim() ?? "",
    raw: normalized,
  };
}

function normalizeRenderedText(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^###\s*/gm, "")
    .replace(/^##\s*/gm, "")
    .replace(/^#\s*/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseStructuredAnswerSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  const answerMatch = normalized.match(/## Answer\s*([\s\S]*?)(?=\n## |\s*$)/i);
  const whyMatch = normalized.match(/## Why\s*([\s\S]*?)(?=\n## |\s*$)/i);
  const nextStepMatch = normalized.match(/## Suggested next step\s*([\s\S]*?)(?=\n## |\s*$)/i);

  return {
    answer: normalizeRenderedText(answerMatch?.[1] ?? normalized),
    why: normalizeRenderedText(whyMatch?.[1] ?? ""),
    nextStep: normalizeRenderedText(nextStepMatch?.[1] ?? ""),
  };
}

type ContentSegment =
  | { type: "text"; value: string }
  | { type: "code"; value: string; language: string };

function looksLikeCodeLine(line: string) {
  const value = line.trim();
  if (!value) return false;

  return (
    /^<!DOCTYPE/i.test(value)
    || /^<html[\s>]/i.test(value)
    || /^<\/?[a-z][\w:-]*(\s|>|$)/i.test(value)
    || /^(import|export|const|let|var|function|class|interface|type)\b/.test(value)
    || /^(body|html|nav|main|section|article|header|footer|form|button|input|textarea|\.|#)[\w\s\-.:#[\]="'(),>+~]*\{/.test(value)
    || /^@[a-z-]+/i.test(value)
    || /=>\s*\{?$/.test(value)
  );
}

function inferCodeLanguage(value: string) {
  const trimmed = value.trim();
  if (/^<!DOCTYPE/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) return "html";
  if (/(^|\n)\s*(body|html|nav|main|section|article|header|footer|form|button|input|textarea)[^{\n]*\{/.test(trimmed)) return "css";
  if (/(^|\n)\s*import\s.+from\s+["']/.test(trimmed) || /:\s*(string|number|boolean|React\.)/.test(trimmed)) return "tsx";
  if (/(^|\n)\s*(const|let|var|function)\s+/.test(trimmed) || /=>/.test(trimmed)) return "javascript";
  return "code";
}

function splitInlineCodeTail(content: string): ContentSegment[] | null {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return null;

  const lines = normalized.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const remaining = lines.slice(index);
    if (remaining.length < 4) continue;
    if (!looksLikeCodeLine(remaining[0])) continue;

    const codeBlock = remaining.join("\n").trim();
    const codeIndicators = (codeBlock.match(/[{};]/g) ?? []).length;
    const markupIndicators = (codeBlock.match(/<\/?[a-z]/gi) ?? []).length;
    const signalLines = remaining.filter((line) => looksLikeCodeLine(line)).length;
    if (signalLines < 3 || (codeIndicators < 4 && markupIndicators < 4)) continue;

    const intro = lines.slice(0, index).join("\n").trim();
    return [
      ...(intro ? [{ type: "text", value: intro } satisfies ContentSegment] : []),
      { type: "code", value: codeBlock, language: inferCodeLanguage(codeBlock) },
    ];
  }

  return null;
}

function splitContentSegments(content: string): ContentSegment[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const segments: ContentSegment[] = [];
  const codeBlockPattern = /```([\w-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockPattern.exec(normalized)) !== null) {
    const preceding = normalized.slice(lastIndex, match.index).trim();
    if (preceding) {
      segments.push({ type: "text", value: preceding });
    }
    segments.push({
      type: "code",
      language: (match[1] || "").trim(),
      value: match[2].replace(/\n$/, ""),
    });
    lastIndex = match.index + match[0].length;
  }

  const trailing = normalized.slice(lastIndex).trim();
  if (trailing) {
    segments.push({ type: "text", value: trailing });
  }

  if (segments.length === 1 && segments[0]?.type === "text") {
    return splitInlineCodeTail(segments[0].value) ?? segments;
  }

  if (segments.length === 0) {
    return splitInlineCodeTail(normalized) ?? segments;
  }

  return segments;
}

function renderRichTextBlock(content: string) {
  const lines = normalizeRenderedText(content).split("\n");
  const blocks: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let currentList: string[] = [];

  const flushParagraph = () => {
    if (!currentParagraph.length) return;
    blocks.push(
      <p key={`p-${blocks.length}`} className="text-[14px] leading-relaxed text-foreground">
        {currentParagraph.join(" ")}
      </p>,
    );
    currentParagraph = [];
  };

  const flushList = () => {
    if (!currentList.length) return;
    blocks.push(
      <ul key={`l-${blocks.length}`} className="space-y-2">
        {currentList.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-[14px] leading-relaxed text-foreground">
            <span className="mt-[7px] size-1 shrink-0 bg-primary/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>,
    );
    currentList = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-•]\s+(.*)$/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (bulletMatch || numberedMatch) {
      flushParagraph();
      currentList.push((bulletMatch?.[1] ?? numberedMatch?.[1] ?? "").trim());
      continue;
    }

    if (currentList.length) {
      flushList();
    }
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}

function renderMessageContent(content: string) {
  const segments = splitContentSegments(content);
  if (!segments.length) {
    return renderRichTextBlock(content);
  }

  return (
    <div className="space-y-4">
      {segments.map((segment, index) => {
        if (segment.type === "code") {
          return <CodeBlock key={index} code={segment.value} language={segment.language} />;
        }

        return <div key={index}>{renderRichTextBlock(segment.value)}</div>;
      })}
    </div>
  );
}

function MessageCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 border border-border bg-card px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
      title="Copy message"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function getPromptVersionLabel(
  message: RequestChatRecord["messages"][number] | undefined,
  version: number,
  totalVersions: number,
) {
  const variationHint = typeof message?.metadata?.variation_hint === "string"
    ? message.metadata.variation_hint.trim()
    : "";

  if (variationHint) {
    return totalVersions > 1
      ? `Prompt ${version} · ${variationHint}`
      : variationHint;
  }

  if (totalVersions <= 1) return "Current prompt";
  if (version === totalVersions) return `Prompt ${version} · Latest`;
  return `Prompt ${version}`;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = React.useState(false);
  const lines = React.useMemo(() => code.split("\n"), [code]);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="overflow-hidden border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border bg-muted/45 px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
          </div>
          <span className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
            {language || "Code"}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex shrink-0 items-center gap-1 border border-border bg-card px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          title="Copy code"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="overflow-x-auto bg-background">
        <div className="grid min-w-full grid-cols-[auto,1fr]">
          <div className="select-none border-r border-border bg-muted/25 px-3 py-3 text-right font-mono text-[11px] leading-6 text-muted-foreground/55">
            {lines.map((_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <pre className="overflow-x-auto px-4 py-3 font-mono text-[12px] leading-6 text-foreground sm:text-[13px]">
            <code>
              {lines.map((line, index) => (
                <div key={index} className="min-h-6 whitespace-pre">
                  {line || " "}
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

function getDeepThinkingPreference(messages: RequestChatRecord["messages"] | undefined) {
  if (!messages) return false;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const value = messages[index]?.metadata?.deep_thinking;
    if (typeof value === "boolean") return value;
  }
  return false;
}

function isPromptStepped(metadata: RequestChatMessageMetadata | undefined): metadata is RequestChatMessageMetadata & { prompt_steps: PromptStep[] } {
  return Boolean(metadata && Array.isArray(metadata.prompt_steps) && metadata.prompt_steps.length > 0);
}

/* ═══════════════════════════════════════════════════════════════════
   FINAL PROMPT PANEL — document-style, not bubble
═══════════════════════════════════════════════════════════════════ */
function FinalPromptPanel({
  content, metadata, version, totalVersions, variationHint, isLatest, isFavorite,
  onRegenerate, isRegenerating, onViewVersion, onToggleFavorite,
}: {
  metadata?: RequestChatMessageMetadata;
  content: string; version: number; totalVersions: number;
  variationHint?: string; isLatest: boolean; isFavorite: boolean;
  onRegenerate: (hint?: string) => void;
  isRegenerating: boolean;
  onViewVersion: (dir: "prev" | "next") => void;
  onToggleFavorite: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [showRegen, setShowRegen] = React.useState(false);
  const [customHint, setCustomHint] = React.useState("");
  const [selectedHint, setSelectedHint] = React.useState<string | null>(null);
  const [showUpdateInput, setShowUpdateInput] = React.useState(false);
  const [updateRequest, setUpdateRequest] = React.useState("");
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const sections = React.useMemo(() => {
    const metadataSections = metadata?.prompt_document;
    if (metadataSections && typeof metadataSections === "object") {
      return {
        prompt: metadataSections.prompt ?? parsePromptDocumentSections(content).prompt,
        why: metadataSections.why ?? "",
        bestUsedWith: metadataSections.best_used_with ?? "",
        raw: metadataSections.raw ?? content.replace(/\r\n/g, "\n").trim(),
      };
    }
    return parsePromptDocumentSections(content);
  }, [content, metadata]);
  const promptSteps = React.useMemo(
    () => (isPromptStepped(metadata) ? metadata.prompt_steps : []),
    [metadata],
  );
  const hasPromptSteps = promptSteps.length > 1;
  const activePromptStep = promptSteps[currentStepIndex] ?? null;
  const promptDisplayText = React.useMemo(
    () => normalizeRenderedText(activePromptStep?.content ?? sections.prompt),
    [activePromptStep?.content, sections.prompt],
  );
  const whyDisplayText = React.useMemo(
    () => normalizeRenderedText(sections.why),
    [sections.why],
  );
  const bestUsedWithDisplayText = React.useMemo(
    () => normalizeRenderedText(sections.bestUsedWith),
    [sections.bestUsedWith],
  );
  const cleanText = React.useMemo(
    () => [activePromptStep?.content ?? sections.prompt, sections.why && `Why this works\n${sections.why}`, sections.bestUsedWith && `Best used with\n${sections.bestUsedWith}`]
      .filter(Boolean)
      .join("\n\n"),
    [activePromptStep?.content, sections],
  );

  function copyValue(value: string) {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyPrompt() {
    copyValue(activePromptStep?.content ?? sections.prompt);
  }

  function handleCopyMarkdown() {
    copyValue(sections.raw);
  }

  function handleCopyPlainText() {
    copyValue(cleanText);
  }

  function handleDownload() {
    const blob = new Blob([sections.raw], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `thynk-prompt-v${version}.md`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleRegenSubmit() {
    onRegenerate(customHint.trim() || selectedHint || undefined);
    setShowRegen(false); setCustomHint(""); setSelectedHint(null);
  }

  function handleUpdateSubmit() {
    if (!updateRequest.trim()) return;
    onRegenerate(updateRequest.trim());
    setShowUpdateInput(false); setUpdateRequest("");
  }

  return (
    <div className="w-full overflow-hidden border border-primary/30 bg-card">
      {/* Document header bar */}
      <div className="flex items-center justify-between border-b border-border bg-primary/[0.04] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="size-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              Generated Prompt
            </span>
          </div>
          {totalVersions > 1 && (
            <div className="flex items-center gap-1 border border-border bg-background px-2 py-0.5">
              <History className="size-2.5 text-muted-foreground" />
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                v{version}/{totalVersions}
              </span>
              <div className="ml-1 flex items-center gap-0.5">
                <button
                  disabled={version <= 1}
                  onClick={() => onViewVersion("prev")}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronDown className="size-3" />
                </button>
                <button
                  disabled={version >= totalVersions}
                  onClick={() => onViewVersion("next")}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronUp className="size-3" />
                </button>
              </div>
            </div>
          )}
          {variationHint && (
            <span className="max-w-[140px] truncate font-mono text-[9px] italic text-muted-foreground/50">
              &quot;{variationHint}&quot;
            </span>
          )}
          {metadata?.deep_thinking && (
            <span className="border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
              Deep thinking
            </span>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={`flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              isFavorite
                ? "text-rose-500 hover:text-rose-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`size-3 ${isFavorite ? "fill-rose-500" : ""}`} />
            {isFavorite ? "Saved" : "Save"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="size-3" />.md
          </button>
        </div>
      </div>

      {/* Prompt content — document body */}
      <div className="px-6 py-6">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Paste-ready prompt</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ready to drop into ChatGPT, Claude, Gemini, Perplexity, or any other AI tool.
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground">
                    {copied ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy"}
                    <ChevronDown className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyPrompt}>
                    Copy prompt only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyPlainText}>
                    Copy plain text
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyMarkdown}>
                    Copy markdown
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {hasPromptSteps && activePromptStep && (
              <div className="mb-3 flex items-center justify-between border border-border bg-muted/20 px-3 py-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                    Step {activePromptStep.step} of {promptSteps.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This prompt is split into guided parts so you can continue step by step in another AI tool.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStepIndex((current) => Math.max(current - 1, 0))}
                    disabled={currentStepIndex === 0}
                    className="border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-35"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentStepIndex((current) => Math.min(current + 1, promptSteps.length - 1))}
                    disabled={currentStepIndex >= promptSteps.length - 1}
                    className="border border-primary/30 bg-primary/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-35"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
            <div className="border border-border bg-background px-5 py-4">
              <div className="whitespace-pre-wrap text-[14px] leading-[1.95] text-foreground">
                {promptDisplayText}
              </div>
            </div>
          </div>

          {(sections.why || sections.bestUsedWith) && (
            <div className="grid gap-4 md:grid-cols-2">
              {sections.why && (
                <div className="border border-border bg-background px-4 py-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Why this works</p>
                  <div className="whitespace-pre-wrap text-[13px] leading-[1.8] text-muted-foreground">
                    {whyDisplayText}
                  </div>
                </div>
              )}
              {sections.bestUsedWith && (
                <div className="border border-border bg-background px-4 py-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Best used with</p>
                  <div className="whitespace-pre-wrap text-[13px] leading-[1.8] text-muted-foreground">
                    {bestUsedWithDisplayText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action strip — update + regen (latest version only) */}
      {isLatest && (
        <div className="border-t border-border">
          {/* Update prompt-to-prompt */}
          <div className="border-b border-border/60">
            <button
              onClick={() => { setShowUpdateInput(!showUpdateInput); setShowRegen(false); }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-2">
                <CornerDownRight className="size-3 text-muted-foreground" />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  Request update to this prompt
                </span>
              </div>
              {showUpdateInput
                ? <ChevronUp className="size-3.5 text-muted-foreground/40" />
                : <ChevronDown className="size-3.5 text-muted-foreground/40" />}
            </button>
            {showUpdateInput && (
              <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                  Describe exactly what to change
                </p>
                <textarea
                  rows={2}
                  placeholder="e.g. Make the tone more authoritative, add a section on metrics, simplify the intro…"
                  value={updateRequest}
                  onChange={(e) => setUpdateRequest(e.target.value)}
                  onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleUpdateSubmit(); }}
                  className="mb-3 w-full resize-none border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] text-muted-foreground/50">⌘+Enter to apply</p>
                  <button
                    onClick={handleUpdateSubmit}
                    disabled={!updateRequest.trim() || isRegenerating}
                    className="flex items-center gap-1.5 border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
                  >
                    <RefreshCw className={`size-3 ${isRegenerating ? "animate-spin" : ""}`} />
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New variation */}
          <button
            onClick={() => { setShowRegen(!showRegen); setShowUpdateInput(false); }}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className={`size-3 text-muted-foreground ${isRegenerating ? "animate-spin" : ""}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {isRegenerating ? "Synthesising variation…" : "Generate new variation"}
              </span>
            </div>
            {showRegen
              ? <ChevronUp className="size-3.5 text-muted-foreground/40" />
              : <ChevronDown className="size-3.5 text-muted-foreground/40" />}
          </button>

          {showRegen && !isRegenerating && (
            <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3">
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
              <input
                type="text"
                placeholder="Or describe what you want different…"
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegenSubmit()}
                className="mb-3 w-full border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-mono text-[9px] text-muted-foreground/50">
                    {totalVersions > 1 ? `${totalVersions} versions total` : "First version"}
                  </p>
                  {metadata?.deep_thinking && (
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary/70">
                      Deep thinking enabled
                    </p>
                  )}
                </div>
                <button
                  onClick={handleRegenSubmit}
                  className="flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
                >
                  Generate<ArrowRight className="size-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   AI QUESTION BLOCK — structured, not paragraph
   Parses AI response to extract a question + options and renders
   them as professional interactive chips / toggle / multi-select
═══════════════════════════════════════════════════════════════════ */
interface StructuredResponse {
  questions: ClarificationQuestion[];
}

function isClarificationPayload(value: unknown): value is ClarificationPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ClarificationPayload>;
  return Array.isArray(payload.questions) && typeof payload.next_action === "string";
}

function parseAiQuestion(content: string): StructuredResponse | null {
  // Extract JSON block (may be wrapped in markdown code fences)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? content.match(/(\{[\s\S]*\})/);
  const raw = jsonMatch ? jsonMatch[1] : content;

  try {
    const parsed = JSON.parse(raw.trim());
    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed as StructuredResponse;
    }
  } catch {
    // not JSON — return null so the raw content is shown as prose
  }
  return null;
}

function getStructuredClarification(
  metadata: RequestChatMessageMetadata | undefined,
  content: string,
): ClarificationPayload | StructuredResponse | null {
  if (metadata && isClarificationPayload(metadata.clarification)) {
    return metadata.clarification;
  }
  return parseAiQuestion(content);
}

function AiQuestionBlock({
  question,
  onAnswer,
}: {
  question: ClarificationQuestion;
  onAnswer: (answer: string) => void;
}) {
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [openValue, setOpenValue] = React.useState("");

  function handleMultiToggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  if (question.type === "open") {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Type your answer…"
          value={openValue}
          onChange={(e) => setOpenValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && openValue.trim()) { onAnswer(openValue.trim()); setOpenValue(""); } }}
          className="flex-1 border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => { if (openValue.trim()) { onAnswer(openValue.trim()); setOpenValue(""); } }}
          disabled={!openValue.trim()}
          className="flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
        >
          <ArrowRight className="size-3" />Send
        </button>
      </div>
    );
  }

  if (question.type === "yesno") {
    return (
      <div className="flex gap-2">
        {["Yes", "No"].map((opt) => (
          <button key={opt} onClick={() => onAnswer(opt)}
            className="border border-border bg-card px-5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
            {opt}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {question.options.map((opt, i) => {
          const isSelected = selected.has(i);
          return (
            <button key={i}
              onClick={() => question.type === "multi" ? handleMultiToggle(i) : onAnswer(opt)}
              className={`group flex items-center gap-2 border px-3 py-2 text-left transition-all ${
                isSelected ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
              }`}>
              <span className={`flex size-4 shrink-0 items-center justify-center border font-mono text-[9px] transition-colors ${
                isSelected ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted-foreground/50 group-hover:border-primary/20"
              }`}>
                {question.type === "multi" ? (isSelected ? <Check className="size-2.5" /> : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
              </span>
              <span className="text-[12px] leading-snug">{opt}</span>
            </button>
          );
        })}
      </div>
      {question.type === "multi" && selected.size > 0 && (
        <button onClick={() => { const answers = [...selected].map((i) => question.options[i]).join(", "); if (answers) onAnswer(answers); }}
          className="mt-3 flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20">
          <ArrowRight className="size-3" />Confirm ({selected.size} selected)
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   IMAGE LIGHTBOX MODAL
═══════════════════════════════════════════════════════════════════ */
function ImageLightbox({ urls, startIndex, onClose }: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = React.useState(startIndex);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setCurrent((i) => Math.min(urls.length - 1, i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [urls.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex size-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      {/* Counter */}
      {urls.length > 1 && (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {current + 1} / {urls.length}
        </div>
      )}

      {/* Prev */}
      {current > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent((i) => i - 1); }}
          className="absolute left-4 flex size-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className="size-4 rotate-90" />
        </button>
      )}

      {/* Image */}
      <div className="flex max-h-[85vh] max-w-[90vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urls[current]}
          alt={`Image ${current + 1}`}
          className="max-h-[85vh] max-w-[90vw] border border-border object-contain shadow-2xl"
        />
      </div>

      {/* Next */}
      {current < urls.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setCurrent((i) => i + 1); }}
          className="absolute right-4 flex size-9 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className="size-4 -rotate-90" />
        </button>
      )}

      {/* Thumbnail strip */}
      {urls.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`thumb ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`h-12 w-16 cursor-pointer border object-cover transition-all ${
                i === current ? "border-primary opacity-100" : "border-border opacity-50 hover:opacity-80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CONVERSATION BLOCK — v0.dev document style, not chat bubbles
   Each exchange (user input → AI response) is a clean section
═══════════════════════════════════════════════════════════════════ */
function UserBlock({ content, time, imageUrls }: { content: string; time: string; imageUrls?: string[] }) {
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/50">You</span>
          <span className="font-mono text-[9px] text-muted-foreground/30">{time}</span>
        </div>
        <MessageCopyButton value={content} />
      </div>
      <div className="border-l-2 border-border pl-4">
        {imageUrls && imageUrls.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-2">
            {imageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className="group relative h-24 w-auto max-w-[180px] overflow-hidden border border-border transition-all hover:border-primary/50"
                title="Click to view full size"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`attachment ${i + 1}`} className="h-full w-auto object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-background/0 transition-colors group-hover:bg-background/30">
                  <Search className="size-4 text-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>
        )}
        {renderMessageContent(content)}
      </div>

      {lightboxIndex !== null && imageUrls && (
        <ImageLightbox
          urls={imageUrls}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function AiBlock({
  content,
  metadata,
  time,
  onOptionSelect,
}: {
  content: string;
  metadata?: RequestChatMessageMetadata;
  time: string;
  onOptionSelect: (text: string) => void;
}) {
  const structured = React.useMemo(
    () => getStructuredClarification(metadata, content),
    [content, metadata],
  );
  const followUpSections = React.useMemo(
    () => (metadata?.type === "follow_up_answer" ? parseStructuredAnswerSections(content) : null),
    [content, metadata],
  );

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Zap className="size-2.5 text-primary" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary/70">Thynk</span>
          </div>
          <span className="font-mono text-[9px] text-muted-foreground/30">{time}</span>
        </div>
        <MessageCopyButton value={content} />
      </div>

      {structured?.questions?.length ? (
        <div className="space-y-5">
          {structured.questions[0] && (
            <div>
              <p className="mb-2.5 text-[14px] font-medium text-foreground">{structured.questions[0].question}</p>
              <AiQuestionBlock question={structured.questions[0]} onAnswer={onOptionSelect} />
            </div>
          )}
        </div>
      ) : followUpSections ? (
        <div className="space-y-4 border-l-2 border-border pl-4">
          <div>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
              Prompt support
            </p>
            {renderMessageContent(followUpSections.answer)}
          </div>
          {followUpSections.why && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
                Why
              </p>
              {renderMessageContent(followUpSections.why)}
            </div>
          )}
          {followUpSections.nextStep && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
                Suggested next step
              </p>
              {renderMessageContent(followUpSections.nextStep)}
            </div>
          )}
        </div>
      ) : (
        <div className="border-l-2 border-border pl-4">
          {renderMessageContent(content)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TEMPLATES PANEL — community prompts (final outputs)
═══════════════════════════════════════════════════════════════════ */
function TemplatesPanel({ onUse, onClose }: {
  onUse: (content: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: getTemplates,
    staleTime: 5 * 60_000,
  });

  const categories = React.useMemo(
    () => ["all", ...Array.from(new Set(templates.map((t) => t.category)))],
    [templates],
  );

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return t.is_active
      && (activeCategory === "all" || t.category === activeCategory)
      && (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  });

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-3 text-primary" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Prompt Library
            </span>
          </div>
          <p className="mt-0.5 text-[13px] font-medium text-foreground">Community Prompts</p>
          <p className="text-[11px] text-muted-foreground/60">Use any prompt as your starting point</p>
        </div>
        <button
          onClick={onClose}
          className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-border px-4 py-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search prompts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border bg-background py-2 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
              activeCategory === cat
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse border border-border bg-muted/30" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-[12px] text-muted-foreground">No prompts found.</p>
        ) : (
          filtered.map((t) => {
            const isOpen = expanded === t.id;
            return (
              <div key={t.id} className="border-b border-border">
                <button
                  onClick={() => setExpanded(isOpen ? null : t.id)}
                  className="group w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="truncate text-[12px] font-medium text-foreground">{t.title}</p>
                        {t.is_premium && (
                          <span className="shrink-0 border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-primary">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{t.description}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {t.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="border border-border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className={`mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 transition-transform ${isOpen ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
                  </div>
                </button>

                {/* Expanded preview + use button */}
                {isOpen && (
                  <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3">
                    <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                      Prompt Preview
                    </p>
                    <div className="mb-3 max-h-40 overflow-y-auto border border-border bg-background p-3">
                      <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-foreground/70">
                        {t.template_content}
                      </pre>
                    </div>
                    <button
                      onClick={() => onUse(t.template_content)}
                      className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <CornerDownRight className="size-3.5" />
                      Use this prompt — clone to workspace
                    </button>
                    <p className="mt-2 text-center font-mono text-[9px] text-muted-foreground/50">
                      Opens as a new chat starting from this prompt
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CHAT ENTRY HERO
═══════════════════════════════════════════════════════════════════ */
const CATEGORIES = ["design", "development", "student", "content", "marketing", "writing", "business"] as const;

function DeepThinkingToggle({
  enabled,
  canUse,
  onToggle,
  compact = false,
}: {
  enabled: boolean;
  canUse: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  if (!canUse) {
    return (
      <div className={`flex items-center gap-2 border border-border bg-muted/20 ${compact ? "px-2 py-1" : "px-3 py-2"}`}>
        <Brain className="size-3.5 text-muted-foreground/55" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Deep thinking
          </p>
          {!compact && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Available on paid plans for more thorough prompt depth.
            </p>
          )}
        </div>
        <span className="border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          Pro
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-w-0 items-center gap-2 border transition-colors ${
        enabled
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      } ${compact ? "px-2.5 py-1.5" : "px-3 py-2"}`}
    >
      <Brain className="size-3.5" />
      <div className="min-w-0 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
          Deep thinking
        </p>
        {!compact && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Generate a more extensive, step-aware prompt with stronger professional detail.
          </p>
        )}
      </div>
      {enabled && (
        <span className="ml-auto border border-primary/20 bg-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-primary">
          <span className="hidden sm:inline">On</span>
          <span className="sm:hidden">Live</span>
        </span>
      )}
    </button>
  );
}

function ChatEntryHero({
  onCreated,
  promptsLeft,
  limit,
  planSlug,
  subscriptionGenerationsRemaining,
  grantedCreditsRemaining,
  totalPointsRemaining,
  onShowTemplates,
  initialPrompt,
  onPromptChange,
  deepThinkingEnabled,
  onToggleDeepThinking,
}: {
  onCreated: (chat: RequestChatRecord) => void;
  promptsLeft: number;
  limit: number;
  planSlug: string;
  subscriptionGenerationsRemaining: number;
  grantedCreditsRemaining: number;
  totalPointsRemaining: number;
  onShowTemplates: () => void;
  initialPrompt: string;
  onPromptChange: (v: string) => void;
  deepThinkingEnabled: boolean;
  onToggleDeepThinking: () => void;
}) {
  const [category, setCategory] = React.useState("design");
  const [entryImages, setEntryImages] = React.useState<{ file: File; preview: string }[]>([]);
  const [entryUploading, setEntryUploading] = React.useState(false);
  const [entryDragging, setEntryDragging] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const entryFileRef = React.useRef<HTMLInputElement>(null);
  const entryDragCounter = React.useRef(0);

  const isAtLimit = limit > 0 && promptsLeft <= 0;
  const pct = limit > 0 ? Math.min(((limit - promptsLeft) / limit) * 100, 100) : 0;
  const isNear = pct >= 80;
  const isFree = planSlug === "free";
  const canUseDeepThinking = !isFree;

  React.useEffect(() => {
    if (initialPrompt) textareaRef.current?.focus();
  }, [initialPrompt]);

  /* Image helpers */
  function addEntryFiles(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setEntryImages((prev) => {
      const slots = 4 - prev.length;
      if (slots <= 0) return prev;
      return [...prev, ...imgs.slice(0, slots).map((f) => ({ file: f, preview: URL.createObjectURL(f) }))];
    });
  }

  function removeEntryImage(idx: number) {
    setEntryImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function onEntryFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    addEntryFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function onEntryDragEnter(e: React.DragEvent) {
    e.preventDefault();
    entryDragCounter.current += 1;
    if (e.dataTransfer.types.includes("Files")) setEntryDragging(true);
  }

  function onEntryDragLeave(e: React.DragEvent) {
    e.preventDefault();
    entryDragCounter.current -= 1;
    if (entryDragCounter.current === 0) setEntryDragging(false);
  }

  function onEntryDrop(e: React.DragEvent) {
    e.preventDefault();
    entryDragCounter.current = 0;
    setEntryDragging(false);
    addEntryFiles(Array.from(e.dataTransfer.files));
    textareaRef.current?.focus();
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const title = initialPrompt.trim().slice(0, 60) || "Untitled Chat";

      let imageUrls: string[] = [];
      if (entryImages.length > 0) {
        setEntryUploading(true);
        try {
          imageUrls = await Promise.all(entryImages.map((a) => uploadToCloudinary(a.file)));
        } finally {
          setEntryUploading(false);
        }
      }
      return createRequestChat({
        title,
        category,
        message: initialPrompt.trim(),
        image_urls: imageUrls,
        deep_thinking: deepThinkingEnabled,
      }, token);
    },
    onMutate: () => toast.loading("Starting workspace…", { id: "entry-chat" }),
    onSuccess: (chat) => { toast.success("Workspace ready", { id: "entry-chat" }); onCreated(chat); },
    onError: () => toast.error("Failed to start workspace", { id: "entry-chat" }),
  });

  const isPending = mutation.isPending || entryUploading;

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (initialPrompt.trim() && !isAtLimit && !isPending) mutation.mutate();
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.018,
        }}
      />

      <div className={`relative z-10 flex w-full flex-col gap-5 ${expanded ? "max-w-[1200px]" : "max-w-[720px]"}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </p>
            <h1 className="mt-2 text-[clamp(1.55rem,4.2vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-foreground">
              Start with the brief.
            </h1>
            <p className="mt-2 max-w-[560px] text-[14px] leading-7 text-muted-foreground">
              Write naturally, attach images when they help, and shape the prompt from there.
            </p>
          </div>

          <div className="grid gap-2 sm:min-w-[290px]">
            <div className="grid grid-cols-3 border border-border bg-card">
              <div className="border-r border-border px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Weekly</p>
                <p className="mt-1 font-mono text-[12px] font-semibold tabular-nums text-foreground">
                  {subscriptionGenerationsRemaining.toLocaleString()}
                </p>
              </div>
              <div className="border-r border-border px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Granted</p>
                <p className="mt-1 font-mono text-[12px] font-semibold tabular-nums text-foreground">
                  {grantedCreditsRemaining.toLocaleString()}
                </p>
              </div>
              <div className="px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                <p className="mt-1 font-mono text-[12px] font-semibold tabular-nums text-foreground">
                  {totalPointsRemaining.toLocaleString()}
                </p>
              </div>
            </div>
            {limit > 0 && (
              <div className="flex items-center gap-3">
                <div className="relative h-1.5 flex-1 overflow-hidden bg-muted">
                  <div
                    className={`h-full transition-all duration-500 ${isAtLimit ? "bg-destructive" : isNear ? "bg-orange-500" : "bg-primary"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {limit - promptsLeft}/{limit}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Entry card */}
        <div
          className={`relative border bg-card shadow-lg transition-colors duration-150 ${entryDragging ? "border-primary/60 bg-primary/[0.02]" : "border-border"}`}
          onDragEnter={onEntryDragEnter}
          onDragLeave={onEntryDragLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onEntryDrop}
        >
          {/* Drop overlay */}
          {entryDragging && (
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/90 backdrop-blur-[2px]">
              <div className="flex items-center justify-center rounded-full border-2 border-dashed border-primary/50 p-4">
                <ImagePlus className="size-6 text-primary/70" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70">Drop to attach</p>
              <p className="font-mono text-[9px] text-muted-foreground/50">
                {4 - entryImages.length} slot{4 - entryImages.length !== 1 ? "s" : ""} remaining
              </p>
            </div>
          )}

          {/* Titlebar */}
          <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/20" />
              <span className="size-2.5 rounded-full bg-muted-foreground/20" />
              <span className={`size-2.5 rounded-full transition-colors duration-300 ${isPending ? "animate-pulse bg-primary" : "bg-primary/60"}`} />
            </div>
            <Zap className="size-3 text-primary" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              New prompt workspace
            </span>
            <button
              onClick={() => setExpanded((value) => !value)}
              className="ml-auto flex items-center gap-1 border border-border bg-background px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {expanded ? <Minimize2 className="size-2.5" /> : <Maximize2 className="size-2.5" />}
              {expanded ? "Compact" : "Expand"}
            </button>
            <button
              onClick={onShowTemplates}
              className="flex items-center gap-1 border border-border bg-background px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="size-2.5" />Library
            </button>
          </div>

          <div className="border-b border-border px-4 py-3">
            <DeepThinkingToggle
              enabled={deepThinkingEnabled}
              canUse={canUseDeepThinking}
              onToggle={onToggleDeepThinking}
            />
          </div>

          {/* Attached image previews */}
          {entryImages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
              {entryImages.map((img, idx) => (
                <div key={idx} className="group relative size-16 overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`attachment ${idx + 1}`} className="size-full object-cover" />
                  <button
                    onClick={() => removeEntryImage(idx)}
                    className="absolute inset-0 flex items-center justify-center bg-background/75 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-4 text-foreground" />
                  </button>
                </div>
              ))}
              {entryImages.length < 4 && (
                <button
                  onClick={() => entryFileRef.current?.click()}
                  className="flex size-16 items-center justify-center border border-dashed border-border text-muted-foreground/40 transition-colors hover:border-primary/40 hover:text-primary/60"
                >
                  <ImagePlus className="size-5" />
                </button>
              )}
            </div>
          )}

          {/* Textarea */}
          <div className="cursor-text px-5 pb-2 pt-5 md:px-6 md:pt-6" onClick={() => textareaRef.current?.focus()}>
            <textarea
              ref={textareaRef}
              rows={expanded ? 12 : 4}
              className={`w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/35 focus:outline-none md:text-[16px] ${expanded ? "min-h-[calc(100vh-24rem)]" : "min-h-[140px]"}`}
              placeholder="Describe what you want to build, write, or create — be as rough or precise as you like…"
              value={initialPrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              onKeyDown={handleKey}
              disabled={isPending}
            />
            <p className="mt-1 text-[11px] text-muted-foreground/40">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">⌘</kbd>
              {"+"}
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">↵</kbd>
              {" "}to start · Drop images anywhere on this card
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category select */}
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isPending}
                  className="appearance-none cursor-pointer border border-border bg-background py-1.5 pl-3 pr-7 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted focus:outline-none disabled:opacity-50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                  <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                    <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>

              {/* Image attach button */}
              <input
                ref={entryFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onEntryFileChange}
              />
              <button
                type="button"
                onClick={() => entryFileRef.current?.click()}
                disabled={isPending || entryImages.length >= 4}
                title={entryImages.length >= 4 ? "Maximum 4 images" : "Attach image"}
                className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              >
                <ImagePlus className="size-3.5" />
                {entryImages.length > 0 ? `${entryImages.length}/4` : "Image"}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <p className="hidden text-[11px] text-muted-foreground/50 md:block">
                {expanded ? "Use expanded mode when you need room for longer briefs." : "Switch to expanded mode when you need more room."}
              </p>
              <button
                onClick={() => mutation.mutate()}
                disabled={!initialPrompt.trim() || isPending || isAtLimit}
                className="flex min-h-10 items-center gap-2 bg-primary px-5 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {isPending
                  ? <><RefreshCw className="size-3.5 animate-spin" />{entryUploading ? "Uploading…" : "Starting…"}</>
                  : <><Send className="size-3.5" />Start workspace</>}
              </button>
            </div>
          </div>
        </div>

        {isAtLimit && (
          <p className="mt-3 text-center text-[12px] text-destructive">
            Prompt limit reached.{" "}
            <a href="/pricing" className="underline hover:opacity-80">Upgrade to Pro</a>
            {isFree && " or wait for your weekly reset."}
          </p>
        )}
        {mutation.isError && (
          <p className="mt-2 text-center text-[12px] text-destructive">
            {(mutation.error as { message?: string })?.message ?? "Failed to start workspace."}
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CHAT LIST PANEL
═══════════════════════════════════════════════════════════════════ */
function ChatListPanel({ chats, activeChatId, onSelect, onNew, onDelete, onClearAll }: {
  chats: RequestChatRecord[]; activeChatId: string | null;
  onSelect: (id: string) => void; onNew: () => void;
  onDelete: (chat: RequestChatRecord) => void;
  onClearAll: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const filtered = chats.filter((c) => !search || c.title.toLowerCase().includes(search.toLowerCase()));
  const hasChats = chats.length > 0;

  return (
    <aside className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Workspaces</span>
          <div className="flex items-center gap-1.5">
            {hasChats ? (
              <button
                onClick={onClearAll}
                className="flex items-center gap-1 border border-transparent bg-background px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="size-3" />Clear all
              </button>
            ) : null}
            <button
              onClick={onNew}
              className="flex items-center gap-1 border border-border bg-background px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3" />New
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-border bg-background py-1.5 pl-7 pr-3 text-[11px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-5 text-center">
            <MessageSquare className="mx-auto mb-2 size-6 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground">No workspaces yet</p>
          </div>
        ) : (
          filtered.map((chat) => {
            const finals = chat.messages.filter((m) => m.metadata?.is_final);
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                className={`group border-b border-border transition-colors hover:bg-muted/50 ${isActive ? "border-l-2 border-l-primary bg-muted" : ""}`}
              >
                <div className="flex items-stretch gap-2">
                  <button
                    onClick={() => onSelect(chat.id)}
                    className="min-w-0 flex-1 px-4 py-3.5 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`truncate text-[12px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                        {chat.title}
                      </p>
                      {chat.is_favorite && <Heart className="mt-0.5 size-2.5 shrink-0 fill-rose-500 text-rose-500" />}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{chat.category}</span>
                      {finals.length > 0 && (
                        <span className="flex items-center gap-0.5 font-mono text-[9px] text-primary/70">
                          <Layers className="size-2" />{finals.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center pr-3">
                    <button
                      onClick={() => onDelete(chat)}
                      title={`Delete ${chat.title}`}
                      className="flex size-7 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-destructive/20 hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

type ConfirmDialogState =
  | { mode: "delete-chat"; chat: RequestChatRecord }
  | { mode: "clear-chats" }
  | null;

/* ═══════════════════════════════════════════════════════════════════
   MAIN WORKSPACE PAGE
═══════════════════════════════════════════════════════════════════ */
export default function WorkspacePage() {
  const session = useAuthSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const hydrated = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const initialChatParam = searchParams.get("chat");
  const initialPromptParam = searchParams.get("prompt");

  const [activeChatId, setActiveChatId] = React.useState<string | null>(initialChatParam);
  const [inputValue, setInputValue] = React.useState("");
  const [heroPrompt, setHeroPrompt] = React.useState(
    initialPromptParam ? decodeURIComponent(initialPromptParam) : "",
  );
  const [isThinking, setIsThinking] = React.useState(false);
  const [upgradeBanner, setUpgradeBanner] = React.useState(false);
  const [viewingVersion, setViewingVersion] = React.useState<number | null>(null);
  const [showTemplatesPanel, setShowTemplatesPanel] = React.useState(false);
  const [showChatList, setShowChatList] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState>(null);
  const [deepThinkingEnabled, setDeepThinkingEnabled] = React.useState(false);
  const [deepThinkingTouched, setDeepThinkingTouched] = React.useState(false);
  const [attachedImages, setAttachedImages] = React.useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const finalPromptRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  React.useEffect(() => {
    if (!hydrated) return;
    if (session === null) { router.push("/?auth=sign-in"); }
  }, [hydrated, session, router]);

  const accessToken = session?.tokens.access_token ?? "";

  /* Usage */
  const userQuery = useQuery({
    queryKey: ["user-profile", accessToken],
    queryFn: () => getCurrentUser(accessToken),
    enabled: Boolean(accessToken), staleTime: 30_000,
  });
  const plansQuery = useQuery({
    queryKey: ["plans"], queryFn: getPlans,
    enabled: Boolean(accessToken), staleTime: 5 * 60_000,
  });
  const user = userQuery.data;
  const sessionPlanId = session?.plan?.plan_id ?? null;
  const plan = plansQuery.data?.find((p) => p.id === user?.current_plan_id)
    ?? plansQuery.data?.find((p) => p.id === sessionPlanId)
    ?? plansQuery.data?.find((p) => p.slug === "free");
  const used = user?.monthly_generation_count ?? 0;
  const limit = plan?.generation_limit ?? 5;
  const planSlug = plan?.slug ?? "free";
  const promptsLeft = Math.max(limit - used, 0);
  const subscriptionGenerationsRemaining = user?.subscription_generations_remaining ?? promptsLeft;
  const grantedCreditsRemaining = user?.granted_credits_remaining ?? 0;
  const totalPointsRemaining = user?.total_points_remaining ?? (subscriptionGenerationsRemaining + grantedCreditsRemaining);
  const canUseDeepThinking = planSlug !== "free";

  /* Chats */
  const { data: chats = [], refetch: refetchChats } = useQuery({
    queryKey: ["request-chat-history", accessToken],
    queryFn: () => getMyRequestChats(accessToken),
    enabled: Boolean(accessToken),
  });

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const activeChatDeepThinking = activeChat ? getDeepThinkingPreference(activeChat.messages) : false;
  const effectiveDeepThinking = canUseDeepThinking
    ? (activeChat ? (deepThinkingTouched ? deepThinkingEnabled : activeChatDeepThinking) : deepThinkingEnabled)
    : false;

  const finalMessages = React.useMemo(
    () => (activeChat?.messages ?? []).filter((m) => m.metadata?.is_final === true),
    [activeChat],
  );

  const latestClarification = React.useMemo(() => {
    if (!activeChat) return null;
    const clarificationMessages = activeChat.messages.filter(
      (message) => message.metadata?.type === "clarification",
    );
    return clarificationMessages[clarificationMessages.length - 1] ?? null;
  }, [activeChat]);
  const effectiveViewingVersion = React.useMemo(() => {
    if (finalMessages.length === 0) return 1;
    if (viewingVersion === null) return finalMessages.length;
    return Math.min(Math.max(viewingVersion, 1), finalMessages.length);
  }, [finalMessages.length, viewingVersion]);

  /* Build display messages: exclude non-displayed final versions */
  const displayMessages = React.useMemo(() => {
    if (!activeChat) return [];
    const displayedFinal = finalMessages[effectiveViewingVersion - 1] ?? null;
    let shownFinal = false;
    return activeChat.messages.filter((m) => {
      if (!m.metadata?.is_final) return true;
      if (!shownFinal && m === displayedFinal) { shownFinal = true; return true; }
      return false;
    });
  }, [activeChat, effectiveViewingVersion, finalMessages]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages.length, isThinking]);

  function addImageFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setAttachedImages((prev) => {
      const slots = 4 - prev.length;
      if (slots <= 0) return prev;
      return [...prev, ...imageFiles.slice(0, slots).map((file) => ({ file, preview: URL.createObjectURL(file) }))];
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addImageFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function handleInputDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDraggingOver(true);
  }

  function handleInputDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  }

  function handleInputDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    addImageFiles(Array.from(e.dataTransfer.files));
    inputRef.current?.focus();
  }

  function removeAttachment(idx: number) {
    setAttachedImages((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  }

  /* ── Mutations ── */
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChatId) throw new Error("No active chat");
      let imageUrls: string[] = [];
      if (attachedImages.length > 0) {
        setIsUploading(true);
        try {
          imageUrls = await Promise.all(attachedImages.map((a) => uploadToCloudinary(a.file)));
        } finally {
          setIsUploading(false);
          setAttachedImages([]);
        }
      }
      return addMessageToChat(activeChatId, content, accessToken, imageUrls, effectiveDeepThinking);
    },
    onMutate: () => setIsThinking(true),
    onSuccess: (updatedChat) => {
      setIsThinking(false);
      queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat]);
    },
    onError: (err: unknown) => {
      setIsThinking(false);
      toast.error("Failed to send message");
      if ((err as { status?: number })?.status === 429 || (err as { status?: number })?.status === 403) setUpgradeBanner(true);
    },
  });

  const generateFinalMutation = useMutation({
    mutationFn: () => {
      if (!activeChatId) throw new Error("No active chat");
      return generateFinalPrompt(activeChatId, accessToken, effectiveDeepThinking);
    },
    onMutate: () => {
      setIsThinking(true);
      toast.loading("Generating your prompt…", { id: "generate-prompt" });
    },
    onSuccess: (updatedChat) => {
      setIsThinking(false);
      toast.success("Prompt generated", { id: "generate-prompt" });
      queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat]);
      queryClient.invalidateQueries({ queryKey: ["user-profile", accessToken] });
    },
    onError: (err: unknown) => {
      setIsThinking(false);
      toast.error("Failed to generate prompt", { id: "generate-prompt" });
      if ((err as { status?: number })?.status === 429 || (err as { status?: number })?.status === 403) setUpgradeBanner(true);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (variationHint?: string) => {
      if (!activeChatId) throw new Error("No active chat");
      return regenerateFinalPrompt(activeChatId, accessToken, variationHint, effectiveDeepThinking);
    },
    onMutate: () => {
      setIsThinking(true);
      toast.loading("Synthesising variation…", { id: "regen-prompt" });
    },
    onSuccess: (updatedChat) => {
      setIsThinking(false);
      toast.success("New variation ready", { id: "regen-prompt" });
      queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat]);
      queryClient.invalidateQueries({ queryKey: ["user-profile", accessToken] });
    },
    onError: (err: unknown) => {
      setIsThinking(false);
      toast.error("Regeneration failed", { id: "regen-prompt" });
      if ((err as { status?: number })?.status === 429 || (err as { status?: number })?.status === 403) setUpgradeBanner(true);
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: (chatId: string) => toggleFavoriteChat(chatId, accessToken),
    onSuccess: (updatedChat) => {
      toast.success(updatedChat.is_favorite ? "Added to favorites" : "Removed from favorites");
      queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
        old ? old.map((c) => (c.id === updatedChat.id ? updatedChat : c)) : [updatedChat]);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chat: RequestChatRecord) => {
      await deleteRequestChat(chat.id, accessToken);
      return chat;
    },
    onSuccess: (deletedChat) => {
      toast.success("Workspace deleted");
      queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
        (old ?? []).filter((chat) => chat.id !== deletedChat.id));
      if (activeChatId === deletedChat.id) {
        setActiveChatId(null);
        setDeepThinkingEnabled(false);
        setDeepThinkingTouched(false);
        window.history.replaceState(null, "", "/workspace");
      }
      setConfirmDialog(null);
    },
    onError: () => {
      toast.error("Failed to delete workspace");
    },
  });

  const clearChatsMutation = useMutation({
    mutationFn: () => clearRequestChats(accessToken),
    onSuccess: () => {
      toast.success("Workspace history cleared");
      queryClient.setQueryData(["request-chat-history", accessToken], []);
      setActiveChatId(null);
      setDeepThinkingEnabled(false);
      setDeepThinkingTouched(false);
      window.history.replaceState(null, "", "/workspace");
      setConfirmDialog(null);
    },
    onError: () => {
      toast.error("Failed to clear workspace history");
    },
  });

  function handleViewVersion(dir: "prev" | "next") {
    setViewingVersion((current) => {
      const baseVersion = current ?? finalMessages.length;
      return dir === "prev"
        ? Math.max(1, baseVersion - 1)
        : Math.min(finalMessages.length, baseVersion + 1);
    });
  }

  function handleToggleDeepThinking() {
    if (!canUseDeepThinking) return;
    setDeepThinkingTouched(true);
    setDeepThinkingEnabled((current) => !current);
  }

  function scrollToFinalPrompt() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        finalPromptRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function handleOpenPrompt(version?: number) {
    if (!hasFinalPrompt) return;
    if (typeof version === "number") {
      setViewingVersion(version);
    }
    scrollToFinalPrompt();
  }

  function handleSend() {
    const content = inputValue.trim();
    if (!content || isThinking || isUploading) return;
    setInputValue("");
    sendMessageMutation.mutate(content);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleSend(); }
  }

  function handleChatCreated(chat: RequestChatRecord) {
    queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
      old ? [chat, ...old] : [chat]);
    setActiveChatId(chat.id);
    setDeepThinkingEnabled(getDeepThinkingPreference(chat.messages));
    setDeepThinkingTouched(false);
    setHeroPrompt("");
    window.history.replaceState(null, "", `/workspace?chat=${chat.id}`);
    refetchChats();
  }

  /* When user picks a template, start a new chat with that prompt content pre-filled */
  function handleUseTemplate(content: string) {
    setHeroPrompt(content);
    setActiveChatId(null);
    setDeepThinkingEnabled(false);
    setDeepThinkingTouched(false);
    setShowTemplatesPanel(false);
    window.history.replaceState(null, "", "/workspace");
  }

  /* Show nothing while hydrating to avoid flash — redirect effect handles unauthenticated after hydration */
  if (!hydrated || session === null) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-1.5">
          {[0, 0.15, 0.3].map((delay, i) => (
            <span key={i} className="block size-2 rounded-full bg-primary/60"
              style={{ animation: `thynk-dot 1.1s ease-in-out ${delay}s infinite` }} />
          ))}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading workspace…</span>
      </div>
      <style>{`@keyframes thynk-dot{0%,100%{opacity:.2;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}`}</style>
    </div>
  );

  const hasFinalPrompt = finalMessages.length > 0;
  const showGenerateButton = latestClarification?.metadata?.next_action
    ? latestClarification.metadata.next_action === "ready_for_final_prompt"
    : (activeChat?.messages.length ?? 0) >= 2;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className={activeChatId ? "hidden md:block" : ""}>
        <SiteHeader />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop chat list */}
        <div className="hidden flex-col md:flex md:w-[220px] lg:w-[260px]">
          <ChatListPanel
            chats={chats}
            activeChatId={activeChatId}
            onClearAll={() => setConfirmDialog({ mode: "clear-chats" })}
            onDelete={(chat) => setConfirmDialog({ mode: "delete-chat", chat })}
            onSelect={(id) => {
              setActiveChatId(id);
              const selectedChat = chats.find((chat) => chat.id === id);
              setDeepThinkingEnabled(selectedChat ? getDeepThinkingPreference(selectedChat.messages) : false);
              setDeepThinkingTouched(false);
              setShowChatList(false);
              window.history.replaceState(null, "", `/workspace?chat=${id}`);
            }}
            onNew={() => {
              setActiveChatId(null);
              setDeepThinkingEnabled(false);
              setDeepThinkingTouched(false);
              window.history.replaceState(null, "", "/workspace");
            }}
          />
        </div>

        {/* Mobile chat list overlay */}
        {showChatList && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="flex w-72 flex-col">
              <ChatListPanel
                chats={chats}
                activeChatId={activeChatId}
                onClearAll={() => setConfirmDialog({ mode: "clear-chats" })}
                onDelete={(chat) => setConfirmDialog({ mode: "delete-chat", chat })}
                onSelect={(id) => {
                  setActiveChatId(id);
                  const selectedChat = chats.find((chat) => chat.id === id);
                  setDeepThinkingEnabled(selectedChat ? getDeepThinkingPreference(selectedChat.messages) : false);
                  setDeepThinkingTouched(false);
                  setShowChatList(false);
                  window.history.replaceState(null, "", `/workspace?chat=${id}`);
                }}
                onNew={() => {
                  setActiveChatId(null);
                  setDeepThinkingEnabled(false);
                  setDeepThinkingTouched(false);
                  setShowChatList(false);
                  window.history.replaceState(null, "", "/workspace");
                }}
              />
            </div>
            <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={() => setShowChatList(false)} />
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* ── No active chat: entry hero ── */}
          {!activeChatId ? (
            <div className="relative flex-1 overflow-y-auto">
              <button
                onClick={() => setShowChatList(true)}
                className="absolute left-4 top-4 z-10 flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted md:hidden"
              >
                <Clock className="size-3" />History
              </button>
              <ChatEntryHero
                onCreated={handleChatCreated}
                promptsLeft={promptsLeft}
                limit={limit}
                planSlug={planSlug}
                subscriptionGenerationsRemaining={subscriptionGenerationsRemaining}
                grantedCreditsRemaining={grantedCreditsRemaining}
                totalPointsRemaining={totalPointsRemaining}
                onShowTemplates={() => setShowTemplatesPanel(true)}
                initialPrompt={heroPrompt}
                onPromptChange={setHeroPrompt}
                deepThinkingEnabled={effectiveDeepThinking}
                onToggleDeepThinking={handleToggleDeepThinking}
              />
            </div>
          ) : (
            /* ── Active workspace ── */
            <>
              {/* Top bar */}
              <div className="border-b border-border bg-card px-4 py-3">
                <div className="hidden items-center justify-between gap-4 md:flex">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveChatId(null);
                        setDeepThinkingEnabled(false);
                        setDeepThinkingTouched(false);
                        window.history.replaceState(null, "", "/workspace");
                      }}
                      className="flex size-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <div className="min-w-0">
                      <h1 className="truncate text-[13px] font-semibold leading-none text-foreground">{activeChat?.title}</h1>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          {activeChat?.category}
                        </span>
                        {hasFinalPrompt && (
                          <span className="flex items-center gap-1 border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                            <Layers className="size-2.5" />
                            {finalMessages.length} version{finalMessages.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {activeChat?.is_favorite && (
                          <Heart className="size-2.5 fill-rose-500 text-rose-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasFinalPrompt && (
                      finalMessages.length > 1 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                              <Layers className="size-3.5" />
                              {effectiveViewingVersion === finalMessages.length ? "Latest prompt" : `Prompt ${effectiveViewingVersion}`}
                              <ChevronDown className="size-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {finalMessages.map((message, index) => {
                              const version = index + 1;
                              const isCurrent = version === effectiveViewingVersion;
                              return (
                                <DropdownMenuItem
                                  key={message.id}
                                  onClick={() => handleOpenPrompt(version)}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="truncate">
                                    {getPromptVersionLabel(message, version, finalMessages.length)}
                                  </span>
                                  {isCurrent && (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                                      Open
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <button
                          onClick={() => handleOpenPrompt()}
                          className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Layers className="size-3.5" />
                          View prompt
                        </button>
                      )
                    )}
                    <DeepThinkingToggle
                      enabled={effectiveDeepThinking}
                      canUse={canUseDeepThinking}
                      onToggle={handleToggleDeepThinking}
                      compact
                    />
                    {showGenerateButton && !hasFinalPrompt && (
                      <button
                        disabled={generateFinalMutation.isPending || isThinking}
                        onClick={() => generateFinalMutation.mutate()}
                        className="flex items-center gap-1.5 bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {generateFinalMutation.isPending
                          ? <><RefreshCw className="size-3.5 animate-spin" />Crystallising…</>
                          : <>Generate Prompt</>}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 md:hidden">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        setActiveChatId(null);
                        setDeepThinkingEnabled(false);
                        setDeepThinkingTouched(false);
                        window.history.replaceState(null, "", "/workspace");
                      }}
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h1 className="line-clamp-2 text-[20px] font-semibold leading-tight text-foreground">
                        {activeChat?.title}
                      </h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {activeChat?.category}
                        </span>
                        {hasFinalPrompt && (
                          <span className="flex items-center gap-1 border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                            <Layers className="size-3" />
                            {finalMessages.length} version{finalMessages.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {activeChat?.is_favorite && (
                          <Heart className="size-3 fill-rose-500 text-rose-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {hasFinalPrompt ? (
                      finalMessages.length > 1 ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="col-span-2 flex min-w-0 items-center justify-between gap-2 border border-border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <Layers className="size-3.5 shrink-0" />
                                <span className="truncate">{effectiveViewingVersion === finalMessages.length ? "Latest prompt" : `Prompt ${effectiveViewingVersion}`}</span>
                              </span>
                              <ChevronDown className="size-3 shrink-0" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            {finalMessages.map((message, index) => {
                              const version = index + 1;
                              const isCurrent = version === effectiveViewingVersion;
                              return (
                                <DropdownMenuItem
                                  key={message.id}
                                  onClick={() => handleOpenPrompt(version)}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="truncate">
                                    {getPromptVersionLabel(message, version, finalMessages.length)}
                                  </span>
                                  {isCurrent && (
                                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                                      Open
                                    </span>
                                  )}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <button
                          onClick={() => handleOpenPrompt()}
                          className="col-span-2 flex items-center gap-1.5 border border-border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Layers className="size-3.5 shrink-0" />
                          View prompt
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setShowChatList(true)}
                        className="flex items-center gap-1.5 border border-border bg-background px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Clock className="size-3.5 shrink-0" />
                        History
                      </button>
                    )}
                    {showGenerateButton && !hasFinalPrompt && (
                      <button
                        disabled={generateFinalMutation.isPending || isThinking}
                        onClick={() => generateFinalMutation.mutate()}
                        className="flex items-center justify-center gap-1.5 bg-primary px-3 py-2 text-[12px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                      >
                        {generateFinalMutation.isPending
                          ? <><RefreshCw className="size-3.5 animate-spin" />Crystallising…</>
                          : <>Generate</>}
                      </button>
                    )}
                  </div>

                  <DeepThinkingToggle
                    enabled={effectiveDeepThinking}
                    canUse={canUseDeepThinking}
                    onToggle={handleToggleDeepThinking}
                    compact
                  />
                </div>
              </div>

              {/* Upgrade banner */}
              {upgradeBanner && (
                <div className="flex items-center justify-between border-b border-destructive/20 bg-destructive/5 px-5 py-3">
                  <p className="text-[12px] text-foreground">
                    Prompt limit reached.{" "}
                    <a href="/pricing" className="font-medium text-primary underline">Upgrade to Pro</a>{" "}
                    for more.
                  </p>
                  <button onClick={() => setUpgradeBanner(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* Document-style conversation area */}
              <div className="flex-1 overflow-y-auto px-4 py-2 md:px-10">
                <div className="mx-auto max-w-[760px]">
                  {/* Dividers between message blocks */}
                  {displayMessages.map((msg, idx) => {
                    const isFinal = msg.metadata?.is_final === true;
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                    if (isFinal) {
                      return (
                        <div key={msg.id} ref={msg === finalMessages[effectiveViewingVersion - 1] ? finalPromptRef : undefined} className="py-6">
                          {/* Section header */}
                          <div className="mb-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-border" />
                            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
                              Final Output
                            </span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          <FinalPromptPanel
                            key={`${msg.id}-${effectiveViewingVersion}`}
                            content={msg.content}
                            metadata={msg.metadata}
                            version={effectiveViewingVersion}
                            totalVersions={finalMessages.length}
                            variationHint={msg.metadata?.variation_hint as string | undefined}
                            isLatest={effectiveViewingVersion === finalMessages.length}
                            isFavorite={activeChat?.is_favorite ?? false}
                            onRegenerate={(hint) => regenerateMutation.mutate(hint)}
                            isRegenerating={regenerateMutation.isPending}
                            onViewVersion={handleViewVersion}
                            onToggleFavorite={() => activeChatId && favoriteMutation.mutate(activeChatId)}
                          />
                        </div>
                      );
                    }

                    if (msg.role === "user") {
                      return (
                        <div key={msg.id}>
                          {idx > 0 && <div className="h-px bg-border/40" />}
                          <UserBlock
                            content={msg.content}
                            time={time}
                            imageUrls={msg.metadata?.image_urls as string[] | undefined}
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id}>
                        {idx > 0 && <div className="h-px bg-border/40" />}
                        <AiBlock
                          content={msg.content}
                          metadata={msg.metadata}
                          time={time}
                          onOptionSelect={(text) => sendMessageMutation.mutate(text)}
                        />
                      </div>
                    );
                  })}

                  {isThinking && (
                    <div className="py-3">
                      <ThinkingIndicator />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input bar */}
              <div className="border-t border-border bg-card px-4 py-3 md:px-10">
                <div className="mx-auto max-w-[760px]">
                  {/* Image previews */}
                  {attachedImages.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachedImages.map((img, idx) => (
                        <div key={idx} className="group relative size-14 overflow-hidden border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.preview} alt="attachment" className="size-full object-cover" />
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="size-4 text-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    className={`border bg-background transition-colors duration-150 focus-within:ring-1 focus-within:ring-ring ${isDraggingOver ? "border-primary/60 bg-primary/[0.02]" : "border-border"}`}
                    onDragEnter={handleInputDragEnter}
                    onDragLeave={handleInputDragLeave}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleInputDrop}
                  >
                    {/* Drop overlay */}
                    {isDraggingOver && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 bg-background/90 backdrop-blur-[2px]">
                        <div className="flex items-center justify-center rounded-full border-2 border-dashed border-primary/50 p-2">
                          <ImagePlus className="size-4 text-primary/70" />
                        </div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/70">Drop to attach</p>
                      </div>
                    )}
                    <textarea
                      ref={inputRef}
                      placeholder={hasFinalPrompt ? "Request an update or ask a follow-up…" : "Continue refining your prompt…"}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isThinking || isUploading}
                      rows={3}
                      className="min-h-[112px] w-full resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/60">
                          {hasFinalPrompt ? "Prompt support" : "Refine context"}
                        </p>
                        <p className="mt-1 hidden text-[11px] text-muted-foreground/45 sm:block">
                          {hasFinalPrompt ? "Ask for revisions, code, or next-step help." : "Answer follow-up questions and keep shaping the result."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="hidden font-mono text-[9px] text-muted-foreground/30 sm:inline">⌘↵</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isThinking || attachedImages.length >= 4}
                          title="Attach image"
                          className="flex h-8 items-center gap-1.5 border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                        >
                          <ImagePlus className="size-3" />
                          <span className="hidden sm:inline">{attachedImages.length > 0 ? `${attachedImages.length}/4` : "Image"}</span>
                        </button>
                        <button
                          onClick={handleSend}
                          disabled={!inputValue.trim() || isThinking || isUploading}
                          className="flex h-8 items-center gap-1.5 bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          {isUploading ? <RefreshCw className="size-3 animate-spin" /> : <Send className="size-3" />}
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Templates panel — desktop */}
        {showTemplatesPanel && (
          <>
            <div className="hidden w-[320px] shrink-0 lg:flex lg:flex-col">
              <TemplatesPanel
                onUse={handleUseTemplate}
                onClose={() => setShowTemplatesPanel(false)}
              />
            </div>
            {/* Mobile overlay */}
            <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
              <div className="flex w-[300px] flex-col">
                <TemplatesPanel
                  onUse={handleUseTemplate}
                  onClose={() => setShowTemplatesPanel(false)}
                />
              </div>
              <div
                className="flex-1 bg-background/60 backdrop-blur-sm"
                onClick={() => setShowTemplatesPanel(false)}
              />
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent size="sm" className="border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {confirmDialog?.mode === "clear-chats" ? "Clear all workspaces?" : "Delete workspace?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.mode === "clear-chats"
                ? "This will remove your full request chat history from the workspace view. This action cannot be undone."
                : `This will remove "${confirmDialog?.chat.title}" from your workspace history. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChatMutation.isPending || clearChatsMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteChatMutation.isPending || clearChatsMutation.isPending}
              onClick={() => {
                if (confirmDialog?.mode === "clear-chats") {
                  clearChatsMutation.mutate();
                  return;
                }
                if (confirmDialog?.mode === "delete-chat") {
                  deleteChatMutation.mutate(confirmDialog.chat);
                }
              }}
            >
              {deleteChatMutation.isPending || clearChatsMutation.isPending
                ? "Working..."
                : confirmDialog?.mode === "clear-chats"
                  ? "Clear all"
                  : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
