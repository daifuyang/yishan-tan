import { cva } from "class-variance-authority";
import { CircleAlert, CircleDot, Info, TriangleAlert } from "lucide-react";
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
    soft: "border border-[#b7eb8f] bg-[#f6ffed] text-[#389e0d]",
    solid: "border-transparent bg-[#52c41a] text-white",
    outline: "border border-[#b7eb8f] text-[#389e0d]",
  },
  info: {
    soft: "border border-brand-100 bg-brand-50 text-brand-600",
    solid: "border-transparent bg-brand-500 text-white",
    outline: "border border-brand-100 text-brand-600",
  },
  warning: {
    soft: "border border-[#ffd591] bg-[#fff7e6] text-[#d46b08]",
    solid: "border-transparent bg-[#fa8c16] text-white",
    outline: "border border-[#ffd591] text-[#d46b08]",
  },
  danger: {
    soft: "border border-[#ffccc7] bg-[#fff2f0] text-[#cf1322]",
    solid: "border-transparent bg-destructive text-white",
    outline: "border border-[#ffccc7] text-[#cf1322]",
  },
  neutral: {
    soft: "border border-line bg-muted text-text-soft",
    solid: "border-transparent bg-text-soft text-white",
    outline: "border border-line text-text-soft",
  },
};

const TONE_DEFAULT_ICON: Record<StatusTone, StatusIcon> = {
  success: CircleDot,
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
  neutral: CircleDot,
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
  const ResolvedIcon = icon ?? TONE_DEFAULT_ICON[tone];
  return (
    <span
      data-slot="status-badge"
      data-tone={tone}
      className={cn(statusBadgeVariants({ tone, variant }), TONE_VARIANT[tone][variant], className)}
      {...props}
    >
      <ResolvedIcon className="size-3" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}

export type { StatusTone, StatusBadgeProps };
