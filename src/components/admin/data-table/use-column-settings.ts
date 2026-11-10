import * as React from "react";

const STORAGE_PREFIX = "yishan:table-columns:";

export type ColumnSettingsState = {
  /** 隐藏的列 key。 */
  hidden: string[];
  /** 列顺序（存 key 数组；未出现的列按原始顺序排在后面）。 */
  order: string[];
  /** 用户手动固定的列：列 key → 固定方向。 */
  fixed: Record<string, "left" | "right">;
};

const EMPTY: ColumnSettingsState = { hidden: [], order: [], fixed: {} };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function readSettings(settingsKey: string): ColumnSettingsState {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + settingsKey);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as {
      hidden?: unknown;
      order?: unknown;
      fixed?: unknown;
    };
    const fixed: Record<string, "left" | "right"> = {};
    if (parsed.fixed && typeof parsed.fixed === "object") {
      for (const [key, side] of Object.entries(parsed.fixed as Record<string, unknown>)) {
        if (side === "left" || side === "right") fixed[key] = side;
      }
    }
    return {
      hidden: isStringArray(parsed.hidden) ? parsed.hidden : [],
      order: isStringArray(parsed.order) ? parsed.order : [],
      fixed,
    };
  } catch {
    // 存储损坏或被禁用：退回默认列设置，不影响页面。
    return EMPTY;
  }
}

/**
 * 列设置持久化（显隐 + 顺序）。
 *
 * 大厂后台的表格会记住每个用户的列偏好，切换页面再回来还在；
 * 这里按「表格维度」存在 localStorage，键由调用方给出（settingsKey）。
 *
 * 读取只在挂载后做一次（SSR 阶段没有 window）；读完之前不写回，
 * 免得把已经存好的偏好覆盖成空。
 */
export function useColumnSettings(settingsKey: string | undefined) {
  const [state, setState] = React.useState<ColumnSettingsState>(EMPTY);
  const [hydratedKey, setHydratedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!settingsKey) {
      setState(EMPTY);
      setHydratedKey(null);
      return;
    }
    setState(readSettings(settingsKey));
    setHydratedKey(settingsKey);
  }, [settingsKey]);

  React.useEffect(() => {
    if (!settingsKey || hydratedKey !== settingsKey) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + settingsKey, JSON.stringify(state));
    } catch {
      // 隐私模式等场景写不进去：静默降级为「本次会话内有效」。
    }
  }, [settingsKey, state, hydratedKey]);

  return [state, setState] as const;
}
