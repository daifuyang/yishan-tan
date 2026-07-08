import { cva } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";
type StatusIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type StatusBadgeProps = React.ComponentProps<"span"> & {
  tone: StatusTone;
  label: React.ReactNode;
  icon?: StatusIcon;
  variant?: "soft" | "solid" | "outline";
};

const TONE_VARIANT: Record<StatusTone, Record<NonNullable<StatusBadgeProps["variant"]>, string>> = {
  success: {
    soft: "border border-success-100 bg-success-50 text-success-600",
    solid: "border-transparent bg-success-500 text-white",
    outline: "border border-success-100 text-success-600",
  },
  info: {
    soft: "border border-brand-100 bg-brand-50 text-brand-600",
    solid: "border-transparent bg-brand-500 text-white",
    outline: "border border-brand-100 text-brand-600",
  },
  warning: {
    soft: "border border-warning-100 bg-warning-50 text-warning-600",
    solid: "border-transparent bg-warning-500 text-white",
    outline: "border border-warning-100 text-warning-600",
  },
  danger: {
    soft: "border border-danger-100 bg-danger-50 text-danger-600",
    solid: "border-transparent bg-destructive text-white",
    outline: "border border-danger-100 text-danger-600",
  },
  neutral: {
    soft: "border border-line bg-muted text-text-soft",
    solid: "border-transparent bg-text-soft text-white",
    outline: "border border-line text-text-soft",
  },
};

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[12px] font-normal leading-[1.5] transition-colors",
  {
    variants: {
      tone: {
        success: "",
        info: "",
        warning: "",
        danger: "",
        neutral: "",
      },
      variant: {
        soft: "",
        solid: "",
        outline: "",
      },
    },
    defaultVariants: {
      tone: "info",
      variant: "soft",
    },
  },
);

export function StatusBadge({
  tone,
  label,
  icon,
  variant = "soft",
  className,
  ...props
}: StatusBadgeProps) {
  const ResolvedIcon = icon;
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(statusBadgeVariants({ tone, variant }), TONE_VARIANT[tone][variant], className)}
      {...props}
    >
      {ResolvedIcon ? <ResolvedIcon className="size-3" aria-hidden /> : null}
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

export type { StatusTone, StatusBadgeProps };
