import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thynk Settings",
  description: "Manage your Thynk account, billing, notifications, and workspace preferences.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
