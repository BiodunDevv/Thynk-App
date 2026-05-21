import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay with Thynk",
  description: "Choose your plan, complete checkout securely, and unlock your Thynk workspace without friction.",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
