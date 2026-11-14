import { describe, expect, it } from "vitest";

import {
  PLAIN_SLOT_TITLES,
  type PageSchemaDoc,
  SHARED_SLOT_TITLES,
  type SchemaNode,
  blankPageSchema,
  collectNodeIds,
  composePageSchema,
  decomposePageSchema,
  findPageLayout,
  hasDuplicateIds,
  nodesFingerprint,
  resolveSiteLayout,
  siteLayoutEquals,
  stableStringify,
} from "./portal-content.layout";

const node = (
  id: string,
  componentName: string,
  props: Record<string, unknown> = {},
  children?: Array<SchemaNode | string>,
): SchemaNode => ({ id, componentName, props, ...(children ? { children } : {}) });

const header = (id = "hdr_1", label = "码上云") => node(id, "SiteHeader", { brandText: label });
const announce = (id = "ann_1") => node(id, "AnnouncementBar", { text: "公告" });
const footer = (id = "ftr_1") => node(id, "SiteFooter", { text: "版权所有" });

/** 一份「只有正文」的页面：PageLayout 三个槽，header / footer 为空。 */
function pageWithMain(...mainNodes: SchemaNode[]): PageSchemaDoc {
  const page = blankPageSchema();
  const layout = findPageLayout(page.componentsTree) as SchemaNode;
  const main = (layout.children ?? []).find(
    (c) => typeof c !== "string" && c.props?.name === "main",
  ) as SchemaNode;
  main.children = mainNodes;
  return page;
}

const slotChildren = (schema: PageSchemaDoc, name: string): SchemaNode[] => {
  const layout = findPageLayout(schema.componentsTree) as SchemaNode;
  const slot = (layout.children ?? []).find(
    (c) => typeof c !== "string" && c.props?.name === name,
  ) as SchemaNode;
  return (slot.children ?? []) as SchemaNode[];
};
const slotTitle = (schema: PageSchemaDoc, name: string): string | undefined => {
  const layout = findPageLayout(schema.componentsTree) as SchemaNode;
  const slot = (layout.children ?? []).find(
    (c) => typeof c !== "string" && c.props?.name === name,
  ) as SchemaNode;
  return slot.title;
};

const LAYOUT = {
  draftHeader: [announce(), header()],
  publishedHeader: [header("hdr_pub", "已发布")],
  draftFooter: [footer()],
  publishedFooter: [footer("ftr_pub")],
};

describe("blankPageSchema", () => {
  it("一个 PageLayout + 三个空槽，页头页脚不自带内容", () => {
    const page = blankPageSchema();
    const layout = findPageLayout(page.componentsTree) as SchemaNode;
    expect(layout).not.toBeNull();
    expect((layout.children as SchemaNode[]).map((c) => c.props?.name)).toEqual([
      "header",
      "main",
      "footer",
    ]);
    for (const name of ["header", "main", "footer"]) expect(slotChildren(page, name)).toEqual([]);
    expect(hasDuplicateIds(page.componentsTree)).toBe(false);
  });

  it("每次返回新对象，改一个不影响另一个", () => {
    const a = blankPageSchema();
    a.componentsTree.id = "changed";
    expect(blankPageSchema().componentsTree.id).toBe("root");
  });
});

