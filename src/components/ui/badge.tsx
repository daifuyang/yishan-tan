import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "soft" | "outline" | "destructive" | "glow";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "border-transparent bg-brand-600 text-white",
  secondary: "border-transparent bg-brand-50 text-brand-700",
  soft: "border border-brand-200 bg-brand-50 text-brand-700",
  outline: "border border-line text-text-soft",
  destructive: "border-transparent bg-destructive/10 text-destructive",
  glow: "border-brand-200/60 bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/80",
};

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "soft", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none transition-colors",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  );
}
