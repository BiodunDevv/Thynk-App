export const siteNavigation = [
  { label: "Features", href: "/#features" },
  { label: "Use cases", href: "/#use-cases" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const signedInNavigation = [
  { label: "Workspace", href: "/" },
  { label: "Templates", href: "/templates" },
  { label: "Settings", href: "/settings" },
] as const;

export const footerNavigation = {
  product: [
    { label: "Pricing", href: "/pricing" },
    { label: "Support", href: "/support" },
  ],
  legal: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund-policy" },
  ],
  company: [{ label: "Admin sign in", href: "/admin/sign-in" }],
} as const;