describe("composePageSchema", () => {
  it("公共页头 + 页面正文 + 公共页脚：按槽注入，正文保持不动", () => {
    const main = [node("hero", "Hero"), node("cta", "Cta")];
    const full = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(...main),
      mode: "draft",
    });
    expect(slotChildren(full, "header").map((n) => n.id)).toEqual(["ann_1", "hdr_1"]);
    expect(slotChildren(full, "main").map((n) => n.id)).toEqual(["hero", "cta"]);
    expect(slotChildren(full, "footer").map((n) => n.id)).toEqual(["ftr_1"]);
  });

  it("草稿模式用草稿；已发布模式只用已发布版本", () => {
    const page = pageWithMain(node("hero", "Hero"));
    const draft = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: page, mode: "draft" });
    const published = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: page,
      mode: "published",
    });
    expect(slotChildren(draft, "header").map((n) => n.id)).toEqual(["ann_1", "hdr_1"]);
    expect(slotChildren(published, "header").map((n) => n.id)).toEqual(["hdr_pub"]);
    expect(slotChildren(published, "footer").map((n) => n.id)).toEqual(["ftr_pub"]);
  });

  it("没有草稿时草稿模式回落到已发布；已发布模式在从未发布时是空（不泄露草稿）", () => {
    const page = pageWithMain();
    const onlyPublished = composePageSchema({
      siteLayout: { publishedHeader: [header("p")] },
      pageMainSchema: page,
      mode: "draft",
    });
    expect(slotChildren(onlyPublished, "header").map((n) => n.id)).toEqual(["p"]);

    const onlyDraft = composePageSchema({
      siteLayout: { draftHeader: [header("d")], draftFooter: [footer("d")] },
      pageMainSchema: page,
      mode: "published",
    });
    expect(slotChildren(onlyDraft, "header")).toEqual([]);
    expect(slotChildren(onlyDraft, "footer")).toEqual([]);
  });

  it("草稿是空数组表示「有意清空」，不回落到已发布版本", () => {
    const resolved = resolveSiteLayout(
      { draftHeader: [], publishedHeader: [header("p")] },
      "draft",
    );
    expect(resolved.header).toEqual([]);
  });

  it("页头 / 页脚可以包含多个节点，顺序保持", () => {
    const full = composePageSchema({
      siteLayout: { draftHeader: [announce("a"), header("b"), announce("c")] },
      pageMainSchema: pageWithMain(),
      mode: "draft",
    });
    expect(slotChildren(full, "header").map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("没有传页面（新页面）时从空白页开始，页头页脚由公共布局提供", () => {
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: null, mode: "draft" });
    expect(slotChildren(full, "header")).toHaveLength(2);
    expect(slotChildren(full, "main")).toEqual([]);
    expect(slotChildren(full, "footer")).toHaveLength(1);
  });

  it("不修改入参：页面与公共布局都原样不动，返回的是深拷贝", () => {
    const page = pageWithMain(node("hero", "Hero"));
    const pageBefore = JSON.stringify(page);
    const layoutBefore = JSON.stringify(LAYOUT);
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: page, mode: "draft" });
    expect(JSON.stringify(page)).toBe(pageBefore);
    expect(JSON.stringify(LAYOUT)).toBe(layoutBefore);
    // 改返回值不会回写到公共布局
    (slotChildren(full, "header")[1] as SchemaNode).props = { brandText: "被改了" };
    expect(JSON.stringify(LAYOUT)).toBe(layoutBefore);
  });

  it("槽标题标注「全站共享 / 当前页面」，大纲里能分清归属", () => {
    const full = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(),
      mode: "draft",
    });
    expect(slotTitle(full, "header")).toBe(SHARED_SLOT_TITLES.header);
    expect(slotTitle(full, "main")).toBe(SHARED_SLOT_TITLES.main);
    expect(slotTitle(full, "footer")).toBe(SHARED_SLOT_TITLES.footer);
    expect(SHARED_SLOT_TITLES.header).toContain("全站共享");
    expect(SHARED_SLOT_TITLES.main).toContain("当前页面");
  });

  it("旧的扁平页面（没有 PageLayout）原样返回，不注入公共页头", () => {
    const flat: PageSchemaDoc = {
      version: "1.0.0",
      componentsTree: node("root", "Page", {}, [node("hero", "Hero")]),
    };
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: flat, mode: "draft" });
    expect(full).toEqual(flat);
    expect(full).not.toBe(flat);
  });

  it("公共布局某一块为空时保留页面槽里自带的节点（旧数据不会被吞掉）", () => {
    const legacy = pageWithMain();
    const layout = findPageLayout(legacy.componentsTree) as SchemaNode;
    const headerSlot = (layout.children as SchemaNode[])[0] as SchemaNode;
    headerSlot.children = [header("legacy_header", "旧页头")];
    const full = composePageSchema({
      siteLayout: { draftHeader: [], draftFooter: [footer()] },
      pageMainSchema: legacy,
      mode: "draft",
    });
    expect(slotChildren(full, "header").map((n) => n.id)).toEqual(["legacy_header"]);
    expect(slotChildren(full, "footer").map((n) => n.id)).toEqual(["ftr_1"]);
  });

  it("槽缺失（手写 JSON）时补齐，并放在规范位置：页头最前、页脚最后", () => {
    const sparse: PageSchemaDoc = {
      version: "1.0.0",
      componentsTree: node("root", "Page", {}, [
        node("pl", "PageLayout", {}, [
          {
            id: "only_main",
            componentName: "Slot",
            props: { name: "main" },
            children: [node("hero", "Hero")],
          },
        ]),
      ]),
    };
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: sparse, mode: "draft" });
    const layout = findPageLayout(full.componentsTree) as SchemaNode;
    expect((layout.children as SchemaNode[]).map((c) => c.props?.name)).toEqual([
      "header",
      "main",
      "footer",
    ]);
    expect(slotChildren(full, "main").map((n) => n.id)).toEqual(["hero"]);
    expect(hasDuplicateIds(full.componentsTree)).toBe(false);
  });

  it("不产生重复 ID：页面节点与公共节点撞 id 时改页面一侧，公共节点 id 保持不变", () => {
    const page = pageWithMain(node("hdr_1", "Hero"), node("ftr_1", "Cta"));
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: page, mode: "draft" });
    expect(hasDuplicateIds(full.componentsTree)).toBe(false);
    expect(slotChildren(full, "header").map((n) => n.id)).toEqual(["ann_1", "hdr_1"]);
    expect(slotChildren(full, "footer").map((n) => n.id)).toEqual(["ftr_1"]);
    expect(slotChildren(full, "main").map((n) => n.id)).toEqual(["hdr_1_p1", "ftr_1_p1"]);
  });

  it("id 去重是确定性的：同样输入两次得到完全一样的结果", () => {
    const page = pageWithMain(node("hdr_1", "Hero"));
    const a = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: page, mode: "draft" });
    const b = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: page, mode: "draft" });
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("保留 PageSchema 的其他字段（版本、componentsMap、state、css 等）", () => {
    const page = pageWithMain();
    (page as Record<string, unknown>).state = { count: 1 };
    (page as Record<string, unknown>).css = ".a{color:red}";
    (page as Record<string, unknown>).componentsMap = [{ componentName: "X", package: "p" }];
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: page, mode: "draft" });
    expect(full).toMatchObject({
      version: "1.0.0",
      state: { count: 1 },
      css: ".a{color:red}",
      componentsMap: [{ componentName: "X", package: "p" }],
    });
  });

  it("脏数据：公共布局不是数组 / 含非节点，退化为空而不是抛错", () => {
    const full = composePageSchema({
      siteLayout: { draftHeader: "oops", draftFooter: [1, null, { x: 1 }, footer()] },
      pageMainSchema: pageWithMain(),
      mode: "draft",
    });
    expect(slotChildren(full, "header")).toEqual([]);
    expect(slotChildren(full, "footer").map((n) => n.id)).toEqual(["ftr_1"]);
  });
});

