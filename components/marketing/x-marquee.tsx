"use client";

import { cn } from "@/lib/utils";

const LANE_ONE = [
  { label: "Design", text: "Design a clean SaaS dashboard" },
  { label: "Code", text: "Refactor this React component" },
  { label: "Content", text: "Write a product launch email" },
  { label: "Study", text: "Create a study plan from my notes" },
  { label: "Business", text: "Create a brand strategy brief" },
  { label: "Design", text: "Build a pricing page outline" },
  { label: "Prompt", text: "Convert rough thoughts into structure" },
  { label: "Content", text: "Generate app onboarding copy" },
  { label: "Code", text: "Debug this backend error" },
];

const LANE_TWO = [
  { label: "Content", text: "Generate TikTok content hooks" },
  { label: "Study", text: "Explain APIs in simple terms" },
  { label: "Business", text: "Turn meeting notes into tasks" },
  { label: "Code", text: "Write a backend auth middleware" },
  { label: "Design", text: "Create a landing page hero section" },
  { label: "Prompt", text: "Rewrite this in a professional tone" },
  { label: "Study", text: "Summarize this research paper" },
  { label: "Business", text: "Write a professional proposal" },
  { label: "Content", text: "Improve my landing page copy" },
];

type XMarqueeProps = {
  onChipClick: (value: string) => void;
  className?: string;
};

function Chip({
  label,
  text,
  onClick,
}: {
  label: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex shrink-0 cursor-pointer items-center gap-2.5 border border-border bg-card px-3.5 py-2 transition-colors hover:border-ring hover:bg-accent"
    >
      <span className="rounded-xs bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
        {label}
      </span>
      <span className="whitespace-nowrap text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
        {text}
      </span>
    </button>
  );
}

function Lane({
  chips,
  direction,
  onChipClick,
}: {
  chips: { label: string; text: string }[];
  direction: "ltr" | "rtl";
  onChipClick: (text: string) => void;
}) {
  const items = [...chips, ...chips, ...chips, ...chips];
  return (
    <div className="overflow-hidden">
      <div
        className={cn(
          "flex w-max gap-3",
          direction === "ltr" ? "animate-marquee-ltr" : "animate-marquee-rtl",
        )}
      >
        {items.map((chip, i) => (
          <Chip
            key={`${chip.text}-${i}`}
            label={chip.label}
            text={chip.text}
            onClick={() => onChipClick(chip.text)}
          />
        ))}
      </div>
    </div>
  );
}

export function XMarquee({ onChipClick, className }: XMarqueeProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Lane chips={LANE_ONE} direction="ltr" onChipClick={onChipClick} />
      <Lane chips={LANE_TWO} direction="rtl" onChipClick={onChipClick} />
    </div>
  );
}
