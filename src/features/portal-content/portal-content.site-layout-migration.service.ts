/**
 * 旧页面 → 全站公共布局的数据迁移。
 *
 * 旧页面存的是完整 PageSchema（页头页脚在 `PageLayout` 的槽里）。这里把页头页脚抽到
 * `portal_site_layout`，页面只留正文。原则：**不静默丢任何页面原有内容**。
 *
 * 规则（可复述、可重复）：
 * 1. 备份：改动任何页面之前，先把它完整的旧 Schema 写进 `portal_page_schema_backup`
 *    （reason = `pre-site-layout`，(页面, reason) 唯一，重跑不会覆盖第一次的原始备份）。
 * 2. 选取：每个页面取「草稿，没有则已发布」里的页头 / 页脚，按**去掉节点 id 后的内容指纹**归类；
 *    出现的页面数最多的那一份当作全站公共版本，并列取最早创建的页面（再并列取 id 小的）。
 * 3. 冲突：与公共版本不一致的页面**原样保留**（页面里的页头页脚不动，备份里也有一份），
 *    并写进迁移报告，由人决定怎么处理。
 * 4. 公共布局已经存在时一律以它为准，绝不覆盖；只把「与它完全一致」的页面里的页头页脚抽掉。
 * 5. 没有 `PageLayout` 的扁平页面不参与迁移，原样保留（报告里列出）。
 * 6. 幂等：已抽空的页面没有候选、公共布局已存在、备份已存在，所以重跑什么都不会变。
 *
 * 注意：冲突页面在编辑器 / 渲染里显示的是公共页头（组合时公共布局优先），页面自己的旧页头只是
 * 保留在数据里。在设计器里重新保存该页面会把它的页头槽清空——旧内容仍可从备份表找回。
 */
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import {
  type PageSchemaDoc,
  type SchemaNode,
  decomposePageSchema,
  isSchemaNode,
  nodesFingerprint,
  resolveSiteLayout,
  withSlotChildren,
} from "./portal-content.layout";
import { DEFAULT_SITE_LAYOUT_KEY } from "./portal-content.site-layout.service";

export const MIGRATION_BACKUP_REASON = "pre-site-layout";

export interface MigrationPageRow {
  id: string;
  title: string;
  path: string;
  createdAt: Date;
  draftSchema: schema.JsonValue | null;
  publishedSchema: schema.JsonValue | null;
}

export interface MigrationLayoutState {
  exists: boolean;
  header: SchemaNode[];
  footer: SchemaNode[];
}

type PageRef = { id: string; title: string; path: string };
type SchemaKind = "draft" | "published";
type Part = "header" | "footer";

export interface MigrationConflict extends PageRef {
  part: Part;
  schema: SchemaKind;
  reason: string;
}

export interface PortalSiteLayoutMigrationReport {
  dryRun: boolean;
  totalPages: number;
  /** 没有 PageLayout 的扁平页面：不参与迁移，原样保留。 */
  flatPages: PageRef[];
  /** 页头页脚本来就是空的（已迁移过，或页面压根没有）。 */
  cleanPages: number;
  /** 无法解析成页面结构的页面：跳过、不动。 */
  invalidPages: PageRef[];
  layout: {
    existed: boolean;
    created: boolean;
    headerNodes: number;
    footerNodes: number;
    headerSource: PageRef | null;
    footerSource: PageRef | null;
  };
  /** 页头页脚被抽出去的页面（备份已写入）。 */
  migratedPages: Array<PageRef & { schemas: SchemaKind[] }>;
  conflicts: MigrationConflict[];
  backupsCreated: number;
}

export interface MigrationPlan {
  layoutCreate: { header: SchemaNode[]; footer: SchemaNode[] } | null;
  pageUpdates: Array<{
    id: string;
    draftSchema?: schema.JsonValue;
    publishedSchema?: schema.JsonValue;
  }>;
  backups: Pick<MigrationPageRow, "id" | "draftSchema" | "publishedSchema">[];
  report: PortalSiteLayoutMigrationReport;
}

const ref = (page: MigrationPageRow): PageRef => ({
  id: page.id,
  title: page.title,
  path: page.path,
});

interface Variant {
  nodes: SchemaNode[];
  pages: MigrationPageRow[];
}

/** 在候选里选出「全站公共版本」：页面数最多 → 最早创建 → id 小。 */
function pickWinner(variants: Map<string, Variant>): Variant | null {
  const earliest = (variant: Variant) =>
    Math.min(...variant.pages.map((page) => page.createdAt.getTime()));
  const smallestId = (variant: Variant) => variant.pages.map((page) => page.id).sort()[0] ?? "";
  const sorted = [...variants.values()].sort((a, b) => {
    if (b.pages.length !== a.pages.length) return b.pages.length - a.pages.length;
    if (earliest(a) !== earliest(b)) return earliest(a) - earliest(b);
    return smallestId(a) < smallestId(b) ? -1 : 1;
  });
  return sorted[0] ?? null;
}