describe("decomposePageSchema", () => {
  it("拆成页面正文 + 页头 + 页脚：正文里页头页脚槽是空的", () => {
    const full = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(node("hero", "Hero")),
      mode: "draft",
    });
    const result = decomposePageSchema(full);
    expect(result.hasLayout).toBe(true);
    expect(result.header?.map((n) => n.id)).toEqual(["ann_1", "hdr_1"]);
    expect(result.footer?.map((n) => n.id)).toEqual(["ftr_1"]);
    expect(slotChildren(result.mainSchema, "header")).toEqual([]);
    expect(slotChildren(result.mainSchema, "footer")).toEqual([]);
    expect(slotChildren(result.mainSchema, "main").map((n) => n.id)).toEqual(["hero"]);
  });

  it("槽标题还原成不带「全站共享」的原名：标识不落库", () => {
    const full = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(),
      mode: "draft",
    });
    const { mainSchema } = decomposePageSchema(full);
    expect(slotTitle(mainSchema, "header")).toBe(PLAIN_SLOT_TITLES.header);
    expect(slotTitle(mainSchema, "main")).toBe(PLAIN_SLOT_TITLES.main);
    expect(slotTitle(mainSchema, "footer")).toBe(PLAIN_SLOT_TITLES.footer);
    expect(JSON.stringify(mainSchema)).not.toContain("全站共享");
  });

  it("不修改入参，返回深拷贝", () => {
    const full = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(node("hero", "Hero")),
      mode: "draft",
    });
    const before = JSON.stringify(full);
    const result = decomposePageSchema(full);
    expect(JSON.stringify(full)).toBe(before);
    (result.header?.[0] as SchemaNode).props = { changed: true };
    expect(JSON.stringify(full)).toBe(before);
  });

  it("没有 PageLayout 的扁平页面：header / footer 为 null（不归公共布局管），页面原样", () => {
    const flat: PageSchemaDoc = {
      version: "1.0.0",
      componentsTree: node("root", "Page", {}, [node("hero", "Hero")]),
    };
    const result = decomposePageSchema(flat);
    expect(result).toMatchObject({ hasLayout: false, header: null, footer: null });
    expect(result.mainSchema).toEqual(flat);
  });

  it("槽里是空的就返回空数组（有 PageLayout 但没有页头页脚）", () => {
    const result = decomposePageSchema(pageWithMain(node("hero", "Hero")));
    expect(result.header).toEqual([]);
    expect(result.footer).toEqual([]);
  });

  it("不是 PageSchema 时抛错而不是静默返回", () => {
    expect(() => decomposePageSchema(null)).toThrow();
    expect(() => decomposePageSchema({ version: "1" })).toThrow();
  });
});

