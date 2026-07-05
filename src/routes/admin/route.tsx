import { redirect } from "@tanstack/react-router";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { AdminBreadcrumb, AdminShell, useSidebarCollapsed } from "@/components/admin/layout";
import { getCurrentUser } from "~/features/auth/auth.actions";
import { getAuthorizedMenuPaths } from "~/features/menus/menus.actions";

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