const asDoc = (value: schema.JsonValue | null): PageSchemaDoc | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as unknown as PageSchemaDoc)
    : null;

interface Parsed {
  page: MigrationPageRow;
  kind: SchemaKind;
  doc: PageSchemaDoc;
  header: SchemaNode[];
  footer: SchemaNode[];
}

/** 纯函数：给定所有页面和现有公共布局，算出要做什么（不碰数据库）。 */
export function planSiteLayoutMigration(
  pages: readonly MigrationPageRow[],
  layout: MigrationLayoutState,
  options: { dryRun?: boolean } = {},
): MigrationPlan {
  const report: PortalSiteLayoutMigrationReport = {
    dryRun: Boolean(options.dryRun),
    totalPages: pages.length,
    flatPages: [],
    cleanPages: 0,
    invalidPages: [],
    layout: {
      existed: layout.exists,
      created: false,
      headerNodes: layout.header.length,
      footerNodes: layout.footer.length,
      headerSource: null,
      footerSource: null,
    },
    migratedPages: [],
    conflicts: [],
    backupsCreated: 0,
  };

  // 1) 分解每个页面的每份 Schema
  const parsed: Parsed[] = [];
  for (const page of pages) {
    const sources: [SchemaKind, schema.JsonValue | null][] = [
      ["draft", page.draftSchema],
      ["published", page.publishedSchema],
    ];
    let invalid = false;
    let flat = false;
    for (const [kind, value] of sources) {
      if (value === null || value === undefined) continue;
      const doc = asDoc(value);
      if (!doc) {
        invalid = true;
        continue;
      }
      let result: ReturnType<typeof decomposePageSchema>;
      try {
        result = decomposePageSchema(doc);
      } catch {
        invalid = true;
        continue;
      }
      if (!result.hasLayout) {
        flat = true;
        continue;
      }
      parsed.push({
        page,
        kind,
        doc,
        header: (result.header ?? []).filter(isSchemaNode),
        footer: (result.footer ?? []).filter(isSchemaNode),
      });
    }
    if (flat) report.flatPages.push(ref(page));
    else if (invalid) report.invalidPages.push(ref(page));
  }

  // 2) 每个页面一票：取「草稿，没有则已发布」那一份的页头 / 页脚
  const headerVariants = new Map<string, Variant>();
  const footerVariants = new Map<string, Variant>();
  const voters = new Map<string, Parsed>();
  for (const entry of parsed) {
    const seen = voters.get(entry.page.id);
    if (!seen || (entry.kind === "draft" && seen.kind !== "draft"))
      voters.set(entry.page.id, entry);
  }
  for (const entry of voters.values()) {
    for (const [nodes, variants] of [
      [entry.header, headerVariants],
      [entry.footer, footerVariants],
    ] as const) {
      if (nodes.length === 0) continue;
      const key = nodesFingerprint(nodes);
      const existing = variants.get(key);
      if (existing) existing.pages.push(entry.page);
      else variants.set(key, { nodes, pages: [entry.page] });
    }
  }

  // 3) 公共版本：已有公共布局优先（绝不覆盖），否则取候选里的赢家
  let layoutCreate: MigrationPlan["layoutCreate"] = null;
  let headerNodes = layout.header;
  let footerNodes = layout.footer;
  if (!layout.exists) {
    const headerWinner = pickWinner(headerVariants);
    const footerWinner = pickWinner(footerVariants);
    if (headerWinner || footerWinner) {
      headerNodes = headerWinner?.nodes ?? [];
      footerNodes = footerWinner?.nodes ?? [];
      layoutCreate = { header: headerNodes, footer: footerNodes };
      report.layout.created = true;
      report.layout.headerNodes = headerNodes.length;
      report.layout.footerNodes = footerNodes.length;
      const headerOwner = headerWinner?.pages[0];
      const footerOwner = footerWinner?.pages[0];
      report.layout.headerSource = headerOwner ? ref(headerOwner) : null;
      report.layout.footerSource = footerOwner ? ref(footerOwner) : null;
    }
  }
  const keys: Record<Part, string> = {
    header: nodesFingerprint(headerNodes),
    footer: nodesFingerprint(footerNodes),
  };

  // 4) 逐页逐份决定：与公共版本一致的抽掉，不一致的保留并记冲突
  const updates = new Map<
    string,
    { draftSchema?: schema.JsonValue; publishedSchema?: schema.JsonValue }
  >();
  const migrated = new Map<string, PageRef & { schemas: SchemaKind[] }>();
  const dirtyPages = new Set<string>();

  for (const entry of parsed) {
    if (entry.header.length === 0 && entry.footer.length === 0) continue;
    dirtyPages.add(entry.page.id);

    let next: PageSchemaDoc = entry.doc;
    let touched = false;
    for (const [part, nodes] of [
      ["header", entry.header],
      ["footer", entry.footer],
    ] as const) {
      if (nodes.length === 0) continue;
      if (nodesFingerprint(nodes) === keys[part]) {
        next = withSlotChildren(next, part, []);
        touched = true;
      } else {
        report.conflicts.push({
          ...ref(entry.page),
          part,
          schema: entry.kind,
          reason:
            (part === "header" ? headerNodes : footerNodes).length === 0
              ? "全站公共布局这一块为空，页面自带的内容保持原样"
              : "与全站公共版本不一致，页面自带的内容保持原样",
        });
      }
    }
    if (!touched) continue;

    const patch = updates.get(entry.page.id) ?? {};
    if (entry.kind === "draft") patch.draftSchema = next as unknown as schema.JsonValue;
    else patch.publishedSchema = next as unknown as schema.JsonValue;
    updates.set(entry.page.id, patch);

    const item = migrated.get(entry.page.id) ?? { ...ref(entry.page), schemas: [] };
    item.schemas.push(entry.kind);
    migrated.set(entry.page.id, item);
  }

  const withContent = new Set(
    parsed.filter((e) => e.header.length > 0 || e.footer.length > 0).map((e) => e.page.id),
  );
  report.cleanPages = new Set(
    parsed.filter((e) => !withContent.has(e.page.id)).map((e) => e.page.id),
  ).size;
  report.migratedPages = [...migrated.values()];

  const updatedIds = new Set(updates.keys());
  return {
    layoutCreate,
    pageUpdates: [...updates.entries()].map(([id, patch]) => ({ id, ...patch })),
    backups: pages
      .filter((page) => updatedIds.has(page.id))
      .map(({ id, draftSchema, publishedSchema }) => ({ id, draftSchema, publishedSchema })),
    report,
  };
}

