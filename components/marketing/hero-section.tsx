"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight, Zap, Send, ImagePlus, X, RefreshCw,
  Layers, FileText, Code2, PenLine, Megaphone, Briefcase, GraduationCap,
} from "lucide-react";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { XMarquee } from "@/components/marketing/x-marquee";
import { useAuthSession, getAccessToken } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/api/users";
import { getPlans } from "@/lib/api/plans";
import { createRequestChat, type RequestChatRecord } from "@/lib/api/chats";
import { uploadToCloudinary } from "@/lib/cloudinary";

/* ── Categories ──────────────────────────────────────────────────── */
const CATEGORIES = ["design", "development", "student", "content", "marketing", "writing", "business"] as const;
type Category = (typeof CATEGORIES)[number];

/* ── AI-grade category inference ─────────────────────────────────── */
type Signal = { kw: string; weight: number };
const CATEGORY_SIGNALS: Record<Category, Signal[]> = {
  design: [
    { kw: "design", weight: 5 }, { kw: "ui", weight: 5 }, { kw: "ux", weight: 5 },
    { kw: "interface", weight: 4 }, { kw: "wireframe", weight: 5 }, { kw: "mockup", weight: 5 },
    { kw: "prototype", weight: 4 }, { kw: "figma", weight: 5 }, { kw: "sketch", weight: 3 },
    { kw: "logo", weight: 4 }, { kw: "brand", weight: 3 }, { kw: "branding", weight: 5 },
    { kw: "icon", weight: 3 }, { kw: "illustration", weight: 4 }, { kw: "visual", weight: 3 },
    { kw: "typography", weight: 4 }, { kw: "font", weight: 3 }, { kw: "color palette", weight: 5 },
    { kw: "colour", weight: 3 }, { kw: "layout", weight: 4 }, { kw: "grid", weight: 3 },
    { kw: "style guide", weight: 5 }, { kw: "aesthetic", weight: 4 },
    { kw: "landing page design", weight: 5 }, { kw: "app design", weight: 5 },
    { kw: "dashboard design", weight: 5 }, { kw: "responsive", weight: 2 },
    { kw: "animation", weight: 2 },
  ],
  development: [
    { kw: "code", weight: 4 }, { kw: "coding", weight: 5 }, { kw: "programming", weight: 5 },
    { kw: "function", weight: 3 }, { kw: "algorithm", weight: 5 }, { kw: "api", weight: 4 },
    { kw: "backend", weight: 5 }, { kw: "frontend", weight: 5 }, { kw: "full stack", weight: 5 },
    { kw: "bug", weight: 4 }, { kw: "debug", weight: 5 }, { kw: "refactor", weight: 5 },
    { kw: "deploy", weight: 4 }, { kw: "database", weight: 4 }, { kw: "sql", weight: 4 },
    { kw: "typescript", weight: 5 }, { kw: "javascript", weight: 5 }, { kw: "python", weight: 5 },
    { kw: "react", weight: 5 }, { kw: "next.js", weight: 5 }, { kw: "node", weight: 4 },
    { kw: "docker", weight: 5 }, { kw: "kubernetes", weight: 5 }, { kw: "ci/cd", weight: 5 },
    { kw: "microservice", weight: 5 }, { kw: "graphql", weight: 5 }, { kw: "websocket", weight: 5 },
    { kw: "endpoint", weight: 4 }, { kw: "unit test", weight: 5 },
  ],
  student: [
    { kw: "essay", weight: 5 }, { kw: "thesis", weight: 5 }, { kw: "dissertation", weight: 5 },
    { kw: "assignment", weight: 5 }, { kw: "homework", weight: 5 }, { kw: "exam", weight: 5 },
    { kw: "study", weight: 4 }, { kw: "quiz", weight: 5 }, { kw: "lecture", weight: 5 },
    { kw: "course", weight: 4 }, { kw: "academic", weight: 5 }, { kw: "university", weight: 5 },
    { kw: "college", weight: 5 }, { kw: "tutor", weight: 5 }, { kw: "research paper", weight: 5 },
    { kw: "literature review", weight: 5 }, { kw: "citation", weight: 5 }, { kw: "bibliography", weight: 5 },
    { kw: "apa", weight: 5 }, { kw: "mla format", weight: 5 },
  ],
  content: [
    { kw: "post", weight: 3 }, { kw: "social media", weight: 5 }, { kw: "caption", weight: 5 },
    { kw: "instagram", weight: 5 }, { kw: "tiktok", weight: 5 }, { kw: "youtube", weight: 4 },
    { kw: "video", weight: 3 }, { kw: "reel", weight: 5 }, { kw: "thread", weight: 4 },
    { kw: "tweet", weight: 5 }, { kw: "newsletter", weight: 4 }, { kw: "blog post", weight: 5 },
    { kw: "article", weight: 3 }, { kw: "podcast", weight: 5 }, { kw: "content", weight: 3 },
    { kw: "engagement", weight: 4 }, { kw: "creator", weight: 4 }, { kw: "viral", weight: 4 },
  ],
  marketing: [
    { kw: "marketing", weight: 5 }, { kw: "campaign", weight: 5 }, { kw: "advertise", weight: 5 },
    { kw: "advertisement", weight: 5 }, { kw: "ad copy", weight: 5 }, { kw: "sales", weight: 4 },
    { kw: "funnel", weight: 5 }, { kw: "conversion", weight: 5 }, { kw: "seo", weight: 5 },
    { kw: "brand awareness", weight: 5 }, { kw: "lead generation", weight: 5 },
    { kw: "email campaign", weight: 5 }, { kw: "cold email", weight: 5 },
    { kw: "paid ads", weight: 5 }, { kw: "google ads", weight: 5 }, { kw: "meta ads", weight: 5 },
    { kw: "value proposition", weight: 5 }, { kw: "copywriting", weight: 4 },
  ],
  writing: [
    { kw: "write", weight: 2 }, { kw: "writing", weight: 3 }, { kw: "draft", weight: 4 },
    { kw: "poem", weight: 5 }, { kw: "poetry", weight: 5 }, { kw: "novel", weight: 5 },
    { kw: "fiction", weight: 5 }, { kw: "short story", weight: 5 }, { kw: "narrative", weight: 5 },
    { kw: "character", weight: 4 }, { kw: "plot", weight: 5 }, { kw: "dialogue", weight: 5 },
    { kw: "chapter", weight: 5 }, { kw: "memoir", weight: 5 }, { kw: "biography", weight: 5 },
    { kw: "creative writing", weight: 5 }, { kw: "worldbuilding", weight: 5 },
    { kw: "storytelling", weight: 5 }, { kw: "fantasy", weight: 5 }, { kw: "thriller", weight: 5 },
    { kw: "romance", weight: 5 }, { kw: "sci-fi", weight: 5 }, { kw: "horror", weight: 5 },
  ],
  business: [
    { kw: "business", weight: 5 }, { kw: "startup", weight: 5 }, { kw: "entrepreneur", weight: 5 },
    { kw: "pitch", weight: 4 }, { kw: "pitch deck", weight: 5 }, { kw: "investor", weight: 5 },
    { kw: "revenue", weight: 4 }, { kw: "profit", weight: 4 }, { kw: "strategy", weight: 3 },
    { kw: "business plan", weight: 5 }, { kw: "proposal", weight: 4 }, { kw: "stakeholder", weight: 5 },
    { kw: "budget", weight: 4 }, { kw: "forecast", weight: 5 }, { kw: "market fit", weight: 5 },
    { kw: "saas", weight: 4 }, { kw: "mrr", weight: 5 }, { kw: "funding", weight: 5 },
    { kw: "valuation", weight: 5 }, { kw: "vc", weight: 5 }, { kw: "executive", weight: 4 },
  ],
};

