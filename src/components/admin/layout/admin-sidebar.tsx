import { Link, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuthorizedMenuTree } from "~/features/menus/menus.queries";
import type { MenuNode } from "~/features/menus/menus.types";
import { ADMIN_PROFILE_PATH, FALLBACK_NAV_ITEMS } from "./admin-nav-config";
import { resolveMenuIcon } from "./menu-icons";
import { useNavState } from "./use-nav-state";

function isPathActive(currentPath: string, targetPath: string | null): boolean {
  if (!targetPath) return false;
  if (currentPath === targetPath) return true;
  if (targetPath === "/admin") return false;
  return currentPath.startsWith(`${targetPath}/`);
}

function isMenuLeaf(node: MenuNode): boolean {
  return node.type !== "group";
}

function flattenLeaves(items: readonly MenuNode[]): MenuNode[] {
  const out: MenuNode[] = [];
  function walk(nodes: readonly MenuNode[]) {
    for (const node of nodes) {
      if (isMenuLeaf(node)) {
        out.push(node);
      } else {
        walk(node.children);
      }
    }
  }
  walk(items);
  return out;
}

function groupHasActiveLeaf(group: MenuNode, currentPath: string): boolean {
  function walk(nodes: readonly MenuNode[]): boolean {
    for (const node of nodes) {
      if (isMenuLeaf(node)) {
        if (isPathActive(currentPath, node.path)) return true;
      } else if (walk(node.children)) {
        return true;
      }
    }
    return false;
  }
  return walk(group.children);
}

type AdminSidebarContentProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function AdminSidebarContent({ collapsed = false, onNavigate }: AdminSidebarContentProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { data, isLoading, isError } = useAuthorizedMenuTree();

  const tree: readonly MenuNode[] = React.useMemo(() => {
    if (isError || !data || data.length === 0) return FALLBACK_NAV_ITEMS;
    return data;
  }, [data, isError]);

  const { isOpen, toggle } = useNavState(tree, currentPath, !isLoading);

  return (
    <div className="flex h-full flex-col bg-sidebar-bg text-text-strong">
      <nav aria-label="后台主导航" className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {isLoading ? (
          <SidebarSkeleton collapsed={collapsed} />
        ) : (
          <>
            {isError ? <SidebarErrorHint /> : null}
            <ul className="flex flex-col gap-0.5">
              {tree.map((item) => (
                <NavNode
                  key={item.id}
                  node={item}
                  depth={0}
                  currentPath={currentPath}
                  isOpen={isOpen}
                  toggle={toggle}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              ))}
            </ul>
          </>
        )}
      </nav>

      <SidebarFooterCard collapsed={collapsed} />
    </div>
  );
}

function SidebarFooterCard({ collapsed = false }: { collapsed?: boolean }) {
  if (collapsed) {
    return <div className="mt-auto border-t border-line py-2" />;
  }
  return (
    <div className="mt-auto border-t border-line bg-line-soft/30 px-4 py-3">
      <p className="text-[11px] text-text-mute">v1.0 · 移山后台</p>
    </div>
  );
}

function SidebarSkeleton({ collapsed = false }: { collapsed?: boolean }) {
  const widths = ["78%", "92%", "65%", "85%", "70%", "88%"];
  if (collapsed) {
    return (
      <ul className="flex flex-col items-center gap-2" aria-hidden>
        {widths.map((_width, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton 是固定数量、顺序固定的占位
            key={`skel-${i}`}
            className="h-6 animate-pulse rounded-md bg-brand-50/60"
            style={{ width: "60%" }}
          />
        ))}
      </ul>
    );
  }
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {widths.map((width, i) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton 是固定数量、顺序固定的占位
          key={`skel-${i}`}
          className="h-6 w-full animate-pulse rounded-md bg-brand-50/60"
          style={{ width }}
        />
      ))}
    </ul>
  );
}

function SidebarErrorHint() {
  return (
    <p className="mb-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
      菜单加载失败，已切换到默认导航
    </p>
  );
}

