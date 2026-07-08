import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  tag?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
};

const TREND_BADGE_VARIANT: Record<
  NonNullable<MetricCardProps["trend"]>,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  up: "success",
  down: "destructive",
  neutral: "soft",
};

export function MetricCard({
  title,
  value,
  description,
  tag,
  icon: Icon,
  trend = "neutral",
  className,
}: MetricCardProps) {
  return (
    <div className={cn("yt-card yt-card-hover relative overflow-hidden p-5", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-tech-grid-soft opacity-60"
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-primary-gradient text-white shadow-button"
        >
          <Icon className="size-5" aria-hidden />
        </span>
        {tag ? <Badge variant={TREND_BADGE_VARIANT[trend]}>{tag}</Badge> : null}
      </div>

      <div className="relative mt-4">
        <p className="text-[13px] font-medium text-text-soft">{title}</p>
        <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-text-strong">
          {value}
        </p>
        {description ? (
          <p className="mt-2 text-[12px] leading-relaxed text-text-mute">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
