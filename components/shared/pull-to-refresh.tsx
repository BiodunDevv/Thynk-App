"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

const TRIGGER_THRESHOLD = 72;   // px of pull needed to trigger refresh
const MAX_PULL = 110;           // px — rubber-band ceiling
const RESISTANCE = 0.42;        // how much drag is applied (lower = more resistance)

type Phase = "idle" | "pulling" | "ready" | "refreshing" | "done";

function isPWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isScrolledToTop(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) {
    return (window.scrollY ?? document.documentElement.scrollTop) <= 0;
  }
  return target.scrollTop <= 0;
}

export function PullToRefresh() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [pullY, setPullY] = React.useState(0);
  const [visible, setVisible] = React.useState(false);

  const startYRef = React.useRef(0);
  const currentYRef = React.useRef(0);
  const touchTargetRef = React.useRef<EventTarget | null>(null);
  const animFrameRef = React.useRef<number>(0);
  const phaseRef = React.useRef<Phase>("idle");

  function updatePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  React.useEffect(() => {
    // Only activate in PWA standalone mode
    if (!isPWA()) return;

    function onTouchStart(e: TouchEvent) {
      if (phaseRef.current === "refreshing") return;
      touchTargetRef.current = e.target;
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (phaseRef.current === "refreshing") return;

      const touchY = e.touches[0].clientY;
      const delta = touchY - startYRef.current;

      // Only activate when pulling down from the top of a scrollable area
      if (delta <= 0 || !isScrolledToTop(touchTargetRef.current)) {
        if (phaseRef.current === "pulling" || phaseRef.current === "ready") {
          updatePhase("idle");
          setPullY(0);
          setVisible(false);
        }
        return;
      }

      currentYRef.current = touchY;

      // Apply rubber-band resistance
      const raw = delta * RESISTANCE;
      const clamped = Math.min(raw, MAX_PULL);

      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => {
        setVisible(true);
        setPullY(clamped);
        updatePhase(clamped >= TRIGGER_THRESHOLD * RESISTANCE ? "ready" : "pulling");
      });

      // Prevent default scroll only when we are actively pulling the indicator
      if (delta > 8) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      if (phaseRef.current === "refreshing") return;

      cancelAnimationFrame(animFrameRef.current);

      if (phaseRef.current === "ready") {
        updatePhase("refreshing");
        setPullY(TRIGGER_THRESHOLD * RESISTANCE); // settle to trigger position

        // Small delay so the spinner is visible, then reload
        setTimeout(() => {
          window.location.reload();
        }, 700);
      } else {
        // Snap back
        updatePhase("idle");
        setPullY(0);
        setTimeout(() => setVisible(false), 200);
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (!visible && phase === "idle") return null;

  const progress = Math.min(pullY / (TRIGGER_THRESHOLD * RESISTANCE), 1);
  const isSpinning = phase === "refreshing";
  const isReady = phase === "ready";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999] flex justify-center"
      style={{
        transform: `translateY(${pullY - 44}px)`,
        transition: phase === "idle" || phase === "refreshing"
          ? "transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease"
          : "none",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className={`flex size-10 items-center justify-center border border-border bg-card shadow-lg transition-colors duration-150 ${
          isReady || isSpinning ? "border-primary/40 bg-primary/5" : ""
        }`}
        style={{
          borderRadius: "50%",
        }}
      >
        <RefreshCw
          className={`size-4 transition-colors duration-150 ${
            isReady || isSpinning ? "text-primary" : "text-muted-foreground"
          } ${isSpinning ? "animate-spin" : ""}`}
          style={
            !isSpinning
              ? { transform: `rotate(${progress * 270}deg)`, transition: "none" }
              : undefined
          }
        />
      </div>

      {/* Release hint — only shown when ready */}
      {isReady && !isSpinning && (
        <div
          className="absolute top-11 left-1/2 -translate-x-1/2 border border-border bg-card px-3 py-1 shadow-md"
          style={{ whiteSpace: "nowrap" }}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
            Release to refresh
          </span>
        </div>
      )}
    </div>
  );
}
