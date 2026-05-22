"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";

/* ── Tuning constants ─────────────────────────────────────────────── */
const COMMIT_DELTA   = 14;   // px of intentional downward movement before we lock in
const TRIGGER_DIST   = 80;   // px of visual pull needed to arm the "ready" state
const MAX_PULL       = 120;  // px — rubber-band ceiling
const RESISTANCE     = 0.38; // <1 = more resistance (feels native)
const AT_TOP_BUFFER  = 4;    // px — tolerates Android's fractional scrollTop values
const FAST_SWIPE_VEL = 1.8;  // px/ms — above this we treat it as a scroll flick, not PTR

type Phase = "idle" | "pulling" | "ready" | "refreshing";

/* ── Helpers ──────────────────────────────────────────────────────── */
function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

/** Walk up the DOM and find the nearest scrollable ancestor (or window). */
function findScrollable(el: Element | null): Element | null {
  while (el && el !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(el);
    if (overflowY === "auto" || overflowY === "scroll") return el;
    el = el.parentElement;
  }
  return null;
}

function scrollTopOf(el: Element | null): number {
  if (!el) return window.scrollY ?? document.documentElement.scrollTop;
  return el.scrollTop;
}

/* ── Component ────────────────────────────────────────────────────── */
export function PullToRefresh() {
  const [phase, setPhase]     = React.useState<Phase>("idle");
  const [pullY, setPullY]     = React.useState(0);
  const [show, setShow]       = React.useState(false);

  // Refs so event listeners always read fresh values without re-registering
  const phaseRef      = React.useRef<Phase>("idle");
  const startY        = React.useRef(0);
  const startTime     = React.useRef(0);
  const scrollable    = React.useRef<Element | null>(null);
  const locked        = React.useRef(false); // true once we've committed to PTR
  const raf           = React.useRef(0);

  function syncPhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  React.useEffect(() => {
    if (!isPWA()) return;

    /* touchstart — record origin, find scrollable ancestor */
    function onStart(e: TouchEvent) {
      if (phaseRef.current === "refreshing") return;
      startY.current    = e.touches[0].clientY;
      startTime.current = performance.now();
      locked.current    = false;

      const target = e.target instanceof Element ? e.target : null;
      scrollable.current = target ? findScrollable(target) : null;
    }

    /* touchmove — the core logic */
    function onMove(e: TouchEvent) {
      if (phaseRef.current === "refreshing") return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY.current;

      // Not a downward swipe
      if (deltaY <= 0) {
        if (locked.current) release(false);
        return;
      }

      // Reject fast flick-scrolls (user is trying to scroll, not PTR)
      const elapsed = performance.now() - startTime.current;
      if (!locked.current && elapsed > 0 && deltaY / elapsed > FAST_SWIPE_VEL) return;

      // Require the nearest scrollable container (or window) to be at the top
      if (scrollTopOf(scrollable.current) > AT_TOP_BUFFER) {
        if (locked.current) release(false);
        return;
      }

      // Wait for a deliberate committed downward drag before locking in
      if (!locked.current) {
        if (deltaY < COMMIT_DELTA) return;
        locked.current = true;
      }

      // We own this gesture — prevent the browser's own scroll/bounce
      e.preventDefault();

      const visual = Math.min(deltaY * RESISTANCE, MAX_PULL);

      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setShow(true);
        setPullY(visual);
        syncPhase(visual >= TRIGGER_DIST * RESISTANCE ? "ready" : "pulling");
      });
    }

    /* touchend / touchcancel */
    function onEnd() {
      if (phaseRef.current === "refreshing") return;
      cancelAnimationFrame(raf.current);

      if (phaseRef.current === "ready") {
        // Arm the refresh
        syncPhase("refreshing");
        setPullY(TRIGGER_DIST * RESISTANCE); // settle at trigger line

        setTimeout(() => {
          window.location.reload();
        }, 750);
      } else {
        release(false);
      }

      locked.current = false;
    }

    function release(keepVisible: boolean) {
      syncPhase("idle");
      setPullY(0);
      if (!keepVisible) {
        setTimeout(() => setShow(false), 220);
      }
    }

    document.addEventListener("touchstart",  onStart,  { passive: true });
    document.addEventListener("touchmove",   onMove,   { passive: false });
    document.addEventListener("touchend",    onEnd,    { passive: true });
    document.addEventListener("touchcancel", onEnd,    { passive: true });

    return () => {
      document.removeEventListener("touchstart",  onStart);
      document.removeEventListener("touchmove",   onMove);
      document.removeEventListener("touchend",    onEnd);
      document.removeEventListener("touchcancel", onEnd);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!show && phase === "idle") return null;

  const progress   = Math.min(pullY / (TRIGGER_DIST * RESISTANCE), 1);
  const isSpinning = phase === "refreshing";
  const isReady    = phase === "ready";
  const isActive   = isReady || isSpinning;

  // Indicator sits at top; translateY moves it into view as pullY grows
  const translateY = pullY - 48;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex flex-col items-center"
      style={{
        transform: `translateY(${translateY}px)`,
        transition:
          phase === "idle" || phase === "refreshing"
            ? "transform 0.24s cubic-bezier(0.34,1.4,0.64,1)"
            : "none",
      }}
    >
      {/* Spinner disc */}
      <div
        className={`flex size-11 items-center justify-center border shadow-lg transition-colors duration-150 ${
          isActive
            ? "border-primary/40 bg-card"
            : "border-border bg-card"
        }`}
        style={{ borderRadius: "50%" }}
      >
        <RefreshCw
          className={`size-4 transition-colors duration-150 ${
            isActive ? "text-primary" : "text-muted-foreground/70"
          } ${isSpinning ? "animate-spin" : ""}`}
          style={
            !isSpinning
              ? {
                  transform: `rotate(${progress * 260}deg)`,
                  transition: "none",
                }
              : undefined
          }
        />
      </div>

      {/* "Release to refresh" hint — only when armed */}
      {isReady && (
        <div className="mt-1.5 border border-border bg-card px-3 py-1 shadow-md">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">
            Release to refresh
          </span>
        </div>
      )}
    </div>
  );
}
