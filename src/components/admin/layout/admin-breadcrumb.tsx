import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { useAuthorizedMenuTree } from "~/features/menus/menus.queries";
import type { MenuNode } from "~/features/menus/menus.types";
import { cn } from "~/lib/utils";

import { FALLBACK_NAV_ITEMS } from "./admin-nav-config";

/**
 * 后台面包屑。
 *
 * 规范（对齐 Ant Design Breadcrumb）：
 *   * 只表达层级关系，节点不带图标；
 *   * 分隔符固定为 Lucide ChevronRight（12px）；
 *   * 有真实路由的父级节点可点击，悬停变品牌蓝；
 *   * 当前页面不可点击，带 aria-current="page"；
 *   * 移动端过长时省略中间节点，保留首节点与当前页面。
 */

export type AdminBreadcrumbItem = {
  key: string;
  title: string;
  /** 节点自身的真实路由；分组节点通常没有路由，此时不渲染为链接。 */
  path: string | null;
  /** 是否为当前页面（精确命中菜单路径时为 true）。 */
  current: boolean;
};

function isMenuLeaf(node: MenuNode): boolean {
  return node.type !== "group";
}

/** 收集当前路径命中的叶子菜单及其分组祖先链。 */
function collectCandidates(
  nodes: readonly MenuNode[],
  path: string,
  trail: AdminBreadcrumbItem[],
  out: Array<{ item: AdminBreadcrumbItem; trail: AdminBreadcrumbItem[] }>,
) {
  for (const node of nodes) {
    if (isMenuLeaf(node)) {
      if (!node.path) continue;
      if (path === node.path || path.startsWith(`${node.path}/`)) {
        out.push({
          item: {
            key: `leaf:${node.path}`,
            title: node.name,
            path: node.path,
            current: path === node.path,
          },
          trail: [...trail],
        });
      }
      continue;
    }
    trail.push({
      key: `group:${node.id}`,
      title: node.name,
      path: node.path,
      current: false,
    });
    collectCandidates(node.children, path, trail, out);
    trail.pop();
  }
}

/** 在整棵树里找 path === "/admin" 的节点（工作台可能是叶子，也可能是分组）。 */
function findDashboard(nodes: readonly MenuNode[]): MenuNode | null {
  for (const node of nodes) {
    if (node.path === "/admin") return node;
    const found = findDashboard(node.children);
    if (found) return found;
  }
  return null;
}

/**
 * 生成面包屑：优先精确匹配，其次取路径前缀最长的一级；
 * 都不命中时回落到「工作台」。
 *
 * 精确命中 → 最后一个节点是当前页面（不可点击、带 aria-current）；
 * 前缀命中（如详情页 /admin/users/abc）→ 命中的叶子是父级页面，
 * 渲染为可点击链接，当前页面由下方标题区表达。
 */
export function buildAdminBreadcrumb(
  tree: readonly MenuNode[],
  path: string,
): AdminBreadcrumbItem[] {
  const candidates: Array<{
    item: AdminBreadcrumbItem;
    trail: AdminBreadcrumbItem[];
  }> = [];
  collectCandidates(tree, path, [], candidates);

  if (candidates.length > 0) {
    const exact = candidates.find((entry) => entry.item.path === path);
    const matched =
      exact ??
      candidates.reduce((best, entry) =>
        (entry.item.path?.length ?? 0) > (best.item.path?.length ?? 0) ? entry : best,
      );
    return [...matched.trail, matched.item];
  }

  const dashboard = findDashboard(tree);
  return dashboard
    ? [
        {
          key: `leaf:${dashboard.path}`,
          title: dashboard.name,
          path: dashboard.path,
          current: path === dashboard.path,
        },
      ]
    : [];
}

export function AdminBreadcrumb({
  path,
  currentLabel,
}: {
  path: string;
  currentLabel?: string;
}) {
  const { data, isLoading, isError } = useAuthorizedMenuTree();
  const tree: readonly MenuNode[] =
    isError || !data || data.length === 0 ? FALLBACK_NAV_ITEMS : data;
  const items = React.useMemo(() => {
    const trail = buildAdminBreadcrumb(tree, path);
    return currentLabel
      ? [
          ...trail.map((item) => ({ ...item, current: false })),
          { key: path, title: currentLabel, path: null, current: true },
        ]
      : trail;
  }, [tree, path, currentLabel]);

  if (isLoading && items.length === 0) {
    return <span className="text-[13px] leading-[20px] text-text-mute">加载中…</span>;
  }
  if (items.length === 0) return null;

  const first = items[0];
  if (!first) return null;
  const last = items.length > 1 ? items[items.length - 1] : null;
  const middle = items.slice(1, items.length - 1);

  const renderNode = (item: AdminBreadcrumbItem, className?: string) => {
    const base = cn("truncate", className);
    if (item.current) {
      return (
        <span aria-current="page" className={cn(base, "text-text-strong")} title={item.title}>
          {item.title}
        </span>
      );
    }
    if (item.path) {
      return (
        <Link
          to={item.path}
          className={cn(base, "text-text-soft transition-colors hover:text-brand-600")}
          title={item.title}
        >
          {item.title}
        </Link>
      );
    }
    return (
      <span className={cn(base, "text-text-soft")} title={item.title}>
        {item.title}
      </span>
    );
  };

  return (
    <nav aria-label="面包屑" className="flex min-w-0 items-center gap-2 text-[13px] leading-[20px]">
      {renderNode(first)}

      {middle.length > 0 ? (
        <>
          {/* 移动端：中间节点省略，只保留首节点与末级节点 */}
          <ChevronRight className="size-3 shrink-0 text-text-mute sm:hidden" aria-hidden />
          <span className="text-text-mute sm:hidden">…</span>
          {middle.map((item) => (
            <React.Fragment key={item.key}>
              <ChevronRight
                className="hidden size-3 shrink-0 text-text-mute sm:inline-flex"
                aria-hidden
              />
              {renderNode(item, "hidden sm:inline")}
            </React.Fragment>
          ))}
        </>
      ) : null}

      {last ? (
        <>
          <ChevronRight className="size-3 shrink-0 text-text-mute" aria-hidden />
          {renderNode(last)}
        </>
      ) : null}
    </nav>
  );
}