describe("组合与拆分互逆（往返一致）", () => {
  it("compose → decompose：得回原来的正文、页头、页脚", () => {
    const main = pageWithMain(node("hero", "Hero", { title: "你好" }), node("cta", "Cta"));
    const full = composePageSchema({ siteLayout: LAYOUT, pageMainSchema: main, mode: "draft" });
    const result = decomposePageSchema(full);
    expect(stableStringify(result.mainSchema)).toBe(stableStringify(main));
    expect(stableStringify(result.header)).toBe(stableStringify(LAYOUT.draftHeader));
    expect(stableStringify(result.footer)).toBe(stableStringify(LAYOUT.draftFooter));
  });

  it("decompose → compose：回到同一份完整 Schema（槽标题除外）", () => {
    const original = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(node("hero", "Hero")),
      mode: "draft",
    });
    const { mainSchema, header, footer } = decomposePageSchema(original);
    const again = composePageSchema({
      siteLayout: { draftHeader: header, draftFooter: footer },
      pageMainSchema: mainSchema,
      mode: "draft",
    });
    expect(stableStringify(again)).toBe(stableStringify(original));
  });

  it("往返不产生重复 id，且连续往返结果稳定（幂等）", () => {
    let current = composePageSchema({
      siteLayout: LAYOUT,
      pageMainSchema: pageWithMain(node("hdr_1", "Hero")),
      mode: "draft",
    });
    const first = stableStringify(current);
    for (let round = 0; round < 3; round += 1) {
      const { mainSchema, header, footer } = decomposePageSchema(current);
      current = composePageSchema({
        siteLayout: { draftHeader: header, draftFooter: footer },
        pageMainSchema: mainSchema,
        mode: "draft",
      });
      expect(hasDuplicateIds(current.componentsTree)).toBe(false);
    }
    // 第一轮会把页面一侧撞 id 的节点改名并落进 main，之后不再变化
    const stable = stableStringify(current);
    const { mainSchema, header, footer } = decomposePageSchema(current);
    const next = composePageSchema({
      siteLayout: { draftHeader: header, draftFooter: footer },
      pageMainSchema: mainSchema,
      mode: "draft",
    });
    expect(stableStringify(next)).toBe(stable);
    expect(first.length).toBeGreaterThan(0);
  });

  it("节点的属性、顺序、非标准字段（hidden / locked / meta）都原样保留", () => {
    const fancy: SchemaNode = {
      id: "h",
      componentName: "SiteHeader",
      title: "我的页头",
      props: { navItems: [{ id: "a", label: "首页", children: [] }], nested: { deep: [1, 2, 3] } },
      hidden: false,
      locked: true,
      meta: { author: "me" },
      condition: "{{ this.state.show }}",
    };
    const full = composePageSchema({
      siteLayout: { draftHeader: [fancy] },
      pageMainSchema: pageWithMain(),
      mode: "draft",
    });
    expect(decomposePageSchema(full).header).toEqual([fancy]);
  });
});

describe("指纹与比较", () => {
  it("stableStringify 与键的书写顺序无关，undefined 字段被忽略", () => {
    expect(stableStringify({ b: 1, a: [1, { d: 4, c: 3 }] })).toBe(
      stableStringify({ a: [1, { c: 3, d: 4 }], b: 1, z: undefined }),
    );
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 2 }));
  });

  it("nodesFingerprint 忽略节点 id：同一个页头在不同页面里指纹相同，内容不同则不同", () => {
    const a = [header("id_a"), announce("id_x")];
    const b = [header("id_b"), announce("id_y")];
    expect(nodesFingerprint(a)).toBe(nodesFingerprint(b));
    expect(nodesFingerprint([header("1", "码上云")])).not.toBe(
      nodesFingerprint([header("1", "别的")]),
    );
    expect(nodesFingerprint([])).toBe("[]");
  });

  it("siteLayoutEquals：没改动就相等，改了任何属性就不等", () => {
    const base = { header: [header()], footer: [footer()] };
    expect(siteLayoutEquals(base, structuredClone(base))).toBe(true);
    const changed = structuredClone(base);
    (changed.header[0] as SchemaNode).props = { brandText: "改" };
    expect(siteLayoutEquals(base, changed)).toBe(false);
    expect(siteLayoutEquals(base, { header: [], footer: [] })).toBe(false);
  });

  it("collectNodeIds 递归收集所有节点 id", () => {
    expect(
      collectNodeIds([node("a", "A", {}, [node("b", "B", {}, ["text", node("c", "C")])])]),
    ).toEqual(["a", "b", "c"]);
  });
});
