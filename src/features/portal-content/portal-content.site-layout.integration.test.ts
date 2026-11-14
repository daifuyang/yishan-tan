import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { type PgliteDatabase, drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let db: PgliteDatabase;
let client: PGlite;
vi.mock("~/lib/db.server", () => ({ getDb: () => db }));
vi.mock("~/lib/auth.server", () => ({ auth: {} }));

const schema = await import("~/../db/schema");
const layoutLib = await import("./portal-content.layout");
const {
  createPortalPageService,
  getPortalPageService,
  publishPortalPageService,
  updatePortalPageService,
} = await import("./portal-content.service");
const {
  getPortalPageRenderService,
  getPortalSiteLayoutService,
  publishPortalSiteLayoutService,
  savePortalPageDesignService,
  updatePortalSiteLayoutService,
} = await import("./portal-content.site-layout.service");
const { migrateSiteLayoutService, planSiteLayoutMigration } = await import(
  "./portal-content.site-layout-migration.service"
);

type Node = import("./portal-content.layout").SchemaNode;

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client);
  for (const file of readdirSync("db/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    await client.exec(readFileSync(`db/migrations/${file}`, "utf8"));
  }
}, 30_000);

afterAll(async () => {
  await client?.close();
});

beforeEach(async () => {
  await client.exec(
    'TRUNCATE "portal_page_schema_backup", "portal_site_layout", "portal_article_category", "portal_article", "portal_page", "portal_category", "portal_template" CASCADE',
  );
});

/* ----------------------------- 测试数据 ----------------------------- */

const node = (
  id: string,
  componentName: string,
  props: Record<string, unknown> = {},
  children?: Array<Node | string>,
): Node => ({ id, componentName, props, ...(children ? { children } : {}) });

const hdr = (id: string, brand = "码上云") => node(id, "SiteHeader", { brandText: brand });
const ftr = (id: string, text = "版权所有") => node(id, "SiteFooter", { text });
const text = (id: string, content: string) => node(id, "Typography", { content });

/** 一份完整页面：页头 + 正文 + 页脚都在 PageLayout 的槽里（编辑器里看到的样子）。 */
function fullPage(parts: { header?: Node[]; main?: Node[]; footer?: Node[] }) {
  let page = layoutLib.blankPageSchema();
  page = layoutLib.withSlotChildren(page, "header", parts.header ?? []);
  page = layoutLib.withSlotChildren(page, "main", parts.main ?? []);
  page = layoutLib.withSlotChildren(page, "footer", parts.footer ?? []);
  return page;
}

type JsonObject = Record<string, import("./portal-content.schema").PortalJsonValue>;
const asJson = (value: unknown) => value as JsonObject;
const slot = (page: unknown, name: string): Node[] => {
  const doc = page as import("./portal-content.layout").PageSchemaDoc;
  const layout = layoutLib.findPageLayout(doc.componentsTree) as Node;
  const found = (layout.children ?? []).find(
    (c) => typeof c !== "string" && c.props?.name === name,
  ) as Node;
  return (found.children ?? []) as Node[];
};
const ids = (nodes: Node[]) => nodes.map((n) => n.id);

async function newPage(path: string, title = path) {
  return createPortalPageService({ title, path, status: "enabled" });
}

async function savePage(
  pageId: string,
  parts: Parameters<typeof fullPage>[0],
  options: { publish?: boolean; expectedLayoutVersion?: number } = {},
) {
  return savePortalPageDesignService({
    pageId,
    schema: asJson(fullPage(parts)),
    publish: options.publish ?? true,
    expectedLayoutVersion: options.expectedLayoutVersion,
  });
}

