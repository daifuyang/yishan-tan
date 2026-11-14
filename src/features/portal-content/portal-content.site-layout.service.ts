/**
 * 全站公共布局（页头 / 页脚）的读写，以及「页面 + 公共布局」的一次性保存。
 *
 * 数据归属见 `portal-content.layout.ts`：页面只存正文，页头页脚存在 `portal_site_layout`，
 * 所有页面共用同一份。当前门户是单站点，所以只有一条 `default` 记录。
 *
 * 生命周期与页面一致：保存写草稿，发布把草稿拷贝成已发布版本；前台只读已发布版本。
 * 「保存即发布」时页面与（有改动的）公共布局在**同一个事务**里写入，不会出现只更新了页面、
 * 漏掉全站布局的半成功状态。
 */
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import {
  type SiteLayoutSource,
  composePageSchema,
  decomposePageSchema,
  resolveSiteLayout,
  siteLayoutEquals,
  stableStringify,
} from "./portal-content.layout";
import { getPortalPageService } from "./portal-content.service";
import type {
  GetPortalPageRenderService,
  GetPortalSiteLayoutService,
  PortalPageDto,
  PortalSiteLayoutDto,
  PublishPortalSiteLayoutService,
  SavePortalPageDesignService,
  UpdatePortalSiteLayoutService,
} from "./portal-content.types";

export const DEFAULT_SITE_LAYOUT_KEY = "default";

type Db = ReturnType<typeof getDb>;
/** `db` 和事务里的 `tx` 都满足：服务函数既能单独跑，也能被放进别人的事务。 */
type Executor = Pick<Db, "select" | "insert" | "update">;
type LayoutRow = schema.DbPortalSiteLayout;

const asArray = (value: unknown): schema.JsonValue[] | null =>
  Array.isArray(value) ? (value as schema.JsonValue[]) : null;

/** 库里的一行 → `composePageSchema` / `resolveSiteLayout` 认的来源形状。 */
function layoutSource(row: LayoutRow | null): SiteLayoutSource {
  return {
    draftHeader: row?.draftHeaderSchema,
    publishedHeader: row?.publishedHeaderSchema,
    draftFooter: row?.draftFooterSchema,
    publishedFooter: row?.publishedFooterSchema,
  };
}

