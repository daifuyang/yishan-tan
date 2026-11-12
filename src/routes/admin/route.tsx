import { redirect } from "@tanstack/react-router";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { AdminBreadcrumb, AdminShell, useSidebarCollapsed } from "@/components/admin/layout";
import { getCurrentUser } from "~/features/auth/auth.actions";
import { getAuthorizedMenuPaths } from "~/features/menus/menus.actions";

/** 设计页路径前缀（不在菜单树里，是列表页的子页面，按对应列表的菜单权限放行）。 */
const TEMPLATE_DESIGN_PREFIX = "/admin/portal/templates/";
const PAGE_DESIGN_PREFIX = "/admin/portal/page-designer/";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    // 工作台（/admin 自身）永远允许访问：作为登录后的兜底落地页。
    if (location.pathname === "/admin") {
      return { user };
    }

    // 其余子路径必须命中授权菜单树；命中失败回退到工作台。
    const paths = await getAuthorizedMenuPaths();

    // 模板设计页不在菜单树里（它是模板列表的子页面，不是独立菜单项），
    // 权限按「能不能进模板管理」判定。
    if (location.pathname.startsWith(TEMPLATE_DESIGN_PREFIX)) {
      if (!paths.includes("/admin/portal/article-templates")) {
        throw redirect({ to: "/admin" });
      }
      return { user };
    }

    // 页面设计页同理，按「能不能进页面管理」判定。
    if (location.pathname.startsWith(PAGE_DESIGN_PREFIX)) {
      if (!paths.includes("/admin/portal/pages")) {
        throw redirect({ to: "/admin" });
      }
      return { user };
    }

    const allowed = paths.some((p) => locationMatchesPath(location.pathname, p));
    if (!allowed) {
      throw redirect({ to: "/admin" });
    }

    return { user };
  },
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  const { collapsed, toggle } = useSidebarCollapsed();
  const location = useLocation();

  // 设计页（模板 / 页面）是「全屏工具」：不套后台外壳（侧边栏 / 顶栏 / 面包屑），
  // 画布要占满窗口。鉴权仍在 beforeLoad 里做。
  if (
    location.pathname.startsWith(TEMPLATE_DESIGN_PREFIX) ||
    location.pathname.startsWith(PAGE_DESIGN_PREFIX)
  ) {
    return <Outlet />;
  }

  return (
    <AdminShell collapsed={collapsed} onToggleCollapsed={toggle}>
      <div className="space-y-4">
        <AdminBreadcrumb path={location.pathname} />
        <Outlet />
      </div>
    </AdminShell>
  );
}

/**
 * 路径匹配：精确相等，或 pathname 是 menuPath 的子路径（如 /admin/users/123 命中 /admin/users）。
 */
function locationMatchesPath(currentPath: string, menuPath: string): boolean {
  if (currentPath === menuPath) return true;
  return currentPath.startsWith(`${menuPath}/`);
}
