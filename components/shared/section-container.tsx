import * as React from "react";

import { cn } from "@/lib/utils";

type SectionContainerProps<T extends React.ElementType = "section"> = {
  as?: T;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function SectionContainer<T extends React.ElementType = "section">({
  className,
  children,
  as,
  ...props
}: SectionContainerProps<T>) {
  const Comp = as ?? "section";

  return (
    <Comp
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