type NavNodeProps = {
  node: MenuNode;
  depth: number;
  currentPath: string;
  isOpen: (groupId: string) => boolean;
  toggle: (groupId: string) => void;
  onNavigate?: () => void;
  collapsed?: boolean;
};

function NavNode({
  node,
  depth,
  currentPath,
  isOpen,
  toggle,
  onNavigate,
  collapsed = false,
}: NavNodeProps) {
  if (isMenuLeaf(node)) {
    return (
      <NavLeaf
        leaf={node}
        depth={depth}
        currentPath={currentPath}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
    );
  }
  return (
    <NavGroup
      group={node}
      depth={depth}
      currentPath={currentPath}
      isOpen={isOpen}
      toggle={toggle}
      onNavigate={onNavigate}
      collapsed={collapsed}
    />
  );
}

function NavLeaf({
  leaf,
  depth,
  currentPath,
  onNavigate,
  collapsed = false,
}: {
  leaf: MenuNode;
  depth: number;
  currentPath: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const targetPath = leaf.path;
  if (!targetPath) return null;
  const active = isPathActive(currentPath, targetPath);
  const Icon = resolveMenuIcon(leaf.icon);
  const isTopLevel = depth === 0;

  if (collapsed) {
    return (
      <li className="relative">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-0.5 bg-brand-500 transition-opacity duration-200",
            active ? "opacity-100" : "opacity-0",
          )}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={targetPath}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={leaf.name}
              className={cn(
                "group relative flex items-center justify-center rounded-[4px] py-2 transition-colors duration-150",
                active
                  ? "bg-line-soft text-text-strong"
                  : "text-text-soft hover:bg-line-soft hover:text-text-strong",
              )}
            >
              <Icon
                className={cn(
                  "shrink-0 transition-colors size-[18px]",
                  active ? "text-brand-500" : "text-text-mute group-hover:text-text-soft",
                )}
                aria-hidden
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{leaf.name}</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li className="relative">
      <Link
        to={targetPath}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-[4px] py-2 transition-colors duration-150",
          isTopLevel
            ? "pl-4 pr-3 text-[14px]"
            : depth === 1
              ? "pl-10 pr-3 text-[14px]"
              : depth === 2
                ? "pl-16 pr-3 text-[14px]"
                : depth === 3
                  ? "pl-[5.5rem] pr-3 text-[14px]"
                  : "pl-[7rem] pr-3 text-[14px]",
          active
            ? "bg-brand-50 font-medium text-brand-600"
            : "text-text-soft hover:bg-line-soft hover:text-text-strong",
        )}
      >
        <Icon
          className={cn(
            "shrink-0 transition-colors",
            isTopLevel || depth === 1 ? "size-[18px]" : depth === 2 ? "size-[16px]" : "size-3.5",
            active ? "text-brand-500" : "text-text-mute group-hover:text-text-soft",
          )}
          aria-hidden
        />
        <span className="truncate">{leaf.name}</span>
      </Link>
    </li>
  );
}