function toLayoutDto(row: LayoutRow | null): PortalSiteLayoutDto {
  if (!row) {
    return {
      key: DEFAULT_SITE_LAYOUT_KEY,
      initialized: false,
      version: 0,
      draftHeader: [],
      publishedHeader: null,
      draftFooter: [],
      publishedFooter: null,
      unpublishedChanges: false,
      publishTime: null,
      updatedAt: null,
    };
  }
  // 草稿列还是 null（从没改过草稿）时，草稿视图就是已发布版本，和 compose 的取值一致
  const draftHeader = asArray(row.draftHeaderSchema) ?? asArray(row.publishedHeaderSchema) ?? [];
  const draftFooter = asArray(row.draftFooterSchema) ?? asArray(row.publishedFooterSchema) ?? [];
  const publishedHeader = asArray(row.publishedHeaderSchema);
  const publishedFooter = asArray(row.publishedFooterSchema);
  const unpublishedChanges =
    stableStringify([draftHeader, draftFooter]) !==
    stableStringify([publishedHeader ?? [], publishedFooter ?? []]);
  return {
    key: row.key,
    initialized: true,
    version: row.version,
    draftHeader,
    publishedHeader,
    draftFooter,
    publishedFooter,
    unpublishedChanges,
    publishTime: row.publishTime ? row.publishTime.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadLayoutRow(executor: Executor, forUpdate = false): Promise<LayoutRow | null> {
  const query = executor
    .select()
    .from(schema.portalSiteLayout)
    .where(eq(schema.portalSiteLayout.key, DEFAULT_SITE_LAYOUT_KEY))
    .limit(1);
  const rows = await (forUpdate ? query.for("update") : query);
  return rows[0] ?? null;
}

function assertLayoutVersion(row: LayoutRow | null, expected: number | undefined): void {
  if (expected !== undefined && (row?.version ?? 0) !== expected) {
    throw Errors.conflict("全站公共布局已被其他人修改，请刷新页面后再保存");
  }
}

interface LayoutWrite {
  header?: schema.JsonValue[];
  footer?: schema.JsonValue[];
  publish: boolean;
  operatorId?: string;
}

/**
 * 写公共布局（草稿 / 发布一次完成，version 只 +1）：
 * 没有这条记录就创建；`header` / `footer` 缺省表示这一块不动。
 */
async function writeLayout(
  executor: Executor,
  row: LayoutRow | null,
  write: LayoutWrite,
): Promise<LayoutRow> {
  const current = resolveSiteLayout(layoutSource(row), "draft");
  const draftHeader = write.header ?? (current.header as unknown as schema.JsonValue[]);
  const draftFooter = write.footer ?? (current.footer as unknown as schema.JsonValue[]);

  const values = {
    draftHeaderSchema: draftHeader,
    draftFooterSchema: draftFooter,
    ...(write.publish
      ? {
          publishedHeaderSchema: draftHeader,
          publishedFooterSchema: draftFooter,
          publishTime: new Date(),
        }
      : {}),
    ...(write.operatorId ? { updaterId: write.operatorId } : {}),
  };

  if (!row) {
    const inserted = await executor
      .insert(schema.portalSiteLayout)
      .values({
        key: DEFAULT_SITE_LAYOUT_KEY,
        ...values,
        creatorId: write.operatorId ?? null,
        version: 1,
      })
      .returning();
    const created = inserted[0];
    if (!created) throw Errors.internal("保存全站公共布局失败");
    return created;
  }

  const updated = await executor
    .update(schema.portalSiteLayout)
    .set({ ...values, version: row.version + 1 })
    .where(eq(schema.portalSiteLayout.id, row.id))
    .returning();
  const next = updated[0];
  if (!next) throw Errors.internal("保存全站公共布局失败");
  return next;
}

/* ------------------------------------------------------------------ */
/* 读取 / 单独保存 / 单独发布                                            */
/* ------------------------------------------------------------------ */

export const getPortalSiteLayoutService: GetPortalSiteLayoutService = async () =>
  toLayoutDto(await loadLayoutRow(getDb()));

/** 只写草稿，不影响线上。 */
export const updatePortalSiteLayoutService: UpdatePortalSiteLayoutService = async (
  input,
  options,
) => {
  return getDb().transaction(async (tx) => {
    const row = await loadLayoutRow(tx, true);
    assertLayoutVersion(row, input.expectedVersion);
    if (input.header === undefined && input.footer === undefined) return toLayoutDto(row);
    const next = await writeLayout(tx, row, {
      header: input.header as schema.JsonValue[] | undefined,
      footer: input.footer as schema.JsonValue[] | undefined,
      publish: false,
      operatorId: options?.operatorId,
    });
    return toLayoutDto(next);
  });
};

/** 把草稿拷贝为已发布版本。没有草稿（记录都不存在）时拒绝。 */
export const publishPortalSiteLayoutService: PublishPortalSiteLayoutService = async (options) => {
  return getDb().transaction(async (tx) => {
    const row = await loadLayoutRow(tx, true);
    if (!row) throw Errors.invalid("全站公共布局还没有内容，请先在设计器里保存");
    const next = await writeLayout(tx, row, { publish: true, operatorId: options?.operatorId });
    return toLayoutDto(next);
  });
};

/* ------------------------------------------------------------------ */
/* 页面设计保存：页面正文 + 公共布局，一个事务                             */
/* ------------------------------------------------------------------ */

export const savePortalPageDesignService: SavePortalPageDesignService = async (input, options) => {
  let decomposed: ReturnType<typeof decomposePageSchema>;
  try {
    decomposed = decomposePageSchema(input.schema);
  } catch {
    throw Errors.invalid("页面结构不合法，无法保存");
  }

  const result = await getDb().transaction(async (tx) => {
    const pages = await tx
      .select({ id: schema.portalPage.id })
      .from(schema.portalPage)
      .where(and(eq(schema.portalPage.id, input.pageId), isNull(schema.portalPage.deletedAt)))
      .limit(1)
      .for("update");
    if (!pages[0]) throw Errors.notFound("页面不存在");

    // 页面只存正文：页头页脚槽在 mainSchema 里是空的（由 decompose 保证，与客户端无关）
    const mainSchema = decomposed.mainSchema as unknown as schema.JsonValue;
    await tx
      .update(schema.portalPage)
      .set({
        draftSchema: mainSchema,
        ...(input.publish ? { publishedSchema: mainSchema, publishTime: new Date() } : {}),
        ...(options?.operatorId ? { updaterId: options.operatorId } : {}),
      })
      .where(eq(schema.portalPage.id, input.pageId));

    // 扁平页面（没有 PageLayout）不归公共布局管：不读、不写
    let layoutRow: LayoutRow | null = null;
    let layoutChanged = false;
    if (decomposed.hasLayout) {
      layoutRow = await loadLayoutRow(tx, true);
      const current = resolveSiteLayout(layoutSource(layoutRow), "draft");
      const next = {
        header: decomposed.header ?? [],
        footer: decomposed.footer ?? [],
      };
      layoutChanged = !siteLayoutEquals(current, next);
      const pendingPublish =
        input.publish && layoutRow !== null && toLayoutDto(layoutRow).unpublishedChanges;

      if (layoutChanged) {
        // 别人在你读取之后改过全站布局：拒绝，免得互相覆盖
        assertLayoutVersion(layoutRow, input.expectedLayoutVersion);
      }
      if (layoutChanged || pendingPublish) {
        layoutRow = await writeLayout(tx, layoutRow, {
          header: layoutChanged ? (next.header as unknown as schema.JsonValue[]) : undefined,
          footer: layoutChanged ? (next.footer as unknown as schema.JsonValue[]) : undefined,
          publish: input.publish,
          operatorId: options?.operatorId,
        });
      }
    }
    return { layoutRow, layoutChanged };
  });

  const detail = await getPortalPageService(input.pageId);
  if (!detail) throw Errors.notFound("页面不存在");
  const { draftSchema: _draft, publishedSchema: _published, ...page } = detail;
  return {
    page: page as PortalPageDto,
    layout: toLayoutDto(result.layoutRow ?? (await loadLayoutRow(getDb()))),
    layoutChanged: result.layoutChanged,
  };
};

/* ------------------------------------------------------------------ */
/* 渲染：公共页头 + 页面正文 + 公共页脚                                    */
/* ------------------------------------------------------------------ */

/**
 * 取一个页面组合后的完整 Schema。已发布模式只读已发布的页面与已发布的公共布局，
 * 前台渲染用它；草稿模式给预览 / 编辑器。组合用的和设计器是同一个纯函数，三处一致。
 */
export const getPortalPageRenderService: GetPortalPageRenderService = async (id, mode) => {
  const page = await getPortalPageService(id);
  if (!page) return null;
  // 前台不渲染被停用的页面；草稿（设计器 / 预览）不受影响
  if (mode === "published" && page.status !== "enabled") return null;
  const main =
    mode === "published" ? page.publishedSchema : (page.draftSchema ?? page.publishedSchema);
  if (!main) return null;

  const row = await loadLayoutRow(getDb());
  const composed = composePageSchema({
    siteLayout: layoutSource(row),
    pageMainSchema: main,
    mode,
  });
  return {
    pageId: id,
    mode,
    schema: composed as unknown as schema.JsonValue,
    layoutVersion: row?.version ?? 0,
  };
};
