import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "soft"
  | "outline"
  | "destructive"
  | "success"
  | "warning"
  | "neutral"
  | "glow";

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: "border-transparent bg-brand-500 text-white",
  secondary: "border border-line bg-muted text-text-soft",
  soft: "border border-brand-100 bg-brand-50 text-brand-600",
  outline: "border border-line text-text-soft",
  destructive: "border border-danger-100 bg-danger-50 text-danger-600",
  success: "border border-success-100 bg-success-50 text-success-600",
  warning: "border border-warning-100 bg-warning-50 text-warning-600",
  neutral: "border border-line bg-muted text-text-soft",
  glow: "border border-brand-100 bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100",
};

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "soft", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[12px] font-normal leading-[1.5] transition-colors",
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    />
  );
}
