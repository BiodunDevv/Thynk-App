"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap, Lock } from "lucide-react";
import Link from "next/link";

import { useAuthModal } from "@/components/auth/auth-modal-provider";
import { XMarquee } from "@/components/marketing/x-marquee";
import { useAuthSession } from "@/lib/auth/session";
import { freeTestGenerate } from "@/lib/api/chats";
import { getCurrentUser } from "@/lib/api/users";
import { getPlans } from "@/lib/api/plans";
import { Textarea } from "@/components/ui/textarea";

/* ── Rotating word ──────────────────────────────────────────────── */
const ROTATING_WORDS = ["design", "code", "study", "content", "business"] as const;

function RotatingWord() {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block min-w-[7rem] text-left text-primary transition-all duration-300 ease-in-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)" }}
    >
      {ROTATING_WORDS[index]}
    </span>
  );
}

/* ── Thinking animation ─────────────────────────────────────────── */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {[0, 0.18, 0.36].map((delay, i) => (
          <span
            key={i}
            className="block size-2 rounded-full bg-primary"
            style={{ animation: `hero-dot 1.2s ease-in-out ${delay}s infinite` }}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        Thynk is thinking…
      </span>
      <style>{`
        @keyframes hero-dot {
          0%,100%{opacity:.25;transform:scale(.8)}
          50%{opacity:1;transform:scale(1)}
        }
      `}</style>
    </div>
  );
}

/* ── Usage bar — shown to authenticated users inside card ───────── */
function UsageBar({
  used,
  limit,
  planSlug,
}: {
  used: number;
  limit: number;
  planSlug: string;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  const isNear = pct >= 80;
  const isOut = pct >= 100;
  const isFree = planSlug === "free";

  return (
    <div className="border-t border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between text-[11px] mb-1.5">
        <div className="flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] text-muted-foreground">
          <Zap className="size-3 text-primary" />
          <span>Generations</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={[
              "font-mono font-semibold tabular-nums",
              isOut ? "text-destructive" : isNear ? "text-orange-500" : "text-foreground",
            ].join(" ")}
          >
            {used}
            <span className="font-normal text-muted-foreground">/{limit}</span>
          </span>
          {isFree && (
            <span className="border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              Free
            </span>
          )}
        </div>
      </div>

      {/* Track */}
      <div className="h-1 w-full overflow-hidden bg-muted">
        <div
          className={[
            "h-full transition-all duration-500",
            isOut ? "bg-destructive" : isNear ? "bg-orange-500" : "bg-primary",
          ].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status line */}
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        {isOut ? (
          <span className="text-destructive">Limit reached{isFree ? " — resets tomorrow" : ""}</span>
        ) : isNear ? (
          <span className="text-orange-500">{remaining} generation{remaining !== 1 ? "s" : ""} left</span>
        ) : (
          <span className="text-muted-foreground">{remaining} remaining{isFree ? " today" : ""}</span>
        )}
        {isFree && (
          <Link
            href="/pricing"
            className="flex items-center gap-1 text-[11px] text-primary transition-opacity hover:opacity-70"
          >
            Upgrade <ArrowRight className="size-2.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Main hero ──────────────────────────────────────────────────── */
type FreeTestState = "idle" | "thinking" | "done" | "exhausted";

const AI_TARGETS = ["ChatGPT", "Claude", "Gemini", "Midjourney", "General AI"];
const OUTPUT_STYLES = ["Prompt only", "With context", "With examples", "Step-by-step"];

export function HeroSection() {
  const { openAuthModal } = useAuthModal();
  const session = useAuthSession();
  const router = useRouter();

  const [prompt, setPrompt] = React.useState("");
  const [aiTarget, setAiTarget] = React.useState("");
  const [outputStyle, setOutputStyle] = React.useState("");
  const [freeTestState, setFreeTestState] = React.useState<FreeTestState>("idle");
  const [freeTestResponse, setFreeTestResponse] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const accessToken = session?.tokens.access_token ?? "";

  /* Fetch usage data when signed in */
  const userQuery = useQuery({
    queryKey: ["user-me", accessToken],
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
  const plan = plansQuery.data?.find((p) => p.id === user?.current_plan_id)
    ?? plansQuery.data?.find((p) => p.slug === "free");
  const used = user?.monthly_generation_count ?? 0;
  const limit = plan?.generation_limit ?? 5;
  const planSlug = plan?.slug ?? "free";
  const isAtLimit = used >= limit;

  const isThinking = freeTestState === "thinking";
  const isDone = freeTestState === "done";
  const isExhausted = freeTestState === "exhausted";

  async function handleStart() {
    if (session) {
      router.push("/workspace");
      return;
    }
    if (prompt.trim().length < 10) {
      openAuthModal("register");
      return;
    }
    setFreeTestState("thinking");
    try {
      const result = await freeTestGenerate(prompt.trim());
      setFreeTestResponse(result.content);
      setFreeTestState("done");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      setFreeTestState(status === 429 ? "exhausted" : "idle");
      if (status !== 429) openAuthModal("register");
    }
  }

  return (
    <section className="relative flex min-h-[calc(100vh-56px)] flex-col overflow-hidden bg-background">

      {/* Fine crosshatch grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px,transparent 1px),linear-gradient(to right,var(--foreground) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.022,
        }}
      />

      {/* ── ZONE 1: Headline ─────────────────────────────────────── */}
      <div className="relative flex flex-col items-center px-4 pb-8 pt-14 text-center sm:pt-18 lg:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 border border-border bg-card px-3.5 py-1.5 shadow-sm">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Prompt engineering — simplified
          </span>
        </div>

        <h1 className="max-w-[820px] text-[clamp(2.3rem,5.5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground">
          <span className="relative inline-block">
            Thynk
            {/* SVG brush-stroke underline — sits naturally below the baseline */}
            <svg
              aria-hidden
              className="absolute left-0 w-full"
              style={{ top: "calc(100% - 4px)", height: "8px" }}
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M1 5.5 C15 2, 35 7, 50 4.5 C65 2, 82 7, 99 4"
                stroke="var(--primary)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            </svg>
          </span>
          {" "}smarter.{" "}
          <br className="hidden sm:block" />
          <span className="text-muted-foreground">Build faster for </span>
          <RotatingWord />
          <span className="text-muted-foreground">.</span>
        </h1>

        <p className="mt-5 max-w-md text-[15px] leading-[1.75] text-muted-foreground">
          Turn rough ideas into sharp AI instructions — in seconds.
        </p>
      </div>

      {/* ── ZONE 2: Prompt workspace card ────────────────────────── */}
      <div className="relative flex flex-col items-center px-4 pb-6 pt-2">
        <div className="w-full max-w-[680px]">
          <div className="border border-border bg-card shadow-lg">

            {/* Terminal top bar */}
            <div className="flex items-center gap-2.5 border-b border-border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                <span className="size-2.5 rounded-full bg-muted-foreground/20" />
                <span className={`size-2.5 rounded-full transition-colors duration-300 ${isThinking ? "bg-primary" : "bg-primary/60"}`} />
              </div>
              <Zap className="size-3 text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Thynk Workspace
              </span>
              {session && (
                <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40">
                  {planSlug === "free" ? "Free plan" : "Pro"}
                </span>
              )}
            </div>

            {/* ── Idle / input state ── */}
            {!isThinking && !isDone && !isExhausted && (
              <div
                className="cursor-text px-5 pb-2 pt-5"
                onClick={() => textareaRef.current?.focus()}
              >
                <Textarea
                  ref={textareaRef}
                  className="min-h-[110px] resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
                  placeholder="Describe what you want to build, write, or create…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  autoComplete="off"
                />
                <p className="mt-1 text-[11px] text-muted-foreground/50">
                  Pick an idea below ↓ or write your own — then hit Start.
                </p>
              </div>
            )}

            {/* ── Thinking state ── */}
            {isThinking && (
              <div className="px-5 py-6 space-y-3">
                {prompt && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-primary px-3.5 py-2 text-[13px] leading-relaxed text-primary-foreground line-clamp-3">
                      {prompt}
                    </div>
                  </div>
                )}
                <ThinkingDots />
              </div>
            )}

            {/* ── Done state: AI response ── */}
            {isDone && freeTestResponse && (
              <div className="space-y-3 px-5 py-5">
                {prompt && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground">
                      {prompt}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center border border-border bg-muted">
                    <Zap className="size-3.5 text-primary" />
                  </div>
                  <div className="flex-1 border border-border bg-muted/40 px-4 py-3 text-[13px] leading-[1.7] text-foreground">
                    {freeTestResponse}
                  </div>
                </div>
                {/* Signup CTA */}
                <div className="border border-border bg-muted/20 px-4 py-3 space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    Continue this conversation + get <strong className="text-foreground">5 free generations/day</strong> — no credit card needed.
                  </p>
                  <button
                    onClick={() => openAuthModal("register")}
                    className="flex w-full items-center justify-center gap-1.5 bg-primary px-4 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Create free account <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Exhausted state ── */}
            {isExhausted && (
              <div className="px-5 py-7 text-center space-y-3">
                <div className="inline-flex size-10 items-center justify-center border border-border bg-muted">
                  <Lock className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">Free test already used</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Sign up for 5 free generations every day — free forever.
                  </p>
                </div>
                <button
                  onClick={() => openAuthModal("register")}
                  className="inline-flex items-center gap-1.5 bg-primary px-5 py-2 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Create free account <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}

            {/* ── Authenticated usage bar ── */}
            {session && user && plan && (
              <UsageBar used={used} limit={limit} planSlug={planSlug} />
            )}

            {/* ── Toolbar ── */}
            <div className="border-t border-border px-5 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                {/* Selects — hide on done/exhausted */}
                {!isDone && !isExhausted && (
                  <div className="flex flex-wrap gap-2">
                    {/* AI target */}
                    <div className="relative">
                      <select
                        value={aiTarget}
                        onChange={(e) => setAiTarget(e.target.value)}
                        disabled={isThinking}
                        className="appearance-none cursor-pointer border border-border bg-background py-1.5 pl-3 pr-7 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      >
                        <option value="">AI Target</option>
                        {AI_TARGETS.map((t) => (
                          <option key={t} value={t.toLowerCase().replace(/\s+/g, "-")}>{t}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </div>
                    {/* Output style */}
                    <div className="relative">
                      <select
                        value={outputStyle}
                        onChange={(e) => setOutputStyle(e.target.value)}
                        disabled={isThinking}
                        className="appearance-none cursor-pointer border border-border bg-background py-1.5 pl-3 pr-7 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      >
                        <option value="">Output</option>
                        {OUTPUT_STYLES.map((s) => (
                          <option key={s} value={s.toLowerCase().replace(/\s+/g, "-")}>{s}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40">
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className={`flex items-center gap-2 ${isDone || isExhausted ? "w-full justify-center" : "ml-auto"}`}>
                  {!isDone && !isExhausted && (
                    <Link
                      href="/pricing"
                      className="px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Pricing
                    </Link>
                  )}
                  {!isDone && !isExhausted && (
                    <button
                      onClick={handleStart}
                      disabled={isThinking || (Boolean(session) && isAtLimit)}
                      className="flex items-center gap-1.5 bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {isThinking
                        ? "Thinking…"
                        : session
                        ? isAtLimit ? "Limit reached" : "Open workspace"
                        : "Start creating"}
                      {!isThinking && <ArrowRight className="size-3" />}
                    </button>
                  )}
                  {(isDone || isExhausted) && (
                    <Link
                      href="/pricing"
                      className="px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      View pricing
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {["Free to start", "No expertise needed", "Any AI tool"].map((label) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg className="size-3 shrink-0 text-primary" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── ZONE 3: Marquee (after the input) ────────────────────── */}
      <div className="relative mt-4 overflow-hidden border-y border-border bg-muted/20 py-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
          style={{ background: "linear-gradient(to right,var(--background),transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
          style={{ background: "linear-gradient(to left,var(--background),transparent)" }}
        />
        <XMarquee onChipClick={(text) => { setPrompt(text); textareaRef.current?.focus(); }} />
      </div>

    </section>
  );
}
