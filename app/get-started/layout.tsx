import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started with Thynk",
  description: "Set up your account, choose a plan, and start using Thynk professionally from day one.",
};

export default function GetStartedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
