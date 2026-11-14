/**
 * 门户页面设计页：页面自带 PageSchema，页头页脚来自全站公共布局。
 *
 * 数据归属（见 `portal-content.layout.ts`）：
 * - 页头 / 页脚是全站共享的一份（SiteLayout），所有页面加载时拼接；
 * - 页面只存自己的正文（Main）。
 *
 * 加载：页面正文 + 公共布局 → `composePageSchema` → 完整 PageSchema 交给编辑器。
 * 落库：完整 PageSchema 原样交给服务端，由服务端拆开——正文写进页面、页头页脚写进公共布局，
 * 同一个事务。两个出口：
 * - 「预览」：先存草稿（不发布）再预览，预览看到的就是库里真实存着的内容；
 * - 「保存」：保存即发布（Ctrl+S 同一个出口）。
 *
 * 公共布局会影响所有页面，所以**发布**前要确认。确认的基线是「已发布版本」而不是「草稿」：
 * 预览会把公共布局的改动存成草稿，若拿草稿当基线，之后点保存就判断成「没改」而不再确认，
 * 服务端却会把待发布的布局草稿一并发布出去——等于绕过确认。
 */
import * as React from "react";

import { toast } from "sonner";
import { useConfirm } from "~/components/admin/form/use-confirm";
import {
  type SiteLayoutContent,
  type SiteLayoutSource,
  composePageSchema,
  decomposePageSchema,
  resolveSiteLayout,
  siteLayoutEquals,
} from "~/features/portal-content/portal-content.layout";
import {
  usePortalPage,
  usePortalSiteLayout,
} from "~/features/portal-content/portal-content.queries";
import type { PortalSiteLayoutDto } from "~/features/portal-content/portal-content.types";
import { useSavePortalPageDesign } from "~/features/portal-content/portal-content.use-mutations";

import { getBlockTemplate, instantiateTemplate } from "./blocks/block-template-catalog";
import type { LowcodePageSchema } from "./engine";
import { PortalDesignShell, toJsonValue, toLowcodePageSchema } from "./portal-design-shell";

/**
 * 公共布局还没初始化（库里没有记录）时编辑器用的起点：标准导航模板做页头、页脚留空。
 * 第一次保存才真正落库，之后所有页面共用它。id 固定，两个人同时打开也得到同一份起点。
 */
function defaultLayoutSource(): SiteLayoutSource {
  const standard = getBlockTemplate("header-standard");
  return {
    draftHeader: standard ? [instantiateTemplate(standard, "site_header_default")] : [],
    draftFooter: [],
  };
}

function layoutSourceOf(layout: PortalSiteLayoutDto): SiteLayoutSource {
  return layout.initialized ? layout : defaultLayoutSource();
}

interface LayoutBaseline {
  /** 线上（已发布）的公共布局内容：发布前与它比较，不同就要确认 */
  published: SiteLayoutContent;
  /** 读取时的版本号，保存时带回去做乐观锁；每次落库后用服务端返回的最新值刷新 */
  version: number;
}

export function PortalPageDesignPage({ pageId }: { pageId: string }) {
  const pageQuery = usePortalPage(pageId);
  const layoutQuery = usePortalSiteLayout();
  const saveMut = useSavePortalPageDesign();
  const { confirm, ConfirmElement } = useConfirm();

  const data = pageQuery.data;
  const layout = layoutQuery.data;

  // 有草稿用草稿，否则用已发布版本；都没有就是空白页（只有三个空槽，页头页脚由公共布局提供）
  const schema = React.useMemo<LowcodePageSchema | null>(() => {
    if (!data || !layout) return null;
    const composed = composePageSchema({
      siteLayout: layoutSourceOf(layout),
      pageMainSchema: data.draftSchema ?? data.publishedSchema,
      mode: "draft",
    });
    return toLowcodePageSchema(composed as unknown as Parameters<typeof toLowcodePageSchema>[0]);
  }, [data, layout]);

  // 编辑器只用首次加载到的数据起步，落库后的重新拉取不会重建编辑器，
  // 所以基线要自己记着，每次落库成功后用服务端返回的最新值刷新。
  const baseline = React.useRef<LayoutBaseline | null>(null);
  if (layout && baseline.current === null) {
    baseline.current = {
      published: resolveSiteLayout(layoutSourceOf(layout), "published"),
      version: layout.version,
    };
  }

  const { mutateAsync: savePageDesign } = saveMut;

  /** 落库：`publish` 为 false 只存草稿（预览用），为 true 同时发布（保存用）。 */
  const persist = React.useCallback(
    async (next: LowcodePageSchema, publish: boolean) => {
      const result = await savePageDesign({
        pageId,
        schema: toJsonValue(next) as Record<string, never>,
        expectedLayoutVersion: baseline.current?.version,
        publish,
      });
      if (baseline.current) {
        baseline.current.version = result.layout.version;
        if (publish) baseline.current.published = resolveSiteLayout(result.layout, "published");
      }
    },
    [pageId, savePageDesign],
  );

  /** 预览：存草稿再预览，不发布，所以不需要「影响所有页面」的确认。 */
  const handlePreview = React.useCallback(
    (next: LowcodePageSchema) => persist(next, false),
    [persist],
  );

  /** 保存 = 发布：公共布局与线上不一致（会影响所有页面）时先确认。 */
  const handleSave = React.useCallback(
    async (next: LowcodePageSchema) => {
      const base = baseline.current;
      const parts = decomposePageSchema(next);
      if (base && parts.hasLayout) {
        const current = { header: parts.header ?? [], footer: parts.footer ?? [] };
        if (!siteLayoutEquals(base.published, current)) {
          const ok = await confirm({
            title: "修改全站公共布局",
            description: "当前修改包含全站公共布局，保存后将影响所有页面。",
            confirmLabel: "保存并发布",
          });
          if (!ok) return;
        }
      }
      await persist(next, true);
      toast.success("保存成功");
    },
    [confirm, persist],
  );

  return (
    <>
      <PortalDesignShell
        documentId={data?.id ?? null}
        noun="页面"
        loading={pageQuery.isLoading || layoutQuery.isLoading}
        error={pageQuery.isError ? pageQuery.error : layoutQuery.isError ? layoutQuery.error : null}
        schema={schema}
        onSave={handleSave}
        onPreview={handlePreview}
      />
      <ConfirmElement />
    </>
  );
}
