import { redirect } from "@tanstack/react-router";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { AdminBreadcrumb, AdminShell, useSidebarCollapsed } from "@/components/admin/layout";

/**
 * Static preview override (EdgeOne Makers static hosting only).
 *
 * The real route calls getCurrentUser() / getAuthorizedMenuPaths(), which are
 * TanStack Start server functions. With no server, they return the SPA fallback
 * HTML instead of JSON, and the sidebar crashes with "r is not iterable".
 * Downgrade to the login screen so the preview never shows a blank error page.
 * This file is copied over the isolated build ONLY; the repo source is untouched.
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    throw redirect({
      to: "/login",
      search: { redirect: "/admin" },
    });
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