function NavGroup({
  group,
  depth,
  currentPath,
  isOpen,
  toggle,
  onNavigate,
  collapsed = false,
}: {
  group: MenuNode;
  depth: number;
  currentPath: string;
  isOpen: (groupId: string) => boolean;
  toggle: (groupId: string) => void;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const open = isOpen(group.id);
  const Icon = resolveMenuIcon(group.icon);
  const containsActive = groupHasActiveLeaf(group, currentPath);
  const isTopLevel = depth === 0;

  if (collapsed) {
    return (
      <li className="mt-1 first:mt-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "group flex w-full items-center justify-center rounded-[4px] py-2 transition-colors",
                containsActive
                  ? "bg-line-soft text-text-strong"
                  : "text-text-soft hover:bg-line-soft hover:text-text-strong",
              )}
            >
              <Icon
                className={cn(
                  "shrink-0 size-[18px]",
                  containsActive ? "text-brand-500" : "text-text-mute group-hover:text-text-soft",
                )}
                aria-hidden
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{group.name}</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li className={cn(isTopLevel ? "mt-0 first:mt-2" : "mt-1")}>
      <Collapsible open={open} onOpenChange={() => toggle(group.id)}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            className={cn(
              "group/trigger flex w-full items-center gap-1.5 rounded-[4px] transition-colors",
              isTopLevel
                ? // 顶层 group 作为「段落小标题」：略大一号 + semibold + uppercase + tracking 撑起视觉分层
                  "px-2.5 py-2 text-[14px] font-semibold uppercase tracking-wider text-text-soft hover:text-text-strong"
                : // 嵌套子 group 与 leaf 视觉相似，作为「次级段落标题」
                  "px-3 py-1.5 text-[12.5px] font-medium text-text-soft hover:bg-line-soft hover:text-text-strong",
              containsActive && !isTopLevel && "text-text-strong",
            )}
          >
            <ChevronRight
              className={cn(
                "shrink-0 transition-transform duration-200",
                isTopLevel ? "size-3" : "size-3.5",
                open ? "rotate-90" : "rotate-0",
              )}
              aria-hidden
            />
            <Icon
              className={cn(
                "shrink-0",
                isTopLevel ? "size-3.5" : "size-3.5",
                containsActive && isTopLevel ? "text-brand-500" : "text-text-mute",
              )}
              aria-hidden
            />
            <span className={cn("truncate text-left", isTopLevel && "flex-1")}>{group.name}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            "overflow-hidden",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1",
          )}
        >
          <div className={cn("relative", isTopLevel ? "mt-1" : "mt-1")}>
            <ul className="flex flex-col gap-1">
              {group.children.map((child) => (
                <NavNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  currentPath={currentPath}
                  isOpen={isOpen}
                  toggle={toggle}
                  onNavigate={onNavigate}
                  collapsed={collapsed}
                />
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

type AdminBreadcrumbProps = {
  path: string;
};

export function AdminBreadcrumb({ path }: AdminBreadcrumbProps) {
  const { data, isLoading } = useAuthorizedMenuTree();
  const tree: readonly MenuNode[] = data ?? FALLBACK_NAV_ITEMS;
  const items = React.useMemo(() => buildBreadcrumb(tree, path), [tree, path]);

  if (isLoading && items.length === 0) {
    return <span className="text-sm text-text-mute">加载中…</span>;
  }

  return (
    <nav aria-label="面包屑" className="flex items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = resolveMenuIcon(item.iconName);
        return (
          <React.Fragment key={`${item.title}-${index}`}>
            {index > 0 ? <ChevronRight className="size-3.5 text-text-mute" aria-hidden /> : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 truncate transition-colors",
                isLast ? "font-medium text-text-strong" : "text-text-soft hover:text-brand-700",
              )}
            >
              <Icon className="size-4 shrink-0 text-current" aria-hidden />
              <span className="truncate">{item.title}</span>
            </span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

type Crumb = { title: string; iconName: string | null };

function buildBreadcrumb(tree: readonly MenuNode[], path: string): Crumb[] {
  const out: Crumb[] = [];

  function search(nodes: readonly MenuNode[], trail: Crumb[]): boolean {
    for (const node of nodes) {
      if (isMenuLeaf(node)) {
        if (node.path && isPathActive(path, node.path)) {
          // 命中：trail 里是各层 group 的标题，追加当前 leaf 标题
          out.push({ title: "首页", iconName: "Home" });
          for (const t of trail) out.push(t);
          out.push({ title: node.name, iconName: node.icon });
          return true;
        }
        continue;
      }
      // group 节点：把 group 自己压栈再递归
      trail.push({ title: node.name, iconName: node.icon });
      if (search(node.children, trail)) return true;
      trail.pop();
    }
    return false;
  }

  search(tree, []);

  if (out.length === 0) {
    // 没命中任何叶子（path 不在菜单里）→ 至少显示首页
    return [{ title: "首页", iconName: "Home" }];
  }

  return out;
}

export { ADMIN_PROFILE_PATH };

/**
 * 仅供 tests 内部使用：导出 flat leaves 工具。
 */
export const __testing = {
  flattenLeaves,
  buildBreadcrumb,
};
