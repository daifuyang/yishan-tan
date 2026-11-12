/**
 * 门户页面设计页：页面自带 PageSchema。
 *
 * 引擎的「保存」写草稿（`draftSchema`），不影响线上；工具栏里的「发布」按钮由引擎渲染、
 * 行为在这里定义：先把编辑器里此刻的内容存为草稿，再把草稿拷贝为已发布版本
 * （`publishedSchema`），前台只读已发布版本。
 */
import * as React from "react";

import { usePortalPage } from "~/features/portal-content/portal-content.queries";
import {
  usePublishPortalPage,
  useUpdatePortalPage,
} from "~/features/portal-content/portal-content.use-mutations";

import type { LowcodePageSchema, LowcodeToolbarItem } from "./engine";
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

  const handleSave = React.useCallback(
    async (next: LowcodePageSchema) => {
      await updateMut.mutateAsync({ id: pageId, draftSchema: toJsonValue(next) });
    },
    [pageId, updateMut],
  );

  const { mutateAsync: updateDraft } = updateMut;
  const { mutateAsync: publish } = publishMut;
  const published = data?.published ?? false;

  const toolbar = React.useMemo<LowcodeToolbarItem[]>(
    () => [
      {
        key: "publish",
        label: published ? "发布更新" : "发布",
        title: "保存当前内容并发布到线上",
        variant: "primary",
        // 抛出的错误由引擎的错误提示展示，这里不吞。
        onClick: async ({ getSchema }) => {
          await updateDraft({ id: pageId, draftSchema: toJsonValue(getSchema()) });
          await publish(pageId);
        },
      },
    ],
    [pageId, published, updateDraft, publish],
  );

  return (
    <PortalDesignShell
      documentId={data?.id ?? null}
      noun="页面"
      loading={pageQuery.isLoading}
      error={pageQuery.isError ? pageQuery.error : null}
      schema={schema}
      onSave={handleSave}
      toolbar={toolbar}
    />
  );
}
