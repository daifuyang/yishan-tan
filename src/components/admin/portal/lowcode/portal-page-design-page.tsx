/**
 * 门户页面设计页：页面自带 PageSchema。
 *
 * 编辑器顶栏只有「预览」和「保存」，**保存就是发布**：先把编辑器里此刻的内容存为草稿
 * （`draftSchema`），再把草稿拷贝为已发布版本（`publishedSchema`），前台只读已发布版本。
 * Ctrl+S 与保存按钮共用同一个出口，所以同样是发布。
 */
import * as React from "react";

import { usePortalPage } from "~/features/portal-content/portal-content.queries";
import {
  usePublishPortalPage,
  useUpdatePortalPage,
} from "~/features/portal-content/portal-content.use-mutations";

import type { LowcodePageSchema } from "./engine";
import { PortalDesignShell, toJsonValue, toLowcodePageSchema } from "./portal-design-shell";

export function PortalPageDesignPage({ pageId }: { pageId: string }) {
  const pageQuery = usePortalPage(pageId);
  const updateMut = useUpdatePortalPage();
  const publishMut = usePublishPortalPage();
  const data = pageQuery.data;
  // 有草稿用草稿，否则用已发布版本；都没有就是空白页，由设计器给起始页。
  const schema = React.useMemo(
    () => toLowcodePageSchema(data?.draftSchema ?? data?.publishedSchema),
    [data?.draftSchema, data?.publishedSchema],
  );

  const { mutateAsync: updateDraft } = updateMut;
  const { mutateAsync: publish } = publishMut;

  const handleSave = React.useCallback(
    async (next: LowcodePageSchema) => {
      await updateDraft({ id: pageId, draftSchema: toJsonValue(next) });
      await publish(pageId);
    },
    [pageId, updateDraft, publish],
  );

  return (
    <PortalDesignShell
      documentId={data?.id ?? null}
      noun="页面"
      loading={pageQuery.isLoading}
      error={pageQuery.isError ? pageQuery.error : null}
      schema={schema}
      onSave={handleSave}
    />
  );
}
