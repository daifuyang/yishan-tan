import type * as React from "react";

import { cn } from "@/lib/utils";

type EmptyStateIcon = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

type EmptyStateProps = {
  icon?: EmptyStateIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "dashed";
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  if (variant === "dashed") {
    return (
      <div
        data-slot="empty-state"
        data-variant="dashed"
        className={cn(
          "rounded-lg border border-dashed border-border bg-card p-6 text-card-foreground",
          className,
        )}
      >
        <div className="flex flex-col items-start gap-2 text-left sm:flex-row sm:items-center sm:gap-3">
          {Icon ? (
            <span
              aria-hidden
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-text-soft"
            >
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-text-strong">{title}</h3>
            {description ? <p className="mt-1 text-xs text-text-soft">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="empty-state"
      data-variant="default"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="size-10 text-text-mute" aria-hidden /> : null}
      <div className="space-y-0.5">
        <h3 className="text-[14px] font-medium text-text-strong">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-xs text-[13px] text-text-soft">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
