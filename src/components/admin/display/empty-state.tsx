import { Package } from "lucide-react";
import type * as React from "react";

import { cn } from "~/lib/utils";

type EmptyStateIcon = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
}>;

/**
 * 表格内的空状态：antd ProTable 风格 —— **浅灰插画 + 一行文字**，没有按钮。
 *
 * 插画用线性图标（`Package`）以 `text-line` 描边，视觉上贴近 antd 的默认空态；
 * 文案只占一行：`title` 是主文案，`description` 作为次要信息接在后面。
 */
export function CompactEmpty({
  icon: Icon = Package,
  title,
  description,
  className,
}: {
  icon?: EmptyStateIcon;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="compact-empty"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12", className)}
    >
      <Icon className="size-14 text-line" strokeWidth={1} aria-hidden />
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-[13px] text-text-mute">
        {title ? <span>{title}</span> : null}
        {description ? <span>{description}</span> : null}
      </p>
    </div>
  );
}

type EmptyStateProps = {
  icon?: EmptyStateIcon;
  /** 主文案;不传时只展示 description。 */
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "dashed";
  /** 图形尺寸(px),默认 40。 */
  imageSize?: number;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  imageSize = 40,
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
      {Icon ? (
        <Icon
          className="shrink-0 text-text-mute"
          style={{ width: imageSize, height: imageSize }}
          aria-hidden
        />
      ) : null}
      <div className="space-y-0.5">
        {title ? <h3 className="text-[14px] font-medium text-text-strong">{title}</h3> : null}
        {description ? (
          <p className="mx-auto max-w-xs text-[13px] text-text-soft">{description}</p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
