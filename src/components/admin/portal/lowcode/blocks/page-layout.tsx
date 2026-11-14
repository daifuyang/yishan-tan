/**
 * PageLayout —— 页面骨架业务区块（与 `page-layout.meta.ts` 一一对应）。
 *
 * 三个具名插槽：页头 `header` / 正文 `main` / 页脚 `footer`。槽是 `Slot` 子节点
 * （引擎 DESIGN-v1 §14），本组件经 `props.slots[name]` 拿到它们，只决定**排在哪、怎么排**，
 * 不渲染槽里的内容。槽内放什么由用户在画布里拖入，页头槽只接受公告条 / 网站头部。
 *
 * 没有 `children` 通道：用户不能往 PageLayout 自身直接拖节点，只能进槽。
 */
import type * as React from "react";

import { bool, cx, num, passthrough } from "./block-kit";
import { objectStyle } from "./block-kit";

export const PAGE_LAYOUT_DEFAULTS = {
  stickyHeader: false,
  stickyFooter: true,
  /** 0 = 不限制，正文撑满 */
  mainMaxWidth: 0,
} as const;

/** 槽名：描述（meta.slots）与实现共用，不允许各抄一份。 */
export const PAGE_LAYOUT_SLOTS = ["header", "main", "footer"] as const;

type SlotContent = React.ReactNode;

export function PageLayout(props: Record<string, unknown>) {
  const stickyHeader = bool(props.stickyHeader, PAGE_LAYOUT_DEFAULTS.stickyHeader);
  const stickyFooter = bool(props.stickyFooter, PAGE_LAYOUT_DEFAULTS.stickyFooter);
  const mainMaxWidth = num(props.mainMaxWidth, PAGE_LAYOUT_DEFAULTS.mainMaxWidth, 0, 2400);
  const slots = (props.slots ?? {}) as Record<string, SlotContent | undefined>;

  const style = {
    ...objectStyle(props.style),
    ...(mainMaxWidth > 0 ? { "--lc-pl-main-max": `${mainMaxWidth}px` } : {}),
  } as React.CSSProperties;

  return (
    <div
      {...passthrough(props)}
      className={cx(
        "lc-pl",
        stickyHeader && "has-sticky-header",
        stickyFooter && "has-sticky-footer",
        mainMaxWidth > 0 && "has-main-max",
      )}
      style={style}
    >
      {slots.header}
      {slots.main}
      {slots.footer}
    </div>
  );
}