function detectCategory(text: string): { category: Category; confidence: number } | null {
  if (text.trim().length < 6) return null;
  const lower = text.toLowerCase();
  const scores = CATEGORIES.map((cat) => {
    let score = 0;
    for (const { kw, weight } of CATEGORY_SIGNALS[cat]) {
      if (lower === kw || lower.includes(` ${kw} `) || lower.startsWith(`${kw} `) || lower.endsWith(` ${kw}`)) {
        score += weight * 3;
      } else if (new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)) {
        score += weight * 2;
      } else if (lower.includes(kw)) {
        score += weight;
      }
    }
    return { cat, score };
  });
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];
  if (top.score < 4) return null;
  const margin = second.score > 0 ? top.score / second.score : Infinity;
  if (margin < 1.25 && top.score < 10) return null;
  const maxPossible = Math.max(...CATEGORIES.map((cat) =>
    CATEGORY_SIGNALS[cat].reduce((s, sig) => s + sig.weight * 3, 0),
  ));
  const confidence = Math.min((top.score / maxPossible) * 100 * 4, 100);
  return { category: top.cat, confidence };
}

/* ── Typing placeholder animation ────────────────────────────────── */
const PLACEHOLDER_PHRASES = [
  "Describe what you want to build, write, or create…",
  "e.g. A landing page for my SaaS product…",
  "e.g. An essay on the ethics of AI…",
  "e.g. A Python script that parses JSON…",
  "e.g. Social media captions for a fashion brand…",
  "e.g. A pitch deck for my startup idea…",
  "e.g. A short story about time travel…",
];

