import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/admin/layout";
import { usePortalTemplateListView } from "@/components/admin/portal/portal-template-list";

export const Route = createFileRoute("/admin/portal/page-templates")({
  component: AdminPortalPageTemplatesPage,
});

function AdminPortalPageTemplatesPage() {
  const view = usePortalTemplateListView({
    type: "page",
    title: "页面模板管理",
    toolbarTitle: "页面模板列表",
    settingsKey: "portal-page-templates",
  });

  return (
    <>
      <ResourcePage
        title={view.title}
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={view.filter}
        filterValues={view.filterValues}
        onFilterSubmit={view.onFilterSubmit}
        onFilterReset={view.onFilterReset}
        filterLoading={view.filterLoading}
        toolbarTitle={view.toolbarTitle}
        toolbarActions={view.toolbarActions}
        tableProps={view.tableProps}
      />
      {view.dialogs}
    </>
  );
}
