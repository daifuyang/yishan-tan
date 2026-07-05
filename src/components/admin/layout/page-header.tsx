import type * as React from "react";

import { cn } from "@/lib/utils";

type PageHeaderIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  icon?: PageHeaderIcon;
  meta?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  size?: "md" | "sm";
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  icon: Icon,
  meta,
  breadcrumb,
  size = "md",
}: PageHeaderProps) {
  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line",
        isSm ? "pb-3" : "pb-5",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumb ? <div className="mb-2 text-xs text-text-mute">{breadcrumb}</div> : null}
        <div className="flex items-start gap-3">
          {Icon ? (
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-brand-50 text-brand-600"
            >
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1
                className={cn(
                  "font-semibold tracking-tight text-text-strong",
                  isSm ? "text-base" : "text-[18px]",
                )}
              >
                {title}
              </h1>
              {meta ? (
                <div className="flex shrink-0 items-center gap-2 text-xs text-text-mute">
                  {meta}
                </div>
              ) : null}
            </div>
            {description ? (
              <p className={cn("text-text-soft", isSm ? "mt-0.5 text-xs" : "mt-1.5 text-[13px]")}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
