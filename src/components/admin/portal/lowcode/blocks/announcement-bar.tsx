/**
 * AnnouncementBar —— 顶部公告条（与 `announcement-bar.meta.ts` 一一对应）。
 */
import * as React from "react";

import { bool, cx, num, passthrough, pick, safeHref, str } from "./block-kit";
import { objectStyle } from "./block-kit";
import { safeColor } from "./block-safe";
import { SiteContainer } from "./site-container";

export const ANNOUNCEMENT_APPEARANCES = ["light", "dark", "brand"] as const;
export const ANNOUNCEMENT_APPEARANCE_LABEL: Record<string, string> = {
  light: "浅色",
  dark: "深色",
  brand: "品牌色",
};

export const ANNOUNCEMENT_ALIGNS = ["left", "center", "right"] as const;
export const ANNOUNCEMENT_ALIGN_LABEL: Record<string, string> = {
  left: "靠左",
  center: "居中",
  right: "靠右",
};

export const ANNOUNCEMENT_DEFAULTS = {
  text: "新品发布：全新企业版现已上线",
  href: "/products",
  actionText: "了解详情",
  appearance: "brand",
  bgColor: "",
  textColor: "",
  dismissible: true,
  align: "center",
  height: 40,
} as const;

export { safeColor };

export function AnnouncementBar(props: Record<string, unknown>) {
  const text = str(props.text, ANNOUNCEMENT_DEFAULTS.text);
  const href = safeHref(props.href);
  const actionText = str(props.actionText).trim();
  const appearance = pick(props.appearance, ANNOUNCEMENT_APPEARANCES, "brand");
  const align = pick(props.align, ANNOUNCEMENT_ALIGNS, "center");
  const height = num(props.height, ANNOUNCEMENT_DEFAULTS.height, 24, 120);
  const dismissible = bool(props.dismissible, ANNOUNCEMENT_DEFAULTS.dismissible);
  const bg = safeColor(props.bgColor);
  const fg = safeColor(props.textColor);

  const [dismissed, setDismissed] = React.useState(false);
  // 文案变了就重新显示，否则在编辑器里关掉一次之后，改文字也看不到效果。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅在文案变化时复位
  React.useEffect(() => setDismissed(false), [text]);

  if (dismissed || !text) return null;

  const style: React.CSSProperties & Record<string, string | number> = {
    minHeight: height,
    ...objectStyle(props.style),
    ...(bg ? { "--lc-ab-bg": bg } : {}),
    ...(fg ? { "--lc-ab-fg": fg } : {}),
  };

  const message = <span className="lc-ab-text">{text}</span>;
  const action =
    href && actionText ? (
      <a className="lc-ab-action" href={href}>
        {actionText}
      </a>
    ) : null;

  return (
    <section
      {...passthrough(props)}
      aria-label="站点公告"
      className={cx("lc-ab", `lc-ab--${appearance}`, `lc-ab--${align}`)}
      style={style}
    >
      <SiteContainer className="lc-ab-container">
        <div className="lc-ab-inner">
          {href && !actionText ? (
            <a className="lc-ab-link" href={href}>
              {message}
            </a>
          ) : (
            message
          )}
          {action}
        </div>
        {dismissible ? (
          <button
            type="button"
            className="lc-ab-close"
            aria-label="关闭公告"
            onClick={() => setDismissed(true)}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </SiteContainer>
    </section>
  );
}
