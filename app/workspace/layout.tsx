import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thynk Workspace",
  description: "Create, refine, save, and manage AI prompts in the Thynk workspace.",
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
