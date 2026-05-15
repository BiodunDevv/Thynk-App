import {
  Blocks,
  BookmarkCheck,
  Copy,
  FolderKanban,
  Sparkles,
  Workflow,
} from "lucide-react";

export const heroPromptChips = [
  "Design a clean SaaS dashboard",
  "Explain APIs like I’m new",
  "Write a better product pitch",
  "Create a study plan",
  "Debug this React error",
  "Generate viral content hooks",
  "Improve my landing page copy",
  "Turn notes into flashcards",
] as const;

export const workflowSteps = [
  {
    step: "01",
    title: "Drop in the rough idea",
    description:
      "Start with messy notes, half-formed thoughts, references, or a quick objective.",
  },
  {
    step: "02",
    title: "Refine the intent",
    description:
      "Thynk shapes the context, tone, structure, and direction so the AI understands what you mean.",
  },
  {
    step: "03",
    title: "Use, save, and reuse",
    description:
      "Keep the prompts that work, organize them clearly, and return to them whenever the job comes back.",
  },
] as const;

export const featureCards = [
  {
    title: "AI-enhanced prompts",
    description: "Turn vague intent into clear, structured instructions that perform better.",
    icon: Sparkles,
  },
  {
    title: "Templates for every workflow",
    description: "Start faster with purpose-built prompt patterns for real creative and technical tasks.",
    icon: Blocks,
  },
  {
    title: "Save and reuse favorites",
    description: "Keep the prompts that consistently work and bring them back in one click.",
    icon: BookmarkCheck,
  },
  {
    title: "One-click copy",
    description: "Move from exploration to action fast without cleaning up formatting by hand.",
    icon: Copy,
  },
  {
    title: "Organized collections",
    description: "Group prompts by client, project, subject, or workflow so the library stays useful.",
    icon: FolderKanban,
  },
  {
    title: "Built for creators and builders",
    description: "Made for people using AI to ship, design, study, write, and communicate clearly.",
    icon: Workflow,
  },
] as const;

export const useCases = [
  {
    title: "Designers",
    description: "Shape briefs, UI critiques, copy prompts, and visual direction faster.",
  },
  {
    title: "Developers",
    description: "Clarify code requests, debugging prompts, API tasks, and architecture questions.",
  },
  {
    title: "Students",
    description: "Turn lecture notes, reading goals, and assignments into better study prompts.",
  },
  {
    title: "Content creators",
    description: "Generate hooks, outlines, scripts, angle variations, and platform-ready prompt setups.",
  },
  {
    title: "Marketers",
    description: "Build campaigns, messaging experiments, landing page copy, and research prompts with structure.",
  },
  {
    title: "Founders",
    description: "Refine product thinking, positioning, investor narratives, and internal planning prompts.",
  },
] as const;

export const faqItems = [
  {
    question: "What is Thynk?",
    answer:
      "Thynk is a professional prompt generation workspace that helps you turn rough ideas into better AI instructions.",
  },
  {
    question: "Who is Thynk for?",
    answer:
      "It is built for designers, developers, students, marketers, founders, and creators who want stronger results from AI without messy prompting.",
  },
  {
    question: "Can I use Thynk for coding and design?",
    answer:
      "Yes. Thynk is designed for both technical and creative workflows, including product design, frontend work, study, strategy, and content.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The free plan gives you a limited number of prompt generations and access to basic templates so you can explore the product properly.",
  },
  {
    question: "Why do paid plans exist?",
    answer:
      "Prompt generation uses real AI infrastructure. Paid plans support higher usage, premium templates, and advanced enhancement features.",
  },
  {
    question: "Can I save my prompts?",
    answer:
      "Yes. Thynk is designed to help you keep what works, organize it clearly, and come back to it whenever you need it.",
  },
] as const;
