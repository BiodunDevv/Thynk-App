"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type FreeTestState = "idle" | "thinking" | "done" | "exhausted";

type HeroPromptCardProps = {
  value: string;
  onChange: (value: string) => void;
  onStartCreating: () => void;
  isSignedIn?: boolean;
  freeTestState?: FreeTestState;
  freeTestResponse?: string | null;
  onSignUp?: () => void;
};

function ThinkingPulse() {
  return (
    <div className="flex items-center gap-3 px-1 py-6">
      <div className="flex items-center gap-1.5">
        <span
          className="block size-2 rounded-full bg-primary"
          style={{ animation: "hero-pulse 1.2s ease-in-out infinite" }}
        />
        <span
          className="block size-2 rounded-full bg-primary"
          style={{ animation: "hero-pulse 1.2s ease-in-out 0.2s infinite" }}
        />
        <span
          className="block size-2 rounded-full bg-primary"
          style={{ animation: "hero-pulse 1.2s ease-in-out 0.4s infinite" }}
        />
      </div>
      <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        Thynk is thinking…
      </span>
      <style>{`
        @keyframes hero-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export function HeroPromptCard({
  value,
  onChange,
  onStartCreating,
  isSignedIn = false,
  freeTestState = "idle",
  freeTestResponse = null,
  onSignUp,
}: HeroPromptCardProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const isThinking = freeTestState === "thinking";
  const isDone = freeTestState === "done";
  const isExhausted = freeTestState === "exhausted";

  return (
    <div className="border border-border bg-card shadow-md">
      {/* Card top bar */}
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-4 py-2.5">
        <Zap className="size-3.5 shrink-0 text-primary" />
        <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Thynk Prompt
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/20" />
          <span className="size-2 rounded-full bg-muted-foreground/20" />
          <span className={`size-2 rounded-full transition-colors duration-300 ${isThinking ? "bg-primary" : "bg-primary/60"}`} />
        </div>
      </div>

      {/* Input area — hidden when thinking/done/exhausted */}
      {!isThinking && !isDone && !isExhausted && (
        <>
          <div
            className="cursor-text px-4 pb-2 pt-4"
            onClick={() => textareaRef.current?.focus()}
          >
            <Textarea
              ref={textareaRef}
              className="min-h-[108px] resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
              placeholder="Describe what you want Thynk to create…"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="px-4 pb-3">
            <p className="text-[11px] text-muted-foreground">
              Click an idea from the flow above, or write your own.
            </p>
          </div>
        </>
      )}

      {/* Thinking state */}
      {isThinking && (
        <div className="px-4 py-2">
          {value && (
            <p className="mb-3 text-[14px] leading-relaxed text-foreground/60 line-clamp-2">
              {value}
            </p>
          )}
          <ThinkingPulse />
        </div>
      )}

      {/* Done state — show AI response */}
      {isDone && freeTestResponse && (
        <div className="px-4 py-4 space-y-3">
          {/* User prompt echo */}
          {value && (
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground">
                {value}
              </div>
            </div>
          )}
          {/* AI response bubble */}
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center border border-border bg-muted">
              <Zap className="size-3.5 text-primary" />
            </div>
            <div className="flex-1 border border-border bg-muted/30 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
              {freeTestResponse}
            </div>
          </div>
          {/* CTA */}
          <div className="pt-1">
            <Button
              size="sm"
              className="w-full gap-1.5 text-[13px]"
              onClick={onSignUp}
            >
              Sign up to continue
              <ArrowRight className="size-3.5" />
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Free · 5 generations/day · No credit card needed
            </p>
          </div>
        </div>
      )}

      {/* Exhausted state */}
      {isExhausted && (
        <div className="px-4 py-6 text-center space-y-3">
          <p className="text-[14px] text-foreground">
            You&apos;ve already used your free test.
          </p>
          <p className="text-[12px] text-muted-foreground">
            Sign up for 5 free generations per day.
          </p>
          <Button
            size="sm"
            className="gap-1.5 text-[13px]"
            onClick={onSignUp}
          >
            Create free account
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}

      <Separator />

      {/* Bottom controls */}
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {!isDone && !isExhausted && (
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              disabled={isThinking}
              className="border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground appearance-none cursor-pointer hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">AI target</option>
              <option value="chatgpt">ChatGPT</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="midjourney">Midjourney</option>
              <option value="general">General AI</option>
            </select>
            <select
              disabled={isThinking}
              className="border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground appearance-none cursor-pointer hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Output</option>
              <option value="prompt-only">Prompt only</option>
              <option value="with-context">With context</option>
              <option value="with-examples">With examples</option>
              <option value="step-by-step">Step-by-step</option>
            </select>
          </div>
        )}

        <div className={`flex items-center gap-2 ${isDone || isExhausted ? "w-full justify-center" : "ml-auto"}`}>
          {!isDone && !isExhausted && (
            <Button asChild variant="ghost" size="sm" className="h-8 text-[12px]">
              <Link href="/pricing">View pricing</Link>
            </Button>
          )}
          {!isDone && !isExhausted && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-[12px]"
              disabled={isThinking}
              onClick={onStartCreating}
            >
              {isThinking
                ? "Thinking…"
                : isSignedIn
                ? "Open workspace"
                : "Start creating"}
              {!isThinking && <ArrowRight className="size-3.5" />}
            </Button>
          )}
          {(isDone || isExhausted) && (
            <Button asChild variant="ghost" size="sm" className="h-8 text-[12px]">
              <Link href="/pricing">View pricing</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
