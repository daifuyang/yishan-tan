/**
 * 通用埋点骨架（无第三方统计 SDK）。
 *
 * - 调用方只能使用 `ANALYTICS_EVENTS` 中的事件名和对应的属性类型，禁止散落字符串。
 * - 属性只允许枚举值、位置和业务编码；禁止上报手机号、文案内容、标题、
 *   签名 URL 等个人或敏感信息。
 * - 上报为 fire-and-forget：任何异常都被吞掉，不影响业务流程。
 *
 * 当前没有内置的第三方接收端。事件通过 DOM 事件 `yishan:analytics` 派发，
 * 接入任何统计服务时只需监听该事件，无需修改调用点。
 *
 * 隐私边界：
 *   - 只上报清洗后的路径（`safeAnalyticsPath`），绝不携带 query string 或 hash。
 *   - DNT / GPC / 用户退出开关生效时不派发任何事件。
 */

import { analyticsDisabled, onConsentChange } from "./consent";
import { safeAnalyticsPath } from "./path";

export const ANALYTICS_EVENTS = {
  pageView: "page_view",
  click: "click",
  submit: "submit",
  error: "error",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventProps = {
  page_view: { path: string };
  click: {
    /** 触发位置，如 nav_header、table_toolbar */
    location: string;
    /** 触发目标标识，如 export、delete */
    target?: string;
  };
  submit: {
    /** 表单或流程标识 */
    form: string;
    result?: "success" | "failure";
  };
  error: {
    /** 出错环节标识 */
    source: string;
    /** 错误码等非敏感标识，不含文案内容 */
    code?: string;
  };
};

export const ANALYTICS_DOM_EVENT = "yishan:analytics";

/** 退出状态监听只注册一次，避免根路由重挂载时重复注册。 */
let consentBound = false;

function dispatch(name: AnalyticsEventName, props: object): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ANALYTICS_DOM_EVENT, { detail: { name, props } }));
}

/**
 * 初始化埋点管道：绑定退出开关监听。
 *
 * 重复调用是安全的——监听只注册一次。
 */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  if (consentBound) return;
  consentBound = true;
  onConsentChange(() => {
    /* 退出后由 analyticsDisabled() 统一拦截，无需额外清理动作。 */
  });
}

/**
 * 上报事件。退出分析（DNT / GPC / 用户开关）时不派发。
 */
export function trackEvent<E extends Exclude<AnalyticsEventName, "page_view">>(
  name: E,
  props: AnalyticsEventProps[E],
): void {
  try {
    if (analyticsDisabled()) return;
    dispatch(name, props);
  } catch {
    // 统计失败不得影响用户操作。
  }
}

/**
 * 页面浏览。只发送清洗后的路径：query string 与 hash 一律不上报。
 */
export function trackPageView(path: string): void {
  try {
    if (analyticsDisabled()) return;
    const safePath = safeAnalyticsPath(path);
    dispatch(ANALYTICS_EVENTS.pageView, { path: safePath });
  } catch {
    // 统计失败不得影响用户操作。
  }
}
