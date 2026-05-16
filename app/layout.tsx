import type { Metadata } from "next";
import "./globals.css";

import { cn } from "@/lib/utils";
import { AuthModalProvider } from "@/components/auth/auth-modal-provider";
import { QueryProvider } from "@/components/shared/query-provider";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL("http://127.0.0.1:3000"),
  applicationName: "Thynk",
  title: {
    default: "Thynk",
    template: "%s | Thynk",
  },
  description:
    "Thynk is a professional prompt generation workspace for designers, developers, students, and creators.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Thynk",
    description:
      "Professional prompt generation workspace for designers, developers, students, and creators.",
    siteName: "Thynk",
    type: "website",
    images: [{ url: "/logo.svg", type: "image/svg+xml", alt: "Thynk" }],
  },
  twitter: {
    card: "summary",
    title: "Thynk",
    description:
      "Professional prompt generation workspace for designers, developers, students, and creators.",
    images: ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn("h-full", "antialiased", "font-sans")}
    >
      <body className="min-h-full bg-background text-foreground">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthModalProvider>
              <div className="flex min-h-screen flex-col">{children}</div>
              <Toaster />
            </AuthModalProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
