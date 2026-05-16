import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thynk Templates",
  description: "Browse prompt templates for design, development, education, business, and marketing work inside Thynk.",
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
