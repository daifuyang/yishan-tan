import * as React from "react";

import type { MenuNode } from "~/features/menus/menus.types";

import { NAV_COLLAPSED_STORAGE_KEY } from "./admin-nav-config";

function isPathMatch(currentPath: string, targetPath: string | null): boolean {
  if (!targetPath) return false;
  if (currentPath === targetPath) return true;
  if (targetPath === "/admin") return false;
  return currentPath.startsWith(`${targetPath}/`);
}

function collectGroupIds(items: readonly MenuNode[]): string[] {
  const ids: string[] = [];
  function walk(nodes: readonly MenuNode[]) {
    for (const node of nodes) {
      if (node.type === "group") {
        ids.push(node.id);
        walk(node.children);
      }
    }
  }
  walk(items);
  return ids;
}

function collectAncestorIds(items: readonly MenuNode[], currentPath: string): Set<string> {
  const ancestors = new Set<string>();
  function walk(nodes: readonly MenuNode[], parentIds: string[]) {
    for (const node of nodes) {
      if (node.type === "group") {
        walk(node.children, [...parentIds, node.id]);
      } else if (node.path && isPathMatch(currentPath, node.path)) {
        for (const id of parentIds) ancestors.add(id);
      }
    }
  }
  walk(items, []);
  return ancestors;
}

function readStoredCollapsed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    return new Set();
  }
}

function writeStoredCollapsed(collapsed: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, JSON.stringify(Array.from(collapsed)));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export type NavState = {
  isOpen: (groupId: string) => boolean;
  toggle: (groupId: string) => void;
};

export function useNavState(
  items: readonly MenuNode[],
  currentPath: string,
  isReady = true,
): NavState {
  const knownIds = React.useMemo(() => new Set(collectGroupIds(items)), [items]);
  const ancestors = React.useMemo(
    () => collectAncestorIds(items, currentPath),
    [items, currentPath],
  );

  // 先用 localStorage 同步兜底（避免首屏所有分组闪一下全展开）
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => {
    return new Set(readStoredCollapsed());
  });

  // 首次访问 + 真实数据已就绪时：默认全收起，仅展开当前路由所在分组（Antd Menu 语义）。
  // 用户一旦手动 toggle，initedRef 置位，后续切换路由或刷新菜单都不再自动改状态。
  const initedRef = React.useRef(false);
  React.useEffect(() => {
    if (!isReady) return;
    if (initedRef.current) return;
    if (items.length === 0) return;
    initedRef.current = true;

    const known = new Set(collectGroupIds(items));
    const validStored = new Set([...collapsed].filter((k) => known.has(k)));
    // 用户已有有效操作记录 → 尊重选择，仅过滤掉过期 id
    if (validStored.size > 0) {
      if (validStored.size !== collapsed.size) setCollapsed(validStored);
      return;
    }
    // 首次：默认全部收起，仅展开当前路由所在分组
    const initial = new Set(collectGroupIds(items));
    for (const id of ancestors) initial.delete(id);
    setCollapsed(initial);
  }, [items, ancestors, collapsed, isReady]);

  const openMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    function visit(nodes: readonly MenuNode[]) {
      for (const node of nodes) {
        if (node.type !== "group") continue;
        map.set(node.id, !collapsed.has(node.id));
        visit(node.children);
      }
    }
    visit(items);
    return map;
  }, [collapsed, items]);

  const toggle = React.useCallback(
    (groupId: string) => {
      if (!knownIds.has(groupId)) return;
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        writeStoredCollapsed(next);
        return next;
      });
    },
    [knownIds],
  );

  const isOpen = React.useCallback((groupId: string) => openMap.get(groupId) ?? true, [openMap]);

  return { isOpen, toggle };
}

/**
 * 测试内部入口。注意：这里导出的 items 是 FALLBACK_NAV_ITEMS，
 * 老测试如果引用 ADMIN_NAV_ITEMS，请改成 FALLBACK_NAV_ITEMS。
 */
export const __testing = {
  collectGroupIds,
  collectAncestorIds,
  isPathMatch,
};
