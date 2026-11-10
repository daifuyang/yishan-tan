/**
 * 统一的分析退出语义。
 *
 * 隐私边界：
 *   - 浏览器 DNT = 1 → 停止采集
 *   - 浏览器 GPC = true → 停止采集
 *   - 用户在隐私页点了「退出分析」→ 停止采集
 *
 * 退出的范围只有分析与统计：登录、权限校验、审计记录不受影响。
 *
 * 服务端采集用同一个 cookie 名，浏览器和服务端因此对「是否已退出」的判断一致。
 */

export const OPT_OUT_STORAGE_KEY = "yishan_analytics_optout";
export const OPT_OUT_COOKIE = "yishan_analytics_optout";

type ConsentListener = () => void;
const listeners = new Set<ConsentListener>();

/**
 * 注册退出状态变化的监听。
 * consent 不反向依赖 events，避免循环引用。
 */
export function onConsentChange(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyConsentChanged(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* 监听器失败不得影响退出动作本身。 */
    }
  }
}

/**
 * 当前是否应停止一切分析采集。
 *
 * 读不到退出开关时按「已退出」处理：宁可少统计，也不越过用户的退出意愿。
 */
export function analyticsDisabled(): boolean {
  if (typeof navigator !== "undefined") {
    if (navigator.doNotTrack === "1") return true;
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true)
      return true;
  }
  try {
    return localStorage.getItem(OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * 写入退出状态。localStorage 与 cookie 都要写：
 * localStorage 给浏览器里的采集逻辑读，cookie 给服务端的第一方采集读。
 */
export function setAnalyticsOptOut(disabled: boolean): void {
  try {
    localStorage.setItem(OPT_OUT_STORAGE_KEY, disabled ? "1" : "0");
  } catch {
    /* 存储不可用时仍写 cookie，服务端采集按 cookie 停止。 */
  }
  try {
    document.cookie = `${OPT_OUT_COOKIE}=${disabled ? "1" : "0"}; Path=/; SameSite=Lax; Max-Age=31536000`;
  } catch {
    /* cookie 不可用时只能靠 localStorage。 */
  }
  notifyConsentChanged();
}
