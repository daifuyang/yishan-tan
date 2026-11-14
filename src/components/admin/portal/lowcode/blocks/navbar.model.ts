/**
 * Navbar 的数据模型：导航项的类型与归一化。
 *
 * 零 React、零引擎依赖，描述（meta）与实现（组件）共用。
 */
import { bool, pick, safeHref, str } from "./block-kit";

export const LINK_TARGETS = ["_self", "_blank"] as const;
export const LINK_TARGET_LABEL: Record<string, string> = { _self: "当前窗口", _blank: "新窗口" };

export const MAX_NAV_ITEMS = 8;
export const MAX_SUB_ITEMS = 8;

export type LinkTarget = (typeof LINK_TARGETS)[number];

export interface NavLink {
  id: string;
  label: string;
  href: string;
  target: LinkTarget;
  active: boolean;
}

export interface NavItem extends NavLink {
  /** 二级菜单；只支持一层。 */
  children: NavLink[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeLink(raw: unknown, fallbackId: string): NavLink | null {
  const record = asRecord(raw);
  if (!record) return null;
  const label = str(record.label).trim();
  if (!label) return null;
  return {
    id: str(record.id) || fallbackId,
    label,
    href: safeHref(record.href),
    target: pick(record.target, LINK_TARGETS, "_self"),
    active: bool(record.active, false),
  };
}

export function normalizeNavItems(value: unknown): NavItem[] {
  if (!Array.isArray(value)) return [];
  const items: NavItem[] = [];
  for (const [index, raw] of value.entries()) {
    const link = normalizeLink(raw, `nav_i${index}`);
    if (!link) continue;
    const rawChildren = asRecord(raw)?.children;
    const children: NavLink[] = [];
    if (Array.isArray(rawChildren)) {
      for (const [childIndex, child] of rawChildren.entries()) {
        const normalized = normalizeLink(child, `${link.id}_${childIndex}`);
        if (normalized) children.push(normalized);
      }
    }
    items.push({ ...link, children: children.slice(0, MAX_SUB_ITEMS) });
  }
  return items.slice(0, MAX_NAV_ITEMS);
}

/** 当前路径是否命中该链接：显式 `active` 优先，其次与 `activePath` 精确匹配。 */
export function isLinkActive(link: Pick<NavLink, "href" | "active">, activePath: string): boolean {
  if (link.active) return true;
  if (!activePath || !link.href) return false;
  return link.href === activePath;
}

export function isItemActive(item: NavItem, activePath: string): boolean {
  return isLinkActive(item, activePath) || item.children.some((c) => isLinkActive(c, activePath));
}

export const NAVBAR_DEFAULT_ITEMS: unknown[] = [
  { id: "nav_home", label: "首页", href: "/", target: "_self" },
  { id: "nav_about", label: "关于我们", href: "", target: "_self" },
];
