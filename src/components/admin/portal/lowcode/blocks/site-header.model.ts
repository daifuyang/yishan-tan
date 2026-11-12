/**
 * SiteHeader 的数据模型：枚举、默认值、归一化。
 *
 * 零 React、零引擎依赖 —— 描述（meta）与实现（组件）共用这里的常量，
 * 面板下拉和画布渲染不可能抄漏一个选项。
 */
import { bool, num, pick, safeHref, str } from "./block-kit";

export const HEADER_LAYOUTS = ["standard", "centered", "minimal"] as const;
export const HEADER_LAYOUT_LABEL: Record<string, string> = {
  standard: "标准",
  centered: "居中",
  minimal: "简约",
};

export const HEADER_APPEARANCES = ["light", "dark", "transparent"] as const;
export const HEADER_APPEARANCE_LABEL: Record<string, string> = {
  light: "浅色",
  dark: "深色",
  transparent: "透明",
};

export const LINK_TARGETS = ["_self", "_blank"] as const;
export const LINK_TARGET_LABEL: Record<string, string> = { _self: "当前窗口", _blank: "新窗口" };
export const ACTION_VARIANTS = ["primary", "outline", "text"] as const;
export const ACTION_VARIANT_LABEL: Record<string, string> = {
  primary: "主按钮",
  outline: "描边",
  text: "文字",
};

export const MAX_ACTIONS = 2;
export const MAX_NAV_ITEMS = 8;
export const MAX_SUB_ITEMS = 8;

export type LinkTarget = (typeof LINK_TARGETS)[number];
export type ActionVariant = (typeof ACTION_VARIANTS)[number];

export interface NavLink {
  id: string;
  label: string;
  href: string;
  target: LinkTarget;
  active: boolean;
}

export interface NavItem extends NavLink {
  /** 二级菜单；第一期只支持一层。 */
  children: NavLink[];
}

export interface HeaderAction {
  id: string;
  label: string;
  href: string;
  target: LinkTarget;
  variant: ActionVariant;
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

export function normalizeActions(value: unknown): HeaderAction[] {
  if (!Array.isArray(value)) return [];
  const actions: HeaderAction[] = [];
  for (const [index, raw] of value.entries()) {
    const record = asRecord(raw);
    if (!record) continue;
    const label = str(record.label).trim();
    if (!label) continue;
    actions.push({
      id: str(record.id) || `action_i${index}`,
      label,
      href: safeHref(record.href),
      target: pick(record.target, LINK_TARGETS, "_self"),
      variant: pick(record.variant, ACTION_VARIANTS, "text"),
    });
  }
  // 「最多两个主要操作按钮」在渲染边界强制，旧数据 / 手写 JSON 也守得住。
  return actions.slice(0, MAX_ACTIONS);
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

export interface SiteHeaderConfig {
  logoSrc: string;
  logoAlt: string;
  brandText: string;
  brandHref: string;
  logoWidth: number;
  showBrandText: boolean;
  navItems: NavItem[];
  actions: HeaderAction[];
  layout: (typeof HEADER_LAYOUTS)[number];
  appearance: (typeof HEADER_APPEARANCES)[number];
  maxWidth: number;
  height: number;
  showBorder: boolean;
  sticky: boolean;
  overlay: boolean;
  mobileMenu: boolean;
  mobileBreakpoint: number;
  activePath: string;
}

export const SITE_HEADER_DEFAULTS = {
  logoSrc: "",
  logoAlt: "品牌 Logo",
  brandText: "Yishan",
  brandHref: "/",
  logoWidth: 120,
  showBrandText: true,
  layout: "standard",
  appearance: "light",
  maxWidth: 1200,
  height: 64,
  showBorder: true,
  sticky: false,
  overlay: false,
  mobileMenu: true,
  mobileBreakpoint: 768,
  activePath: "",
} as const;

export const SITE_HEADER_DEFAULT_NAV: unknown[] = [
  { id: "nav_home", label: "首页", href: "/", target: "_self" },
  {
    id: "nav_products",
    label: "产品",
    href: "",
    target: "_self",
    children: [
      { id: "nav_products_a", label: "产品一", href: "/products/a", target: "_self" },
      { id: "nav_products_b", label: "产品二", href: "/products/b", target: "_self" },
    ],
  },
  { id: "nav_solutions", label: "解决方案", href: "/solutions", target: "_self" },
  { id: "nav_about", label: "关于我们", href: "/about", target: "_self" },
];

export const SITE_HEADER_DEFAULT_ACTIONS: unknown[] = [
  { id: "action_login", label: "登录", href: "/login", target: "_self", variant: "text" },
  {
    id: "action_contact",
    label: "商务咨询",
    href: "/contact",
    target: "_self",
    variant: "primary",
  },
];

export function readSiteHeaderConfig(props: Record<string, unknown>): SiteHeaderConfig {
  const d = SITE_HEADER_DEFAULTS;
  return {
    logoSrc: safeHref(props.logoSrc),
    logoAlt: str(props.logoAlt, d.logoAlt),
    brandText: str(props.brandText, d.brandText),
    brandHref: safeHref(props.brandHref) || "/",
    logoWidth: num(props.logoWidth, d.logoWidth, 16, 400),
    showBrandText: bool(props.showBrandText, d.showBrandText),
    navItems: normalizeNavItems(props.navItems),
    actions: normalizeActions(props.actions),
    layout: pick(props.layout, HEADER_LAYOUTS, d.layout),
    appearance: pick(props.appearance, HEADER_APPEARANCES, d.appearance),
    maxWidth: num(props.maxWidth, d.maxWidth, 640, 2400),
    height: num(props.height, d.height, 40, 160),
    showBorder: bool(props.showBorder, d.showBorder),
    sticky: bool(props.sticky, d.sticky),
    overlay: bool(props.overlay, d.overlay),
    mobileMenu: bool(props.mobileMenu, d.mobileMenu),
    mobileBreakpoint: num(props.mobileBreakpoint, d.mobileBreakpoint, 320, 1280),
    activePath: str(props.activePath).trim(),
  };
}
