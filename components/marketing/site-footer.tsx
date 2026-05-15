import Link from "next/link";

import { ThynkLogo } from "@/components/brand/thynk-logo";
import { SectionContainer } from "@/components/shared/section-container";
import { footerNavigation } from "@/lib/constants/navigation";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar py-10">
      <SectionContainer>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))]">
          <div className="max-w-sm">
            <ThynkLogo size="sm" />
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Thynk helps you turn rough ideas into better AI instructions with a
              cleaner, calmer prompt workflow.
            </p>
          </div>

          <FooterColumn title="Product" items={footerNavigation.product} />
          <FooterColumn title="Legal" items={footerNavigation.legal} />
          <FooterColumn title="Company" items={footerNavigation.company} />
        </div>
      </SectionContainer>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
