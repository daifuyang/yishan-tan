import type { MenuNode } from "~/features/menus/menus.types";

/**
 * sidebar 静态配置已下线。运行时菜单由后端 getAuthorizedMenuTree 提供，
 * 前端消费 useAuthorizedMenuTree()（src/features/menus/menus.queries.ts）。
 *
 * 这里仅保留：
 *  - 类型别名 / 守卫函数：保留是为了让老代码（如果有 import）还能解析；
 *    sidebar 主链路已经全部改成基于 MenuNode。
 *  - FALLBACK_NAV_ITEMS：仅在 React Query 失败时降级使用的 MenuNode[] 常量，
 *    **不是首选数据源**，不要在别处引用。
 *  - 路径常量：ADMIN_PROFILE_PATH、NAV_COLLAPSED_STORAGE_KEY。
 */

export type AdminNavLeaf = MenuNode & {
  type: "menu";
  path: string;
};

export type AdminNavGroup = MenuNode & {
  type: "group";
  children: MenuNode[];
};

export type AdminNavNode = AdminNavLeaf | AdminNavGroup;

export function isAdminNavLeaf(node: MenuNode): node is AdminNavLeaf {
  return node.type === "menu" && node.path !== null;
}

export const ADMIN_PROFILE_PATH = "/admin/profile";

/**
 * localStorage 折叠状态 key。
 *
 * 改用 -v2 后缀：旧 key（v1）存的是静态菜单的 group key（"dashboard" / "system" 等），
 * 新版用菜单 id（uuid）作 key，两套命名空间不能复用，否则会读到污染数据。
 */
export const NAV_COLLAPSED_STORAGE_KEY = "yishan-tan-admin-nav-collapsed-v2";

/**
 * 后端接口失败时的兜底菜单树。结构与 MenuNode[] 完全一致，
 * 渲染层无需分支判断。
 */
export const FALLBACK_NAV_ITEMS = [
  {
    id: "fallback-dashboard",
    parentId: null,
    name: "工作台",
    path: "/admin",
    component: null,
    icon: "LayoutDashboard",
    type: "group",
    permission: null,
    sort: 0,
    status: "enabled",
    createdAt: "",
    updatedAt: "",
    children: [],
  },
  {
    id: "fallback-users",
    parentId: null,
    name: "用户管理",
    path: "/admin/users",
    component: null,
    icon: "Users",
    type: "menu",
    permission: null,
    sort: 0,
    status: "enabled",
    createdAt: "",
    updatedAt: "",
    children: [],
  },
  {
    id: "fallback-roles",
    parentId: null,
    name: "角色管理",
    path: "/admin/roles",
    component: null,
    icon: "ShieldCheck",
    type: "menu",
    permission: null,
    sort: 1,
    status: "enabled",
    createdAt: "",
    updatedAt: "",
    children: [],
  },
  {
    id: "fallback-menus",
    parentId: null,
    name: "菜单管理",
    path: "/admin/menus",
    component: null,
    icon: "ListTree",
    type: "menu",
    permission: null,
    sort: 2,
    status: "enabled",
    createdAt: "",
    updatedAt: "",
    children: [],
  },
  {
    id: "fallback-settings",
    parentId: null,
    name: "系统设置",
    path: "/admin/settings",
    component: null,
    icon: "Settings",
    type: "menu",
    permission: null,
    sort: 99,
    status: "enabled",
    createdAt: "",
    updatedAt: "",
    children: [],
  },
] as const satisfies readonly MenuNode[];

/**
 * @deprecated 不再被 sidebar 消费；保留只是为了不让历史 import 报错。
 * 仅供 tests 内部引用。
 */
export const ADMIN_NAV_ITEMS: readonly MenuNode[] = FALLBACK_NAV_ITEMS;

/**
 * @deprecated 不再被 sidebar 消费；保留只是为了不让历史 import 报错。
 */
export type AdminNavItem = AdminNavNode;

export { resolveMenuIcon } from "./menu-icons";
