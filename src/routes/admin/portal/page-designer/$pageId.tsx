import { createFileRoute } from "@tanstack/react-router";

import { PortalPageDesignPage } from "@/components/admin/portal/lowcode/portal-page-design-page";

/**
 * 门户页面设计页（低代码编辑器）。
 *
 * 目录刻意不叫 `pages/`：与 `pages.tsx` 同名的目录会让 TanStack 把列表页当父布局。
 * `admin/route.tsx` 的 `beforeLoad` 对这个前缀按「页面管理」菜单权限放行。
 */
export const Route = createFileRoute("/admin/portal/page-designer/$pageId")({
  component: PageDesignRoute,
});

function PageDesignRoute() {
  const { pageId } = Route.useParams();
  return <PortalPageDesignPage pageId={pageId} />;
}