function useTypingPlaceholder(active: boolean) {
  const [phraseIdx, setPhraseIdx] = React.useState(0);
  const [displayed, setDisplayed] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    const phrase = PLACEHOLDER_PHRASES[phraseIdx];
    if (paused) {
      const t = setTimeout(() => { setPaused(false); setIsDeleting(true); }, 2200);
      return () => clearTimeout(t);
    }
    if (!isDeleting && displayed.length < phrase.length) {
      const t = setTimeout(() => setDisplayed(phrase.slice(0, displayed.length + 1)), 42);
      return () => clearTimeout(t);
    }
    if (!isDeleting && displayed.length === phrase.length) {
      const t = setTimeout(() => setPaused(true), 0);
      return () => clearTimeout(t);
    }
    if (isDeleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 18);
      return () => clearTimeout(t);
    }
    if (isDeleting && displayed.length === 0) {
      const t = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIdx((i) => (i + 1) % PLACEHOLDER_PHRASES.length);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [active, displayed, isDeleting, paused, phraseIdx]);

  return displayed;
}

/* ── Category metadata ───────────────────────────────────────────── */
const CATEGORY_META: Record<Category, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  design:      { label: "Design",      icon: Layers,         color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/25" },
  development: { label: "Development", icon: Code2,          color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/25" },
  student:     { label: "Student",     icon: GraduationCap,  color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/25" },
  content:     { label: "Content",     icon: FileText,       color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/25" },
  marketing:   { label: "Marketing",   icon: Megaphone,      color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/25" },
  writing:     { label: "Writing",     icon: PenLine,        color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/25" },
  business:    { label: "Business",    icon: Briefcase,      color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/25" },
};

/* ── Detected category badge ─────────────────────────────────────── */
function DetectedBadge({ category, confidence, visible }: { category: Category; confidence: number; visible: boolean }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const confidenceTier = confidence >= 60 ? "high" : confidence >= 30 ? "medium" : "low";
  return (
    <div className="flex items-center gap-2 transition-all duration-300"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateX(0)" : "translateX(6px)" }}>
      <span className={["size-1.5 rounded-full",
        confidenceTier === "high" ? "bg-emerald-500" : confidenceTier === "medium" ? "bg-amber-400" : "bg-muted-foreground/40",
      ].join(" ")} title={`Confidence: ${Math.round(confidence)}%`} />
      <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground/50">detected</span>
      <span className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.15em] ${meta.bg} ${meta.color}`}>
        <Icon className="size-2.5" />
        {meta.label}
      </span>
    </div>
  );
}

/* ── Image attachment preview ────────────────────────────────────── */
function ImagePreview({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="group relative size-14 shrink-0 overflow-hidden border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="attachment" className="size-full object-cover" />
      <button
        onClick={onRemove}
        className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <X className="size-4 text-foreground" />
      </button>
    </div>
  );
}

/* ── Usage summary ───────────────────────────────────────────────── */
function UsageRing({
  used,
  limit,
  planSlug,
  subscriptionGenerationsRemaining,
  grantedCreditsRemaining,
  totalPointsRemaining,
}: {
  used: number;
  limit: number;
  planSlug: string;
  subscriptionGenerationsRemaining: number;
  grantedCreditsRemaining: number;
  totalPointsRemaining: number;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  const isNear = pct >= 80;
  const isOut = pct >= 100;
  const statusColor = isOut ? "text-destructive" : isNear ? "text-primary" : "text-foreground";
  const R = 16;
  const C = 2 * Math.PI * R;
  const dashOffset = C - (pct / 100) * C;

  if (planSlug !== "free") {
    return (
      <div className="flex flex-col gap-3 border border-border bg-card px-3 py-3">
        <div className="space-y-1 border-b border-border pb-3">
          <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
            Current plan
          </p>
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-mono text-[22px] font-semibold leading-none tabular-nums text-foreground">
                {subscriptionGenerationsRemaining.toLocaleString()}
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                subscription allowance
              </p>
            </div>
            <span className="border border-border bg-muted px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              Pro
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              Granted
            </span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
              {grantedCreditsRemaining.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
              Total
            </span>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
              {totalPointsRemaining.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 border border-border bg-card px-3 py-3">
      <div className="relative flex items-center justify-center">
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={R} fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <circle cx="22" cy="22" r={R} fill="none"
            stroke={isOut ? "var(--destructive)" : "var(--primary)"}
            strokeWidth="2.5" strokeDasharray={C} strokeDashoffset={dashOffset}
            strokeLinecap="round" transform="rotate(-90 22 22)"
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-none">
          <span className={`font-mono text-[11px] font-bold tabular-nums ${statusColor}`}>{remaining}</span>
          <span className="font-mono text-[6px] uppercase tracking-wider text-muted-foreground/50">left</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
          Generations
        </p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums">
          <span className={`font-semibold ${statusColor}`}>{used}</span>
          <span className="text-muted-foreground/40">/{limit}</span>
        </p>
      </div>
      {isOut ? (
        <p className="font-mono text-[7px] uppercase tracking-wider text-destructive">Limit reached</p>
      ) : isNear ? (
        <p className="font-mono text-[7px] uppercase tracking-wider text-primary">Running low</p>
      ) : (
        <p className="font-mono text-[7px] uppercase tracking-wider text-muted-foreground/40">
          Resets weekly
        </p>
      )}
      <a
        href="/pricing"
        className="flex w-full items-center justify-center gap-1 border border-border bg-muted py-1 font-mono text-[7px] uppercase tracking-wider text-foreground transition-colors hover:bg-background"
      >
        Upgrade <ArrowRight className="size-2" />
      </a>
    </div>
  );
}

/* ── Rotating word ───────────────────────────────────────────────── */
const ROTATING_DISPLAY = ["design", "code", "study", "content", "business"];

function RotatingWord() {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIndex((i) => (i + 1) % ROTATING_DISPLAY.length); setVisible(true); }, 280);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="text-primary transition-all duration-280 ease-in-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(5px)", display: "inline-block" }}
    >
      {ROTATING_DISPLAY[index]}
    </span>
  );
}

/* ── Main hero ──────────────────────────────────────────────────── */
export function HeroSection() {
  const { openAuthModal } = useAuthModal();
  const session = useAuthSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = React.useState("");
  const [category, setCategory] = React.useState<Category>("design");
  const [detection, setDetection] = React.useState<{ category: Category; confidence: number } | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [attachedImages, setAttachedImages] = React.useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragCounterRef = React.useRef(0);

  const accessToken = session?.tokens.access_token ?? "";

  const userQuery = useQuery({
    queryKey: ["user-profile", accessToken],
    queryFn: () => getCurrentUser(accessToken),
    enabled: Boolean(accessToken),
    staleTime: 30_000,
  });
  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
  });

  const user = userQuery.data;
  const sessionPlanId = session?.plan?.plan_id ?? null;
  const plan = plansQuery.data?.find((p) => p.id === user?.current_plan_id)
    ?? plansQuery.data?.find((p) => p.id === sessionPlanId)
    ?? plansQuery.data?.find((p) => p.slug === "free");
  const used = user?.monthly_generation_count ?? 0;
  const limit = plan?.generation_limit ?? 5;
  const planSlug = plan?.slug ?? "free";
  const subscriptionGenerationsRemaining = user?.subscription_generations_remaining ?? 0;
  const grantedCreditsRemaining = user?.granted_credits_remaining ?? 0;
  const totalPointsRemaining = user?.total_points_remaining ?? 0;
  const isAtLimit = used >= limit;

  React.useEffect(() => {
    const t = setTimeout(() => {
      const result = detectCategory(prompt);
      setDetection(result);
      if (result) setCategory(result.category);
    }, 350);
    return () => clearTimeout(t);
  }, [prompt]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken();
      if (!token) throw new Error("unauthenticated");
      const title = prompt.trim().slice(0, 60) || "New chat";

      let imageUrls: string[] = [];
      if (attachedImages.length > 0) {
        setIsUploading(true);
        try {
          imageUrls = await Promise.all(attachedImages.map((a) => uploadToCloudinary(a.file)));
        } finally {
          setIsUploading(false);
        }
      }

      return createRequestChat({ title, category, message: prompt.trim(), image_urls: imageUrls }, token);
    },
    onMutate: () => {
      toast.loading("Starting your workspace…", { id: "create-chat" });
    },
    onSuccess: (chat: RequestChatRecord) => {
      toast.success("Workspace ready", { id: "create-chat" });
      queryClient.setQueryData(["request-chat-history", accessToken], (old: RequestChatRecord[] | undefined) =>
        old ? [chat, ...old] : [chat],
      );
      router.push(`/workspace?chat=${chat.id}`);
    },
    onError: () => {
      toast.error("Failed to start workspace. Try again.", { id: "create-chat" });
    },
  });

  function addFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setAttachedImages((prev) => {
      const slots = 4 - prev.length;
      if (slots <= 0) return prev;
      const toAdd = imageFiles.slice(0, slots).map((file) => ({ file, preview: URL.createObjectURL(file) }));
      return [...prev, ...toAdd];
    });
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (!session) { openAuthModal("register"); return; }
    addFiles(Array.from(e.dataTransfer.files));
  }

  function removeImage(idx: number) {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function handleStart() {
    if (!session) { openAuthModal("register"); return; }
    if (isAtLimit) return;
    if (prompt.trim().length < 3) { textareaRef.current?.focus(); return; }
    createMutation.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleStart(); }
  }

  const isPending = createMutation.isPending || isUploading;
  const typingPlaceholder = useTypingPlaceholder(!session && !isFocused);
  const placeholder = session
    ? "Describe what you want to build, write, or create…"
    : (typingPlaceholder + (typingPlaceholder.length > 0 ? "▍" : ""));

  const headlineWord = detection
    ? CATEGORY_META[detection.category].label.toLowerCase()
    : null;
  const detectedColor = detection ? CATEGORY_META[detection.category].color : "text-primary";

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-background">

      {/* Fine grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
          backgroundSize: "40px 40px", opacity: 0.022,
        }}
      />

      {/* ── Content centred vertically ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-16">

        {/* Label pill */}
        <div className="mb-8 inline-flex items-center gap-2 border border-border bg-card/80 px-3.5 py-1.5 shadow-sm backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Prompt engineering — simplified
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-4 max-w-[840px] text-center text-[clamp(2.4rem,5.5vw,3.6rem)] font-semibold leading-[1.07] tracking-[-0.035em] text-foreground">
          <span className="relative inline-block">
            Thynk
            <svg aria-hidden className="absolute left-0 w-full"
              style={{ top: "calc(100% - 4px)", height: "8px" }}
              viewBox="0 0 100 8" preserveAspectRatio="none" fill="none">
              <path d="M1 5.5 C15 2, 35 7, 50 4.5 C65 2, 82 7, 99 4"
                stroke="var(--primary)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            </svg>
          </span>
          {" "}smarter.{" "}
          <br className="hidden sm:block" />
          <span className="text-muted-foreground">Build faster for </span>
          <span className="inline-block min-w-[7rem] text-left transition-all duration-300">
            {headlineWord ? (
              <span className={`${detectedColor} transition-colors duration-300`}>{headlineWord}</span>
            ) : (
              <RotatingWord />
            )}
          </span>
          <span className="text-muted-foreground">.</span>
        </h1>

        <p className="mb-10 max-w-[540px] text-center text-[15px] leading-[1.75] text-muted-foreground">
          Turn rough ideas into sharp AI instructions — in seconds. Include images, describe your goal, and let Thynk craft the perfect prompt.
        </p>

        {/* ── Prompt card + usage ring ── */}
        <div className="flex w-full max-w-[900px] items-start gap-4">

          {/* Input card */}
          <div className="min-w-0 flex-1">
            <div
              className={`relative overflow-hidden border bg-card shadow-xl shadow-black/5 transition-colors duration-150 ${isDragging ? "border-primary/60 bg-primary/[0.02]" : "border-border"}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drop overlay */}
              {isDragging && (
                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/90 backdrop-blur-[2px]">
                  <div className="flex items-center justify-center rounded-full border-2 border-dashed border-primary/50 p-4">
                    <ImagePlus className="size-6 text-primary/70" />
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary/70">Drop to attach</p>
                  <p className="font-mono text-[9px] text-muted-foreground/50">{4 - attachedImages.length} slot{4 - attachedImages.length !== 1 ? "s" : ""} remaining</p>
                </div>
              )}

              {/* Terminal bar */}
              <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                  <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                  <span className={`size-2.5 rounded-full transition-colors duration-300 ${isPending ? "animate-pulse bg-primary" : isFocused ? "bg-primary" : "bg-primary/60"}`} />
                </div>
                <Zap className="size-3 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Thynk Workspace</span>
                <div className="ml-auto">
                  {detection && session ? (
                    <DetectedBadge category={detection.category} confidence={detection.confidence} visible />
                  ) : session && plan ? (
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40">
                      {planSlug === "free" ? "Free plan" : "Pro"}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Image attachments row */}
              {attachedImages.length > 0 && (
                <div className="flex gap-2 border-b border-border px-4 py-3">
                  {attachedImages.map((img, idx) => (
                    <ImagePreview key={idx} src={img.preview} onRemove={() => removeImage(idx)} />
                  ))}
                </div>
              )}

              {/* Textarea */}
              <div
                className="cursor-text px-5 pb-2 pt-5"
                onClick={() => textareaRef.current?.focus()}
              >
                <textarea
                  ref={textareaRef}
                  className="min-h-[120px] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-foreground shadow-none outline-none placeholder:text-muted-foreground/35"
                  placeholder={placeholder}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  disabled={isPending}
                  autoComplete="off"
                />
                {session && (
                  <p className="mt-1 text-[11px] text-muted-foreground/40">
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">⌘</kbd>
                    {"+"}
                    <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] text-muted-foreground">↵</kbd>
                    {" "}to start · Drop images anywhere on this card
                  </p>
                )}
              </div>

              {/* Toolbar */}
              <div className="border-t border-border px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {/* Category select */}
                    {session && (
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => { setCategory(e.target.value as Category); setDetection(null); }}
                          disabled={isPending}
                          className="appearance-none cursor-pointer border border-border bg-background py-1.5 pl-3 pr-7 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                          <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                            <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </div>
                    )}

                    {/* Image attach */}
                    {session && (
                      <>
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
                          disabled={isPending || attachedImages.length >= 4}
                          title="Attach image (max 4)"
                          className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                          <ImagePlus className="size-3.5" />
                          {attachedImages.length > 0 ? `${attachedImages.length}/4` : "Image"}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a href="/pricing" className="px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
                    {!session ? (
                      <button onClick={() => openAuthModal("register")}
                        className="flex items-center gap-1.5 bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90">
                        Get started free <ArrowRight className="size-3" />
                      </button>
                    ) : (
                      <button onClick={handleStart}
                        disabled={isPending || isAtLimit || prompt.trim().length < 3}
                        className="flex items-center gap-1.5 bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                        {isPending
                          ? <><RefreshCw className="size-3 animate-spin" /> {isUploading ? "Uploading…" : "Starting…"}</>
                          : isAtLimit
                          ? "Limit reached"
                          : <><Send className="size-3" /> Start chat</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Trust strip */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {["5 generations/week", "No credit card", "Image context support"].map((label) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <svg className="size-3 shrink-0 text-primary" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Usage ring — right side */}
          {session && user && plan && (
            <div className="hidden w-[110px] shrink-0 sm:block">
              <UsageRing
                used={used}
                limit={limit}
                planSlug={planSlug}
                subscriptionGenerationsRemaining={subscriptionGenerationsRemaining}
                grantedCreditsRemaining={grantedCreditsRemaining}
                totalPointsRemaining={totalPointsRemaining}
              />
            </div>
          )}
        </div>

        {/* ── Marquee ── */}
        <div className="relative mt-10 w-full overflow-hidden border-y border-border bg-muted/20 py-4">
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
            style={{ background: "linear-gradient(to right,var(--background),transparent)" }} />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
            style={{ background: "linear-gradient(to left,var(--background),transparent)" }} />
          <XMarquee onChipClick={(text) => {
            if (!session) { openAuthModal("register"); return; }
            setPrompt(text);
            textareaRef.current?.focus();
          }} />
        </div>

      </div>
    </section>
  );
}
