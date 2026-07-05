import {
  AppWindow,
  BookType,
  Building2,
  Circle,
  CircleDollarSign,
  Cog,
  Folder,
  Home,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  ListTree,
  type LucideIcon,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

/**
 * 后端 menu.icon 字段存的是 lucide-react 组件的 PascalCase 名字符串。
 * 维护这张白名单常量：新增可识别的图标时在这里加一行。
 *
 * **不要**直接在 sidebar / breadcrumb / 菜单管理页里 inline 写 `<Home />`，
 * 一律走 resolveMenuIcon(name)，这样后端 icon 字段改名前端不用动。
 */
export const MENU_ICON_MAP: Record<string, LucideIcon> = {
  AppWindow,
  BookType,
  Building2,
  Circle,
  CircleDollarSign,
  Cog,
  Folder,
  Home,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  ListTree,
  ScrollText,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
};

export function resolveMenuIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Circle;
  return MENU_ICON_MAP[name] ?? Circle;
}
