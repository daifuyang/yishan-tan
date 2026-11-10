import type * as React from "react";

import { cn } from "~/lib/utils";

/**
 * 后台公共内容面板（Ant Design Pro / 飞书后台风格）。
 *
 * 层次靠"背景明暗对比 + 一条细边框"建立，不靠阴影：
 *   * 工作区 = 浅灰；
 *   * 内容面板 = 纯白 + 1px 细边框 + 圆角。
 *
 * 约定：
 *   * 一个完整业务模块 = 一个 ContentPanel，不要再往里套卡片；
 *   * 面板内部不要再画同位置的边框，避免出现"双横线"；
 *   * 面板之间间距 16～20px（由外层 space-y-* 控制）。
 */

export type ContentPanelProps = React.ComponentProps<"section"> & {
  /** 面板内边距，默认 24px；传 "none" 表示由子元素自行控制。 */
  padding?: "none" | "md";
};

const PANEL_PADDING: Record<"none" | "md", string> = {
  none: "",
  md: "p-6",
};

export function ContentPanel({ className, padding = "md", ...props }: ContentPanelProps) {
  return (
    <section
      data-slot="content-panel"
      className={cn(
        "overflow-hidden rounded-lg border border-line bg-white",
        PANEL_PADDING[padding],
        className,
      )}
      {...props}
    />
  );
}

export type ContentPanelHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 右侧操作区，与标题垂直居中。 */
  actions?: React.ReactNode;
  className?: string;
};

/**
 * 面板标题区：标题 14px / 600，说明 13px 次级灰，右侧操作区。
 * 不使用图标底板、不使用装饰性标签。
 */
export function ContentPanelHeader({
  title,
  description,
  actions,
  className,
}: ContentPanelHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold text-text-strong">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-text-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