/**
 * 执行迁移：在一个事务里「写备份 → 创建公共布局 → 抽空页面」。
 * `dryRun` 只返回报告，不写任何数据。可以放心重复执行。
 */
export async function migrateSiteLayoutService(
  options: { dryRun?: boolean } = {},
): Promise<PortalSiteLayoutMigrationReport> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const pages = await tx
      .select({
        id: schema.portalPage.id,
        title: schema.portalPage.title,
        path: schema.portalPage.path,
        createdAt: schema.portalPage.createdAt,
        draftSchema: schema.portalPage.draftSchema,
        publishedSchema: schema.portalPage.publishedSchema,
      })
      .from(schema.portalPage)
      .where(isNull(schema.portalPage.deletedAt));

    const layoutRows = await tx
      .select()
      .from(schema.portalSiteLayout)
      .where(eq(schema.portalSiteLayout.key, DEFAULT_SITE_LAYOUT_KEY))
      .limit(1)
      .for("update");
    const row = layoutRows[0] ?? null;
    const current = resolveSiteLayout(
      {
        draftHeader: row?.draftHeaderSchema,
        publishedHeader: row?.publishedHeaderSchema,
        draftFooter: row?.draftFooterSchema,
        publishedFooter: row?.publishedFooterSchema,
      },
      "draft",
    );

    const plan = planSiteLayoutMigration(
      pages,
      { exists: row !== null, header: current.header, footer: current.footer },
      options,
    );
    if (options.dryRun) return plan.report;

    // 先备份（唯一键保证重跑不覆盖第一次的原始备份），再创建布局，最后改页面
    let created = 0;
    for (const backup of plan.backups) {
      const inserted = await tx
        .insert(schema.portalPageSchemaBackup)
        .values({
          pageId: backup.id,
          reason: MIGRATION_BACKUP_REASON,
          draftSchema: backup.draftSchema,
          publishedSchema: backup.publishedSchema,
        })
        .onConflictDoNothing()
        .returning({ id: schema.portalPageSchemaBackup.id });
      created += inserted.length;
    }
    if (plan.layoutCreate) {
      const header = plan.layoutCreate.header as unknown as schema.JsonValue;
      const footer = plan.layoutCreate.footer as unknown as schema.JsonValue;
      await tx.insert(schema.portalSiteLayout).values({
        key: DEFAULT_SITE_LAYOUT_KEY,
        draftHeaderSchema: header,
        publishedHeaderSchema: header,
        draftFooterSchema: footer,
        publishedFooterSchema: footer,
        publishTime: new Date(),
        version: 1,
      });
    }
    for (const update of plan.pageUpdates) {
      const { id, ...patch } = update;
      await tx
        .update(schema.portalPage)
        .set(patch)
        .where(and(eq(schema.portalPage.id, id), isNull(schema.portalPage.deletedAt)));
    }
    plan.report.backupsCreated = created;
    return plan.report;
  });
}
