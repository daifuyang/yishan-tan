import { createFileRoute } from "@tanstack/react-router";

import { PortalTemplateDesignPage } from "@/components/admin/portal/lowcode/portal-template-design-page";

/**
 * 门户模板设计页（低代码编辑器）。
 *
 * 路径刻意不挂在 `article-templates/` 下面：同名文件与同名
 * 目录并存时，TanStack 会把文件当父布局（列表页要渲染 `<Outlet/>`），列表页就
 * 废了。`templates/` 是 `/admin` 的平级子目录，`admin/route.tsx` 的
 * `beforeLoad` 对这个前缀做了显式放行。
 */
export const Route = createFileRoute("/admin/portal/templates/$templateId")({
  component: TemplateDesignRoute,
});

function TemplateDesignRoute() {
  const { templateId } = Route.useParams();
  return <PortalTemplateDesignPage templateId={templateId} />;
}