describe("全站公共布局：保存 / 读取", () => {
  it("初始状态：没有记录，initialized 为 false，内容为空", async () => {
    const layout = await getPortalSiteLayoutService();
    expect(layout).toMatchObject({
      key: "default",
      initialized: false,
      version: 0,
      draftHeader: [],
      publishedHeader: null,
      unpublishedChanges: false,
    });
  });

  it("第一次保存：页头页脚落进 SiteLayout，页面只保存正文（页面里没有 SiteHeader）", async () => {
    const page = await newPage("/a");
    const result = await savePage(page.id, {
      header: [hdr("h1")],
      main: [text("t1", "正文 A")],
      footer: [ftr("f1")],
    });
    expect(result.layoutChanged).toBe(true);
    expect(result.layout).toMatchObject({
      initialized: true,
      version: 1,
      unpublishedChanges: false,
    });
    expect(ids(result.layout.draftHeader as unknown as Node[])).toEqual(["h1"]);
    expect(ids(result.layout.publishedFooter as unknown as Node[])).toEqual(["f1"]);

    const row = await getPortalPageService(page.id);
    const stored = JSON.stringify(row?.draftSchema);
    expect(stored).toContain("正文 A");
    expect(stored).not.toContain("SiteHeader");
    expect(stored).not.toContain("SiteFooter");
    expect(slot(row?.draftSchema, "header")).toEqual([]);
    expect(slot(row?.draftSchema, "footer")).toEqual([]);
    // 保存即发布：已发布版本也只有正文
    expect(JSON.stringify(row?.publishedSchema)).not.toContain("SiteHeader");
    expect(row?.published).toBe(true);
  });

  it("客户端没拆分也一样：服务端自己拆，页面里不会落下公共页头页脚", async () => {
    const page = await newPage("/a");
    // 直接把组合后的完整 Schema 传给服务端（页头页脚都在槽里）
    await savePortalPageDesignService({
      pageId: page.id,
      schema: asJson(
        fullPage({ header: [hdr("h1")], footer: [ftr("f1")], main: [text("t", "x")] }),
      ),
      publish: true,
    });
    const row = await getPortalPageService(page.id);
    expect(JSON.stringify(row?.draftSchema)).not.toContain("SiteHeader");
  });

  it("多页面共享同一份公共布局：新页面不用再放页头，渲染出来也有", async () => {
    const a = await newPage("/a");
    const b = await newPage("/b");
    await savePage(a.id, { header: [hdr("h1")], main: [text("ta", "A")], footer: [ftr("f1")] });

    // B 的编辑器里页头来自公共布局；它只改自己的正文，保存时页头原样带回
    const layout = await getPortalSiteLayoutService();
    const composedForB = layoutLib.composePageSchema({
      siteLayout: layout,
      pageMainSchema: null,
      mode: "draft",
    });
    expect(ids(slot(composedForB, "header"))).toEqual(["h1"]);
    const result = await savePortalPageDesignService({
      pageId: b.id,
      schema: asJson(layoutLib.withSlotChildren(composedForB, "main", [text("tb", "B")])),
      expectedLayoutVersion: layout.version,
      publish: true,
    });
    expect(result.layoutChanged).toBe(false);
    expect(result.layout.version).toBe(1); // 没改公共布局就不写、不升版本

    for (const [id, expected] of [
      [a.id, "tb"],
      [b.id, "tb"],
    ] as const) {
      const render = await getPortalPageRenderService(id, "published");
      expect(render).not.toBeNull();
      expect(ids(slot(render?.schema, "header"))).toEqual(["h1"]);
      expect(ids(slot(render?.schema, "footer"))).toEqual(["f1"]);
      void expected;
    }
    expect(
      ids(slot((await getPortalPageRenderService(a.id, "published"))?.schema, "main")),
    ).toEqual(["ta"]);
    expect(
      ids(slot((await getPortalPageRenderService(b.id, "published"))?.schema, "main")),
    ).toEqual(["tb"]);
  });

  it("修改 Header 会影响其他页面；修改 Main 不影响其他页面", async () => {
    const a = await newPage("/a");
    const b = await newPage("/b");
    await savePage(a.id, { header: [hdr("h1", "旧")], main: [text("ta", "A 原文")] });
    await savePage(b.id, { header: [hdr("h1", "旧")], main: [text("tb", "B 原文")] });
    const v = (await getPortalSiteLayoutService()).version;

    // B 改正文：A 的渲染完全不变
    const beforeA = await getPortalPageRenderService(a.id, "published");
    await savePage(b.id, { header: [hdr("h1", "旧")], main: [text("tb", "B 改过了")] });
    const afterA = await getPortalPageRenderService(a.id, "published");
    expect(layoutLib.stableStringify(afterA?.schema)).toBe(
      layoutLib.stableStringify(beforeA?.schema),
    );
    expect((await getPortalSiteLayoutService()).version).toBe(v);

    // B 改页头：A 的页头跟着变，A 的正文不变
    const changed = await savePage(
      b.id,
      { header: [hdr("h1", "新品牌")], main: [text("tb", "B 改过了")] },
      { expectedLayoutVersion: v },
    );
    expect(changed.layoutChanged).toBe(true);
    const renderA = await getPortalPageRenderService(a.id, "published");
    expect((slot(renderA?.schema, "header")[0] as Node).props?.brandText).toBe("新品牌");
    expect(ids(slot(renderA?.schema, "main"))).toEqual(["ta"]);
    expect((await getPortalSiteLayoutService()).version).toBe(v + 1);
  });

  it("草稿与已发布分开：只存草稿时前台仍是旧版本，发布后才变", async () => {
    const page = await newPage("/a");
    await savePage(page.id, { header: [hdr("h1", "线上版")], main: [text("t", "正文")] });
    const v = (await getPortalSiteLayoutService()).version;

    await savePage(
      page.id,
      { header: [hdr("h1", "草稿版")], main: [text("t", "正文")] },
      { publish: false, expectedLayoutVersion: v },
    );
    const layout = await getPortalSiteLayoutService();
    expect(layout.unpublishedChanges).toBe(true);

    const published = await getPortalPageRenderService(page.id, "published");
    const draft = await getPortalPageRenderService(page.id, "draft");
    expect((slot(published?.schema, "header")[0] as Node).props?.brandText).toBe("线上版");
    expect((slot(draft?.schema, "header")[0] as Node).props?.brandText).toBe("草稿版");

    await publishPortalSiteLayoutService();
    const after = await getPortalPageRenderService(page.id, "published");
    expect((slot(after?.schema, "header")[0] as Node).props?.brandText).toBe("草稿版");
    expect((await getPortalSiteLayoutService()).unpublishedChanges).toBe(false);
  });

  it("保存即发布时，把此前遗留的公共布局草稿一并发布，前台与编辑器看到的一致", async () => {
    const page = await newPage("/a");
    await savePage(page.id, { header: [hdr("h1", "线上版")], main: [text("t", "x")] });
    const v = (await getPortalSiteLayoutService()).version;
    // 只存草稿的公共布局改动（另一条保存路径）
    await updatePortalSiteLayoutService({
      header: [hdr("h1", "遗留草稿")] as never,
      expectedVersion: v,
    });
    expect((await getPortalSiteLayoutService()).unpublishedChanges).toBe(true);

    // 编辑器里显示的就是草稿；用户没改页头、点保存即发布
    await savePage(page.id, { header: [hdr("h1", "遗留草稿")], main: [text("t", "x")] });
    const published = await getPortalPageRenderService(page.id, "published");
    expect((slot(published?.schema, "header")[0] as Node).props?.brandText).toBe("遗留草稿");
    expect((await getPortalSiteLayoutService()).unpublishedChanges).toBe(false);
  });

  it("乐观锁：公共布局被别人改过后，用旧版本号保存会冲突，且整个事务回滚（页面也没被改）", async () => {
    const a = await newPage("/a");
    const b = await newPage("/b");
    await savePage(a.id, { header: [hdr("h1", "v1")], main: [text("ta", "A")] });
    const staleVersion = (await getPortalSiteLayoutService()).version;
    // 别人先把页头改成 v2
    await savePage(
      a.id,
      { header: [hdr("h1", "v2")], main: [text("ta", "A")] },
      { expectedLayoutVersion: staleVersion },
    );

    const before = JSON.stringify((await getPortalPageRenderService(a.id, "published"))?.schema);
    await expect(
      savePage(
        b.id,
        { header: [hdr("h1", "v3")], main: [text("tb", "B 想存")] },
        { expectedLayoutVersion: staleVersion },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT", statusCode: 409 });

    // B 的正文没有写进去（页面更新与公共布局在同一事务里一起回滚）
    const rowB = await getPortalPageService(b.id);
    expect(rowB?.draftSchema).toBeNull();
    expect(rowB?.published).toBe(false);
    // 公共布局保持 v2
    expect(JSON.stringify((await getPortalPageRenderService(a.id, "published"))?.schema)).toBe(
      before,
    );
  });

  it("没改公共布局时，旧版本号不会导致冲突（只改自己页面正文不该被别人挡住）", async () => {
    const a = await newPage("/a");
    const b = await newPage("/b");
    await savePage(a.id, { header: [hdr("h1", "v1")] });
    const stale = (await getPortalSiteLayoutService()).version;
    await savePage(a.id, { header: [hdr("h1", "v2")] }, { expectedLayoutVersion: stale });
    // B 以旧版本读取时页头是 v1；这里它自己没动页头（带回的是服务端当前的 v2）
    const result = await savePage(
      b.id,
      { header: [hdr("h1", "v2")], main: [text("tb", "B")] },
      { expectedLayoutVersion: stale },
    );
    expect(result.layoutChanged).toBe(false);
  });

  it("页面不存在或已删除：404，不写公共布局", async () => {
    await expect(
      savePortalPageDesignService({
        pageId: "00000000-0000-4000-8000-000000000000",
        schema: asJson(fullPage({ header: [hdr("h1")] })),
        publish: true,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getPortalSiteLayoutService()).initialized).toBe(false);
  });

  it("页面结构不合法：400", async () => {
    const page = await newPage("/a");
    await expect(
      savePortalPageDesignService({
        pageId: page.id,
        schema: asJson({ version: "1.0.0" }),
        publish: true,
      }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("扁平页面（没有 PageLayout）不归公共布局管：保存不读不写 SiteLayout", async () => {
    const page = await newPage("/flat");
    const flat = {
      version: "1.0.0",
      componentsMap: [],
      componentsTree: node("root", "Page", {}, [text("t", "扁平页面")]),
    };
    const result = await savePortalPageDesignService({
      pageId: page.id,
      schema: asJson(flat),
      publish: true,
    });
    expect(result.layoutChanged).toBe(false);
    expect((await getPortalSiteLayoutService()).initialized).toBe(false);
    const render = await getPortalPageRenderService(page.id, "published");
    expect(layoutLib.stableStringify(render?.schema)).toBe(layoutLib.stableStringify(flat));
  });

  it("渲染：停用的页面前台拿不到，草稿模式不受影响；没有已发布内容返回 null", async () => {
    const page = await newPage("/a");
    expect(await getPortalPageRenderService(page.id, "published")).toBeNull();
    await savePage(page.id, { header: [hdr("h1")], main: [text("t", "x")] });
    expect(await getPortalPageRenderService(page.id, "published")).not.toBeNull();
    await updatePortalPageService(page.id, { status: "disabled" });
    expect(await getPortalPageRenderService(page.id, "published")).toBeNull();
    expect(await getPortalPageRenderService(page.id, "draft")).not.toBeNull();
    expect(
      await getPortalPageRenderService("00000000-0000-4000-8000-000000000000", "draft"),
    ).toBeNull();
  });

  it("单独的草稿 / 发布生命周期：草稿不影响线上，发布才拷贝，版本号递增", async () => {
    await expect(publishPortalSiteLayoutService()).rejects.toMatchObject({ code: "INVALID" });
    const draft = await updatePortalSiteLayoutService({ header: [hdr("h1")] as never, footer: [] });
    expect(draft).toMatchObject({
      initialized: true,
      version: 1,
      publishedHeader: null,
      unpublishedChanges: true,
    });
    const published = await publishPortalSiteLayoutService();
    expect(published).toMatchObject({ version: 2, unpublishedChanges: false });
    expect(ids(published.publishedHeader as unknown as Node[])).toEqual(["h1"]);
    // 期望版本不符：冲突
    await expect(
      updatePortalSiteLayoutService({ header: [] as never, expectedVersion: 1 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("页面节点与公共节点撞 id 时不产生重复 id（渲染结果里 id 全局唯一）", async () => {
    const a = await newPage("/a");
    await savePage(a.id, { header: [hdr("same")], main: [text("t", "x")] });
    // B 的正文里恰好有个节点叫 same
    const b = await newPage("/b");
    await updatePortalPageService(b.id, {
      draftSchema: asJson(fullPage({ main: [text("same", "撞名的正文")] })),
    });
    await publishPortalPageService(b.id);
    const render = await getPortalPageRenderService(b.id, "published");
    const doc = render?.schema as unknown as import("./portal-content.layout").PageSchemaDoc;
    expect(layoutLib.hasDuplicateIds(doc.componentsTree)).toBe(false);
    expect(ids(slot(render?.schema, "header"))).toEqual(["same"]);
  });
});

/* ------------------------------ 数据迁移 ------------------------------ */

async function legacyPage(
  path: string,
  parts: Parameters<typeof fullPage>[0],
  publishedParts?: Parameters<typeof fullPage>[0],
) {
  const page = await newPage(path);
  await updatePortalPageService(page.id, { draftSchema: asJson(fullPage(parts)) });
  if (publishedParts === undefined) {
    await publishPortalPageService(page.id);
  } else {
    await updatePortalPageService(page.id, { draftSchema: asJson(fullPage(publishedParts)) });
    await publishPortalPageService(page.id);
    await updatePortalPageService(page.id, { draftSchema: asJson(fullPage(parts)) });
  }
  return page;
}

const snapshotPages = async () =>
  (await db.select().from(schema.portalPage)).map((p) => [p.id, p.draftSchema, p.publishedSchema]);

describe("旧数据迁移：页头页脚抽到公共布局", () => {
  async function seedLegacy() {
    const p1 = await legacyPage("/p1", {
      header: [hdr("p1_h", "码上云")],
      main: [text("p1_t", "P1")],
      footer: [ftr("p1_f")],
    });
    const p2 = await legacyPage("/p2", {
      header: [hdr("p2_h", "码上云")],
      main: [text("p2_t", "P2")],
      footer: [ftr("p2_f")],
    });
    const p3 = await legacyPage("/p3", {
      header: [hdr("p3_h", "码上云")],
      main: [text("p3_t", "P3")],
      footer: [ftr("p3_f")],
    });
    const conflict = await legacyPage("/conflict", {
      header: [hdr("c_h", "另一个品牌")],
      main: [text("c_t", "冲突页")],
      footer: [ftr("c_f", "不同的页脚")],
    });
    const flat = await newPage("/flat");
    await updatePortalPageService(flat.id, {
      draftSchema: asJson({
        version: "1.0.0",
        componentsMap: [],
        componentsTree: node("root", "Page", {}, [text("ft", "扁平")]),
      }),
    });
    const clean = await legacyPage("/clean", { main: [text("cl_t", "干净页")] });
    return { p1, p2, p3, conflict, flat, clean };
  }

  it("演练（dryRun）只出报告，不写任何数据", async () => {
    await seedLegacy();
    const before = layoutLib.stableStringify(await snapshotPages());
    const report = await migrateSiteLayoutService({ dryRun: true });
    expect(report.dryRun).toBe(true);
    expect(report.layout.created).toBe(true);
    expect(report.migratedPages.length).toBeGreaterThan(0);
    expect(layoutLib.stableStringify(await snapshotPages())).toBe(before);
    expect((await getPortalSiteLayoutService()).initialized).toBe(false);
    expect(await db.select().from(schema.portalPageSchemaBackup)).toHaveLength(0);
  });

  it("多数页面共有的页头页脚成为公共版本；一致的页面被抽空，冲突页面保持原样并进报告", async () => {
    const pages = await seedLegacy();
    const report = await migrateSiteLayoutService();

    // 公共布局：取 3 个页面共有的版本（来源是最早创建的那个）
    expect(report.layout).toMatchObject({
      existed: false,
      created: true,
      headerNodes: 1,
      footerNodes: 1,
    });
    expect(report.layout.headerSource?.path).toBe("/p1");
    const layout = await getPortalSiteLayoutService();
    expect((layout.draftHeader[0] as unknown as Node).props?.brandText).toBe("码上云");
    expect(layout.unpublishedChanges).toBe(false);

    // 三个一致的页面：草稿与已发布都只剩正文
    for (const page of [pages.p1, pages.p2, pages.p3]) {
      const row = await getPortalPageService(page.id);
      expect(slot(row?.draftSchema, "header")).toEqual([]);
      expect(slot(row?.publishedSchema, "footer")).toEqual([]);
      expect(slot(row?.draftSchema, "main")).toHaveLength(1);
    }
    expect(report.migratedPages.map((p) => p.path).sort()).toEqual(["/p1", "/p2", "/p3"]);

    // 冲突页面：页面里的页头页脚一个字都没动，报告里有它
    const conflictRow = await getPortalPageService(pages.conflict.id);
    expect(ids(slot(conflictRow?.draftSchema, "header"))).toEqual(["c_h"]);
    expect(ids(slot(conflictRow?.publishedSchema, "footer"))).toEqual(["c_f"]);
    expect(
      report.conflicts
        .filter((c) => c.path === "/conflict")
        .map((c) => `${c.part}:${c.schema}`)
        .sort(),
    ).toEqual(["footer:draft", "footer:published", "header:draft", "header:published"]);
    // 扁平页面、干净页面：不动
    expect(report.flatPages.map((p) => p.path)).toEqual(["/flat"]);
    const flatRow = await getPortalPageService(pages.flat.id);
    expect(JSON.stringify(flatRow?.draftSchema)).toContain("扁平");
  });

  it("先备份：被改动的页面都有完整的旧 Schema 备份，没改动的页面没有", async () => {
    const pages = await seedLegacy();
    const originals = new Map<string, unknown>();
    for (const page of [pages.p1, pages.p2, pages.p3]) {
      const row = await getPortalPageService(page.id);
      originals.set(page.id, [row?.draftSchema, row?.publishedSchema]);
    }
    const report = await migrateSiteLayoutService();
    expect(report.backupsCreated).toBe(3);
    const backups = await db.select().from(schema.portalPageSchemaBackup);
    expect(backups).toHaveLength(3);
    for (const backup of backups) {
      expect(backup.reason).toBe("pre-site-layout");
      expect(layoutLib.stableStringify([backup.draftSchema, backup.publishedSchema])).toBe(
        layoutLib.stableStringify(originals.get(backup.pageId)),
      );
      // 备份里仍然有旧页头
      expect(JSON.stringify(backup.draftSchema)).toContain("SiteHeader");
    }
  });

  it("迁移后渲染与迁移前一致：一致的页面的已发布渲染里页头页脚内容没变", async () => {
    const pages = await seedLegacy();
    const beforeRow = await getPortalPageService(pages.p2.id);
    const beforeHeader = slot(beforeRow?.publishedSchema, "header");
    const beforeFooter = slot(beforeRow?.publishedSchema, "footer");

    await migrateSiteLayoutService();
    const render = await getPortalPageRenderService(pages.p2.id, "published");
    expect(layoutLib.nodesFingerprint(slot(render?.schema, "header"))).toBe(
      layoutLib.nodesFingerprint(beforeHeader),
    );
    expect(layoutLib.nodesFingerprint(slot(render?.schema, "footer"))).toBe(
      layoutLib.nodesFingerprint(beforeFooter),
    );
    expect(ids(slot(render?.schema, "main"))).toEqual(["p2_t"]);
  });

  it("幂等：重复执行什么都不再变（没有新备份、布局版本不变、页面不变）", async () => {
    await seedLegacy();
    await migrateSiteLayoutService();
    const layoutBefore = await getPortalSiteLayoutService();
    const pagesBefore = layoutLib.stableStringify(await snapshotPages());
    const backupsBefore = await db.select().from(schema.portalPageSchemaBackup);

    const again = await migrateSiteLayoutService();
    expect(again.layout).toMatchObject({ existed: true, created: false });
    expect(again.migratedPages).toEqual([]);
    expect(again.backupsCreated).toBe(0);
    expect(await getPortalSiteLayoutService()).toEqual(layoutBefore);
    expect(layoutLib.stableStringify(await snapshotPages())).toBe(pagesBefore);
    expect(await db.select().from(schema.portalPageSchemaBackup)).toHaveLength(
      backupsBefore.length,
    );
    // 冲突仍然被如实报告
    expect(again.conflicts.length).toBeGreaterThan(0);
  });

  it("已有公共布局时以它为准，绝不覆盖：只抽走与它一致的页面，其余算冲突", async () => {
    const p1 = await legacyPage("/p1", {
      header: [hdr("p1_h", "码上云")],
      main: [text("p1_t", "P1")],
    });
    const other = await legacyPage("/other", {
      header: [hdr("o_h", "别的")],
      main: [text("o_t", "O")],
    });
    await updatePortalSiteLayoutService({
      header: [hdr("existing", "码上云")] as never,
      footer: [],
    });
    await publishPortalSiteLayoutService();
    const layoutBefore = await getPortalSiteLayoutService();

    const report = await migrateSiteLayoutService();
    expect(report.layout).toMatchObject({ existed: true, created: false });
    expect(await getPortalSiteLayoutService()).toEqual(layoutBefore);
    expect(report.migratedPages.map((p) => p.path)).toEqual(["/p1"]);
    expect(slot((await getPortalPageService(p1.id))?.draftSchema, "header")).toEqual([]);
    expect(ids(slot((await getPortalPageService(other.id))?.draftSchema, "header"))).toEqual([
      "o_h",
    ]);
    expect(report.conflicts.some((c) => c.path === "/other")).toBe(true);
  });

  it("草稿与已发布不同时分别处理：与公共版本一致的那份被抽掉，不一致的那份保留并报冲突", async () => {
    const page = await legacyPage(
      "/mixed",
      { header: [hdr("d_h", "码上云")], main: [text("t", "x")] },
      { header: [hdr("p_h", "老品牌")], main: [text("t", "x")] },
    );
    const other = await legacyPage("/o2", {
      header: [hdr("o2_h", "码上云")],
      main: [text("t2", "y")],
    });
    const report = await migrateSiteLayoutService();
    const row = await getPortalPageService(page.id);
    expect(slot(row?.draftSchema, "header")).toEqual([]);
    expect(ids(slot(row?.publishedSchema, "header"))).toEqual(["p_h"]);
    expect(report.conflicts.some((c) => c.path === "/mixed" && c.schema === "published")).toBe(
      true,
    );
    void other;
  });

  it("部分冲突：页头与公共版本不同、页脚相同——只抽走页脚，页头保留并进报告，且有备份", async () => {
    await legacyPage("/p1", {
      header: [hdr("p1_h", "码上云")],
      main: [text("p1_t", "P1")],
      footer: [ftr("p1_f")],
    });
    await legacyPage("/p2", {
      header: [hdr("p2_h", "码上云")],
      main: [text("p2_t", "P2")],
      footer: [ftr("p2_f")],
    });
    const partial = await legacyPage("/partial", {
      header: [hdr("x_h", "不同的页头")],
      main: [text("x_t", "X")],
      footer: [ftr("x_f")], // 页脚与公共版本一致
    });
    const report = await migrateSiteLayoutService();
    const row = await getPortalPageService(partial.id);
    expect(ids(slot(row?.draftSchema, "header"))).toEqual(["x_h"]); // 页头保留
    expect(slot(row?.draftSchema, "footer")).toEqual([]); // 页脚被抽走
    // 草稿与已发布各报一条；关键是只有页头冲突，页脚没有
    const partialParts = report.conflicts.filter((c) => c.path === "/partial").map((c) => c.part);
    expect([...new Set(partialParts)]).toEqual(["header"]);
    expect(report.migratedPages.some((p) => p.path === "/partial")).toBe(true);
    const backup = (await db.select().from(schema.portalPageSchemaBackup)).find(
      (b) => b.pageId === partial.id,
    );
    expect(ids(slot(backup?.draftSchema, "footer"))).toEqual(["x_f"]); // 备份里仍是原样
  });

  it("没有任何页头页脚可抽时不创建公共布局", async () => {
    await legacyPage("/clean", { main: [text("t", "x")] });
    const report = await migrateSiteLayoutService();
    expect(report.layout.created).toBe(false);
    expect((await getPortalSiteLayoutService()).initialized).toBe(false);
    expect(await db.select().from(schema.portalPageSchemaBackup)).toHaveLength(0);
  });

  it("删除页面时备份随页面级联删除（外键 cascade）", async () => {
    const pages = await seedLegacy();
    await migrateSiteLayoutService();
    await db.delete(schema.portalPage).where(eq(schema.portalPage.id, pages.p1.id));
    const backups = await db.select().from(schema.portalPageSchemaBackup);
    expect(backups.some((b) => b.pageId === pages.p1.id)).toBe(false);
  });
});

describe("迁移计划（纯函数）", () => {
  const row = (id: string, createdAt: string, header: Node[], footer: Node[] = []) => ({
    id,
    title: id,
    path: `/${id}`,
    createdAt: new Date(createdAt),
    draftSchema: asJson(fullPage({ header, footer })),
    publishedSchema: null,
  });
  const empty = { exists: false, header: [], footer: [] };

  it("票数相同时取最早创建的页面的版本", () => {
    const plan = planSiteLayoutMigration(
      [
        row("b", "2026-02-01T00:00:00Z", [hdr("x1", "B 的")]),
        row("a", "2026-01-01T00:00:00Z", [hdr("x2", "A 的")]),
      ],
      empty,
    );
    expect(plan.layoutCreate?.header[0]?.props?.brandText).toBe("A 的");
    expect(plan.report.layout.headerSource?.id).toBe("a");
  });

  it("票数多的版本胜出，与创建时间无关", () => {
    const plan = planSiteLayoutMigration(
      [
        row("old", "2026-01-01T00:00:00Z", [hdr("o", "少数派")]),
        row("n1", "2026-03-01T00:00:00Z", [hdr("m1", "多数派")]),
        row("n2", "2026-03-02T00:00:00Z", [hdr("m2", "多数派")]),
      ],
      empty,
    );
    expect(plan.layoutCreate?.header[0]?.props?.brandText).toBe("多数派");
    expect(plan.report.conflicts.map((c) => c.path)).toEqual(["/old"]);
  });

  it("指纹忽略节点 id：不同页面里 id 不同但内容相同算同一版本", () => {
    const plan = planSiteLayoutMigration(
      [
        row("a", "2026-01-01T00:00:00Z", [hdr("id_a")]),
        row("b", "2026-01-02T00:00:00Z", [hdr("id_b")]),
      ],
      empty,
    );
    expect(plan.report.conflicts).toEqual([]);
    expect(plan.report.migratedPages).toHaveLength(2);
  });

  it("纯函数不修改入参", () => {
    const pages = [row("a", "2026-01-01T00:00:00Z", [hdr("h")], [ftr("f")])];
    const before = JSON.stringify(pages);
    planSiteLayoutMigration(pages, empty);
    expect(JSON.stringify(pages)).toBe(before);
  });
});
