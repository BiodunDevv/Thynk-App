import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to Thynk",
  description: "Access your Thynk workspace, billing, saved prompts, and account settings.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
