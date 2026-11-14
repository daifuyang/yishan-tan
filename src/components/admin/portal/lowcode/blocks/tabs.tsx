/**
 * Tabs / TabPane —— 选项卡业务区块（与 `tabs.meta.ts` 一一对应）。
 *
 * 结构照开源低代码引擎（Fusion / lowcode-engine）的 `Tabs > Tabs.Item`：
 * `Tabs` 是容器，子节点是任意个 `TabPane`；页签标题来自各 `TabPane` 的 `title`。
 * 页签数量不固定，所以不走具名插槽（槽在 meta 里静态声明），而是两个容器物料配合。
 *
 * 渲染器会在每个子节点外包一层容错边界，`Tabs` 拿到的 children 不是裸的 `TabPane`。
 * 这里按**组件身份**（`type === TabPane`）顺着单子链往下找，不依赖包装层长什么样。
 *
 * 所有面板都渲染，非当前面板用 `hidden` 隐藏：内容留在 DOM 里（编辑态选区、服务端输出
 * 都不丢），切换只是显隐，不会卸载面板里的组件状态。
 */
import * as React from "react";

import { cx, num, passthrough, pick, str } from "./block-kit";
import { objectStyle } from "./block-kit";

export const TABS_VARIANTS = ["line", "card", "pill"] as const;
export const TABS_ALIGNS = ["start", "center", "end"] as const;

export const TABS_VARIANT_LABEL: Record<(typeof TABS_VARIANTS)[number], string> = {
  line: "线条",
  card: "卡片",
  pill: "胶囊",
};
export const TABS_ALIGN_LABEL: Record<(typeof TABS_ALIGNS)[number], string> = {
  start: "靠左",
  center: "居中",
  end: "靠右",
};

export const TABS_DEFAULTS = {
  variant: "line",
  align: "start",
  /** 1 起算，面板里按「第几个」填，比 0 起算的下标好懂 */
  defaultActive: 1,
} as const;

export const TAB_PANE_DEFAULT_TITLE = "选项卡";
export const MAX_TABS = 20;

type RawProps = Record<string, unknown>;

export function TabPane(props: RawProps) {
  return (
    <div {...passthrough(props)} className="lc-tp" style={objectStyle(props.style)}>
      {props.children as React.ReactNode}
    </div>
  );
}

interface PaneInfo {
  key: string;
  title: string;
  /** 原样放回去渲染的子节点（含渲染器的包装层）。 */
  node: React.ReactNode;
}

/** 顺着单子链找 `TabPane` 元素：容错边界之类的包装层只有一个 child。 */
function findPane(node: React.ReactNode, depth = 0): React.ReactElement<RawProps> | null {
  if (depth > 4) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findPane(item as React.ReactNode, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (!React.isValidElement(node)) return null;
  const element = node as React.ReactElement<RawProps>;
  if (element.type === TabPane) return element;
  return findPane(element.props.children as React.ReactNode, depth + 1);
}

function splitChildren(children: React.ReactNode): { panes: PaneInfo[]; rest: React.ReactNode[] } {
  const panes: PaneInfo[] = [];
  const rest: React.ReactNode[] = [];
  React.Children.toArray(children).forEach((child, index) => {
    const pane = findPane(child);
    if (!pane || panes.length >= MAX_TABS) {
      rest.push(child);
      return;
    }
    const title = str(pane.props.title).trim() || `${TAB_PANE_DEFAULT_TITLE} ${panes.length + 1}`;
    panes.push({
      key: React.isValidElement(child) ? String(child.key ?? index) : String(index),
      title,
      node: child,
    });
  });
  return { panes, rest };
}

export function Tabs(props: RawProps) {
  const variant = pick(props.variant, TABS_VARIANTS, TABS_DEFAULTS.variant);
  const align = pick(props.align, TABS_ALIGNS, TABS_DEFAULTS.align);
  const initial =
    Math.round(num(props.defaultActive, TABS_DEFAULTS.defaultActive, 1, MAX_TABS)) - 1;

  const [selected, setSelected] = React.useState<number | null>(null);
  const baseId = React.useId();
  const { panes, rest } = splitChildren(props.children as React.ReactNode);
  // 页签被删到比下标少时，退到最后一个，而不是一个都不亮。
  const active = Math.min(selected ?? initial, Math.max(panes.length - 1, 0));

  const move = (from: number, step: number) => {
    const next = (from + step + panes.length) % panes.length;
    setSelected(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "ArrowRight") move(index, 1);
    else if (event.key === "ArrowLeft") move(index, -1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      {...passthrough(props)}
      className={cx("lc-tabs", `lc-tabs--${variant}`, `lc-tabs--align-${align}`)}
      style={objectStyle(props.style)}
    >
      {panes.length > 0 ? (
        <div className="lc-tabs__bar" role="tablist">
          {panes.map((pane, index) => (
            <button
              key={pane.key}
              id={`${baseId}-tab-${index}`}
              type="button"
              role="tab"
              className={cx("lc-tabs__tab", index === active && "is-active")}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {pane.title}
            </button>
          ))}
        </div>
      ) : null}
      {panes.map((pane, index) => (
        <div
          key={pane.key}
          id={`${baseId}-panel-${index}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${index}`}
          className="lc-tabs__panel"
          hidden={index !== active}
        >
          {pane.node}
        </div>
      ))}
      {rest}
    </div>
  );
}
