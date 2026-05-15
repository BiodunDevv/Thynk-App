import Image from "next/image";
import { cn } from "@/lib/utils";

type ThynkLogoProps = {
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: {
    container: "gap-2",
    icon: "h-8 w-8",
    text: "text-sm",
  },
  md: {
    container: "gap-2.5",
    icon: "h-10 w-10",
    text: "text-base",
  },
  lg: {
    container: "gap-3",
    icon: "h-14 w-14",
    text: "text-xl",
  },
} as const;

export function ThynkLogo({
  iconOnly = false,
  size = "md",
  className,
}: ThynkLogoProps) {
  const sizing = sizeClasses[size];

  return (
    <div
      className={cn(
        "inline-flex items-center text-foreground",
        sizing.container,
        className,
      )}
    >
      <Image
        src="/logo.svg"
        alt="Thynk"
        width={128}
        height={129}
        className={cn("shrink-0 object-contain", sizing.icon)}
        aria-hidden={iconOnly ? undefined : true}
      />
      {iconOnly ? null : (
        <span className={cn("font-semibold tracking-tight text-foreground", sizing.text)}>
          Thynk
        </span>
      )}
    </div>
  );
}
