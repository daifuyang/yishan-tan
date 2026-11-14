/**
 * SiteContainer —— 全站公共内容容器。
 *
 * 公告条、四种 Header 的每一层（主行 / 第二行 / 辅助信息栏）都用它限制内容宽度，
 * 背景仍可全宽。容器的 `max-width / margin / padding` 只在 `blocks.css` 的
 * `.lc-site-container` 定义一处，各区块只管内部排布（Flex / Grid），**不再各自写宽度**，
 * 所以不同布局之间左右边界天然一致。
 *
 * 类名带 `lc-` 命名空间（与 `lc-sh-` / `lc-ab-` 一致），不污染宿主页面的全局样式。
 */
import type * as React from "react";

import { cx } from "./block-kit";

export const SITE_CONTAINER_CLASS = "lc-site-container";

export function SiteContainer({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx(SITE_CONTAINER_CLASS, className)}>
      {children}
    </div>
  );
}
