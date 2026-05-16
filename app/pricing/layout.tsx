import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thynk Pricing",
  description: "Compare Thynk plans, review active billing, and choose the prompt workspace subscription that fits your workflow.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
