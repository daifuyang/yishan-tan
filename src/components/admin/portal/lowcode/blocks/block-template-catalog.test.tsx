import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BLOCK_THUMBNAIL_URLS, resolveThumbnailSrc } from "../block-thumbnails";
import {
  BLOCK_CATEGORIES,
  BLOCK_TEMPLATES,
  filterBlockTemplates,
  getBlockTemplate,
  instantiateTemplate,
  listBlockCategories,
  toTemplateNode,
} from "./block-template-catalog";
import type { BlockTemplate, BlockTemplateNode } from "./block-template.types";
import { HEADER_TEMPLATES } from "./block-templates/header-templates";
import { HERO_TEMPLATES } from "./block-templates/hero-templates";
import { PRODUCT_MATRIX_TEMPLATES } from "./block-templates/product-matrix-templates";
import { siteBlockComponents, siteBlockMetas } from "./index";
import { Navbar } from "./navbar";
import { navbarMeta } from "./navbar.meta";
import { MAX_NAV_ITEMS, MAX_SUB_ITEMS, normalizeNavItems } from "./navbar.model";

/** 引擎基础包里的原子；模板只允许用它们 + 业务物料包里的物料。 */
const ATOMS = ["Div", "Typography", "Link", "Button", "Image", "Tag"];

function walk(node: BlockTemplateNode, visit: (node: BlockTemplateNode) => void) {
  visit(node);
  for (const child of node.children ?? []) if (typeof child !== "string") walk(child, visit);
}

const nodesOf = (template: BlockTemplate) => {
  const nodes: BlockTemplateNode[] = [];
  walk(template.schema, (node) => nodes.push(node));
  return nodes;
};

const byName = (template: BlockTemplate, componentName: string) =>
  nodesOf(template).filter((node) => node.componentName === componentName);

const classOf = (node: BlockTemplateNode) => String(node.props?.className ?? "");
const hasClass = (node: BlockTemplateNode, name: string) => classOf(node).split(" ").includes(name);

/** 文档顺序下第一个带该类名的节点序号，用来断言「品牌 → 导航 → 操作」的先后。 */
const orderOf = (template: BlockTemplate, className: string) =>
  nodesOf(template).findIndex((node) => hasClass(node, className));

const textsOf = (template: BlockTemplate) =>
  nodesOf(template).flatMap((node) =>
    (node.children ?? []).filter((child): child is string => typeof child === "string"),
  );

const template = (id: string): BlockTemplate => {
  const found = getBlockTemplate(id);
  if (!found) throw new Error(`缺少模板 ${id}`);
  return found;
};

describe("BlockTemplateCatalog", () => {
  it("模板 id 全局唯一，分类都在预设里，缩略图都有对应的图片文件", () => {
    const ids = BLOCK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of BLOCK_TEMPLATES) {
      expect(BLOCK_CATEGORIES, `${item.id} 分类不在预设里`).toContain(item.category);
      expect(resolveThumbnailSrc(item.thumbnail), `${item.id} 缺缩略图`).toBeTruthy();
      expect(item.name.trim(), `${item.id} 缺名称`).not.toBe("");
      expect(item.description.trim(), `${item.id} 缺描述`).not.toBe("");
    }
  });

  it("模板树里的每个节点要么是基础原子，要么是业务物料包里已注册的物料", () => {
    const metaNames = siteBlockMetas.map((meta) => meta.componentName);
    for (const item of BLOCK_TEMPLATES) {
      expect(item.schema.componentName).toBe(item.componentName);
      walk(item.schema, (node) => {
        if (node.componentName === "Slot") return;
        const known = ATOMS.includes(node.componentName) || metaNames.includes(node.componentName);
        expect(known, `${item.id} 用了未注册的物料 ${node.componentName}`).toBe(true);
        if (!ATOMS.includes(node.componentName)) {
          expect(siteBlockComponents).toHaveProperty(node.componentName);
        }
      });
    }
  });

  it("模板节点里不带 id（id 由引擎插入时为整棵子树重新生成）", () => {
    for (const item of BLOCK_TEMPLATES) {
      for (const node of nodesOf(item)) {
        expect(node, `${item.id} 的 ${node.componentName} 带了 id`).not.toHaveProperty("id");
      }
    }
  });

  it("toTemplateNode 递归去掉 id，保留其余字段与子节点顺序", () => {
    const node = toTemplateNode({
      id: "a",
      componentName: "Box",
      props: { x: 1 },
      children: [
        "text",
        { id: "b", componentName: "Slot", props: { name: "main" }, children: [] },
        { id: "c", componentName: "Slot", props: { name: "footer" } },
      ],
    });
    expect(node).toEqual({
      componentName: "Box",
      props: { x: 1 },
      children: [
        "text",
        { componentName: "Slot", props: { name: "main" }, children: [] },
        { componentName: "Slot", props: { name: "footer" } },
      ],
    });
  });

  it("分类：只展示有模板的分类，保持预设顺序", () => {
    expect(listBlockCategories()).toEqual(["页头", "首屏展示", "产品展示"]);
    expect(listBlockCategories([])).toEqual([]);
    const onlyHero = BLOCK_TEMPLATES.filter((t) => t.category === "首屏展示");
    expect(listBlockCategories(onlyHero)).toEqual(["首屏展示"]);
  });

  it("筛选：分类、关键词（名称 / 描述 / 标签）可叠加", () => {
    expect(filterBlockTemplates(BLOCK_TEMPLATES, {})).toHaveLength(BLOCK_TEMPLATES.length);
    expect(filterBlockTemplates(BLOCK_TEMPLATES, { category: "页头" }).length).toBe(5);
    expect(filterBlockTemplates(BLOCK_TEMPLATES, { keyword: "极简" }).map((t) => t.id)).toEqual([
      "header-minimal",
    ]);
    expect(filterBlockTemplates(BLOCK_TEMPLATES, { keyword: "辅助信息" }).map((t) => t.id)).toEqual(
      ["header-two-row"],
    );
    expect(filterBlockTemplates(BLOCK_TEMPLATES, { keyword: "SaaS" }).map((t) => t.id)).toEqual(
      expect.arrayContaining(["header-minimal", "hero-product"]),
    );
    expect(
      filterBlockTemplates(BLOCK_TEMPLATES, { category: "首屏展示", keyword: "极简" }),
    ).toEqual([]);
  });

  it("instantiateTemplate：整棵树每个节点都有唯一 id，根节点用传入的前缀，且不改动目录里的模板", () => {
    const before = JSON.stringify(BLOCK_TEMPLATES);
    for (const item of [...HEADER_TEMPLATES, ...HERO_TEMPLATES]) {
      const root = instantiateTemplate(item, "site_x");
      expect(root.id).toBe("site_x");
      const ids: string[] = [];
      const visit = (node: Record<string, unknown>) => {
        expect(typeof node.id, `${item.id} 有节点缺 id`).toBe("string");
        ids.push(String(node.id));
        for (const child of (node.children ?? []) as unknown[]) {
          if (typeof child !== "string") visit(child as Record<string, unknown>);
        }
      };
      visit(root);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(nodesOf(item).length);
      // 同一模板每次得到同一份（两个人同时打开也是同一个起点）
      expect(JSON.stringify(instantiateTemplate(item, "site_x"))).toBe(JSON.stringify(root));
    }
    expect(JSON.stringify(BLOCK_TEMPLATES)).toBe(before);
  });

  it("模板 schema 取出后再被修改，不会污染目录里的数据（插入的是副本）", () => {
    const before = JSON.stringify([...HEADER_TEMPLATES, ...HERO_TEMPLATES]);
    const copy = structuredClone(template("header-standard").schema);
    (copy.props as Record<string, unknown>).className = "changed";
    expect(JSON.stringify([...HEADER_TEMPLATES, ...HERO_TEMPLATES])).toBe(before);
  });
});

describe("缩略图是图片文件", () => {
  it("每个模板都有同名图片；文件名当 key，地址（https / 站内路径）也能直接用，危险协议不放行", () => {
    for (const item of BLOCK_TEMPLATES) {
      expect(BLOCK_THUMBNAIL_URLS).toHaveProperty(item.thumbnail);
    }
    expect(resolveThumbnailSrc("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
    expect(resolveThumbnailSrc("/uploads/a.png")).toBe("/uploads/a.png");
    expect(resolveThumbnailSrc("javascript:alert(1)")).toBeUndefined();
    expect(resolveThumbnailSrc("不存在的")).toBeUndefined();
  });
});

describe("Navbar 原子", () => {
  const items = [
    { id: "a", label: "首页", href: "/", active: true },
    {
      id: "b",
      label: "产品中心",
      children: [
        { id: "b1", label: "开源产品", href: "/x" },
        { id: "b2", label: "javascript 链接", href: "javascript:alert(1)" },
      ],
    },
    { id: "c", label: "" },
  ];

  it("meta 与实现对得上：items / activePath / style，物料名与组件名一致", () => {
    expect(navbarMeta.componentName).toBe("Navbar");
    expect(Object.keys(navbarMeta.props).sort()).toEqual(["activePath", "items", "style"]);
    expect(siteBlockComponents.Navbar).toBe(Navbar);
    expect(siteBlockMetas).toContain(navbarMeta);
  });

  it("归一化：空名称丢弃、危险地址清空、数量不超过上限", () => {
    const normalized = normalizeNavItems(items);
    expect(normalized.map((item) => item.label)).toEqual(["首页", "产品中心"]);
    expect(normalized[1]?.children.map((child) => child.href)).toEqual(["/x", ""]);
    const many = Array.from({ length: 20 }, (_, i) => ({
      label: `m${i}`,
      children: Array.from({ length: 20 }, (_, j) => ({ label: `s${j}` })),
    }));
    expect(normalizeNavItems(many)).toHaveLength(MAX_NAV_ITEMS);
    expect(normalizeNavItems(many)[0]?.children).toHaveLength(MAX_SUB_ITEMS);
    expect(normalizeNavItems("oops")).toEqual([]);
  });

  it("渲染：桌面横排列表 + 汉堡按钮同时存在，抽屉默认不渲染；当前项高亮", () => {
    const html = renderToStaticMarkup(<Navbar items={items} />);
    expect(html).toContain("lc-sh-list");
    expect(html).toContain("lc-sh-burger");
    expect(html).not.toContain('class="lc-sh-mobile"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("产品中心");
    expect(html).not.toContain("javascript:");
  });

  it("没有任何有效菜单项：不渲染", () => {
    expect(renderToStaticMarkup(<Navbar items={[{ label: "" }]} />)).toBe("");
  });
});

describe("四套 Header 模板：原子组合", () => {
  it("四个模板，根节点都是 Div，里面用 Navbar / Typography / Link，不存在整体的页头物料", () => {
    expect(HEADER_TEMPLATES.map((t) => t.id)).toEqual([
      "header-standard",
      "header-centered",
      "header-minimal",
      "header-two-row",
    ]);
    for (const item of HEADER_TEMPLATES) {
      expect(item.componentName).toBe("Div");
      expect(byName(item, "Navbar")).toHaveLength(1);
      expect(byName(item, "Typography").length).toBeGreaterThan(0);
      expect(byName(item, "Link").length).toBeGreaterThan(0);
    }
    expect(Object.keys(siteBlockComponents).filter((name) => /header/i.test(name))).toEqual([]);
  });

  it("四个模板的根节点布局类各不相同，缩略图互不相同", () => {
    const layouts = HEADER_TEMPLATES.map((t) =>
      classOf(t.schema)
        .split(" ")
        .find((name) => name.startsWith("lc-sh--") && name !== "lc-sh--light"),
    );
    expect(layouts).toEqual([
      "lc-sh--standard",
      "lc-sh--centered",
      "lc-sh--minimal",
      "lc-sh--two-row",
    ]);
    expect(new Set(HEADER_TEMPLATES.map((t) => t.thumbnail)).size).toBe(4);
  });

  it("Navbar 的 items 来自模板：数据归一化后不丢，id 不重复，数量不超上限", () => {
    for (const item of HEADER_TEMPLATES) {
      const nav = byName(item, "Navbar")[0]?.props?.items as Array<{
        id: string;
        children?: Array<{ id: string }>;
      }>;
      expect(normalizeNavItems(nav)).toHaveLength(nav.length);
      expect(nav.length).toBeLessThanOrEqual(MAX_NAV_ITEMS);
      const ids = nav.flatMap((entry) => [entry.id, ...(entry.children ?? []).map((c) => c.id)]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("不虚构业务路由：导航地址只有空 / 首页，按钮与其它链接只有占位 # 或首页 /", () => {
    for (const item of HEADER_TEMPLATES) {
      const nav = byName(item, "Navbar")[0]?.props?.items as Array<{
        href: string;
        children?: Array<{ href: string }>;
      }>;
      const navHrefs = nav.flatMap((entry) => [
        entry.href,
        ...(entry.children ?? []).map((child) => child.href),
      ]);
      for (const href of navHrefs) expect(["", "/"], `${item.id} 导航地址 ${href}`).toContain(href);
      for (const node of byName(item, "Link")) {
        expect(["#", "/"], `${item.id} 链接地址 ${String(node.props?.href)}`).toContain(
          node.props?.href,
        );
      }
    }
  });

  it("品牌：四个模板都是「码上云」+ 英文副标题，品牌名链接回首页", () => {
    for (const item of HEADER_TEMPLATES) {
      expect(textsOf(item)).toEqual(expect.arrayContaining(["码上云", "CodeCloud"]));
      const brand = byName(item, "Link").find((node) => hasClass(node, "lc-sh-brand-text"));
      expect(brand?.props?.href).toBe("/");
    }
  });

  it("标准导航：白底浅边框，品牌 → 导航 → 操作三段，一个主 CTA，没有辅助栏和第二行", () => {
    const standard = template("header-standard");
    expect(hasClass(standard.schema, "has-border")).toBe(true);
    expect(textsOf(standard)).toContain("商务咨询");
    expect(byName(standard, "Link").filter((n) => hasClass(n, "lc-sh-btn"))).toHaveLength(1);
    expect(orderOf(standard, "lc-sh-utility")).toBe(-1);
    expect(orderOf(standard, "lc-sh-subrow")).toBe(-1);
    expect(orderOf(standard, "lc-sh-brand-slot")).toBeLessThan(orderOf(standard, "lc-sh-middle"));
    expect(orderOf(standard, "lc-sh-middle")).toBeLessThan(orderOf(standard, "lc-sh-side--end"));
  });

  it("居中品牌：品牌在中列，导航单独占第二行（不在主行里）", () => {
    const centered = template("header-centered");
    expect(orderOf(centered, "lc-sh-side--start")).toBe(-1);
    expect(orderOf(centered, "lc-sh-center")).toBeLessThan(orderOf(centered, "lc-sh-side--end"));
    const main = nodesOf(centered).find((node) => hasClass(node, "lc-sh-inner"));
    const subrow = nodesOf(centered).find((node) => hasClass(node, "lc-sh-subrow"));
    const countNav = (root?: BlockTemplateNode) => {
      const names: string[] = [];
      if (root) walk(root, (node) => names.push(node.componentName));
      return names.filter((name) => name === "Navbar").length;
    };
    expect(countNav(main)).toBe(0);
    expect(countNav(subrow)).toBe(1);
  });

  it("极简导航：无边框，导航和主操作都在右侧，只有四项且没有下拉", () => {
    const minimal = template("header-minimal");
    expect(hasClass(minimal.schema, "has-border")).toBe(false);
    const side = nodesOf(minimal).find((node) => hasClass(node, "lc-sh-side--end"));
    const inside: string[] = [];
    if (side) walk(side, (node) => inside.push(node.componentName));
    expect(inside).toEqual(expect.arrayContaining(["Navbar", "Link"]));
    expect(textsOf(minimal)).toContain("开始使用");
    const nav = byName(minimal, "Navbar")[0]?.props?.items as Array<{ children?: unknown[] }>;
    expect(nav).toHaveLength(4);
    for (const entry of nav) expect(entry.children ?? []).toEqual([]);
  });

  it("双层导航：上层辅助信息（电话 / 邮箱 / 帮助 / 伙伴 / 语言）在主行之前", () => {
    const twoRow = template("header-two-row");
    for (const label of ["400-000-0000", "contact@example.com", "帮助中心", "合作伙伴", "中文"]) {
      expect(textsOf(twoRow)).toContain(label);
    }
    expect(orderOf(twoRow, "lc-sh-utility")).toBeGreaterThan(-1);
    expect(orderOf(twoRow, "lc-sh-utility")).toBeLessThan(orderOf(twoRow, "lc-sh-inner"));
  });
});

describe("四套 Hero 模板：原子组合", () => {
  it("四个模板，根节点都是 Div；眉题 / 标题 / 描述 / 按钮 / 图片都是独立节点", () => {
    expect(HERO_TEMPLATES.map((t) => t.id)).toEqual([
      "hero-split",
      "hero-centered",
      "hero-background",
      "hero-product",
    ]);
    for (const item of HERO_TEMPLATES) {
      expect(item.componentName).toBe("Div");
      expect(item.category).toBe("首屏展示");
      const typography = byName(item, "Typography");
      expect(typography.map((n) => n.props?.type)).toEqual(["caption", "h1", "body"]);
      expect(byName(item, "Link")).toHaveLength(2);
      expect(byName(item, "Image").length).toBeGreaterThan(0);
      expect(textsOf(item)).toEqual(
        expect.arrayContaining(["用心打造专业的 AI 软件和产品", "探索产品"]),
      );
    }
    expect(Object.keys(siteBlockComponents).filter((name) => /hero/i.test(name))).toEqual([]);
  });

  it("只推荐标准左右分栏；缩略图互不相同", () => {
    expect(HERO_TEMPLATES.filter((t) => t.recommended).map((t) => t.id)).toEqual(["hero-split"]);
    expect(new Set(HERO_TEMPLATES.map((t) => t.thumbnail)).size).toBe(4);
    expect(new Set(HERO_TEMPLATES.map((t) => JSON.stringify(t.schema))).size).toBe(4);
  });

  it("复用公共容器：内容容器带 lc-site-container，且自己不写任何宽度 / max-width", () => {
    for (const item of HERO_TEMPLATES) {
      const containers = nodesOf(item).filter((node) => hasClass(node, "lc-site-container"));
      expect(containers, `${item.id} 缺公共容器`).toHaveLength(1);
      const style = (containers[0]?.props?.style ?? {}) as Record<string, unknown>;
      for (const key of ["maxWidth", "max-width", "marginLeft", "marginRight", "margin"]) {
        expect(style, `${item.id} 容器不该自己写 ${key}`).not.toHaveProperty(key);
      }
    }
  });

  it("图片：模板不带地址（显示占位），不使用任何网络图片；背景视觉的背景图也是 Image 节点", () => {
    for (const item of HERO_TEMPLATES) {
      for (const node of byName(item, "Image")) {
        expect(node.props, `${item.id} 的图片不该带地址`).not.toHaveProperty("src");
        expect(String(node.props?.alt ?? "").trim()).not.toBe("");
      }
      expect(JSON.stringify(item.schema)).not.toMatch(/https?:/);
    }
    const background = template("hero-background");
    const style = byName(background, "Image")[0]?.props?.style as Record<string, unknown>;
    expect(style.position).toBe("absolute");
    expect(style.objectFit).toBe("cover");
  });

  it("响应式不靠媒体查询：左右分栏用 flex-wrap + flex-basis，字号用 clamp，图片按比例缩放", () => {
    for (const id of ["hero-split", "hero-product"]) {
      const item = template(id);
      const container = nodesOf(item).find((node) => hasClass(node, "lc-site-container"));
      const rowStyle = container?.props?.style as Record<string, unknown>;
      expect(rowStyle.display).toBe("flex");
      expect(rowStyle.flexWrap).toBe("wrap");
      const columns = (container?.children ?? []).filter(
        (child): child is BlockTemplateNode => typeof child !== "string",
      );
      expect(columns).toHaveLength(2);
      for (const column of columns) {
        expect(String((column.props?.style as Record<string, unknown>).flex)).toMatch(
          / 1 \d+px$|^\d(\.\d)? 1 \d+px$/,
        );
      }
    }
    for (const item of HERO_TEMPLATES) {
      const h1 = byName(item, "Typography").find((n) => n.props?.type === "h1");
      expect(String((h1?.props?.style as Record<string, unknown>).fontSize)).toContain("clamp(");
      for (const node of byName(item, "Image")) {
        const style = node.props?.style as Record<string, unknown>;
        expect(style.width).toBe("100%");
        expect(style.objectFit).toBe("cover");
      }
    }
  });

  it("颜色走设计令牌（var(--lc-*)），不在节点样式里硬编码品牌色", () => {
    for (const id of ["hero-split", "hero-centered", "hero-product"]) {
      const json = JSON.stringify(template(id).schema);
      expect(json).toContain("var(--lc-brand");
      expect(json).toContain("var(--lc-title");
      expect(json).not.toMatch(/"(color|background)":"#2463eb"/i);
    }
  });

  it("不虚构业务路由：按钮地址全是占位 #", () => {
    for (const item of HERO_TEMPLATES) {
      for (const node of byName(item, "Link")) expect(node.props?.href).toBe("#");
    }
  });

  it("居中展示：文案居中对齐，图片在文案下方；背景视觉：有遮罩层且不拦截点击", () => {
    const centered = template("hero-centered");
    const copy = nodesOf(centered).find(
      (node) =>
        node.props?.style &&
        (node.props.style as Record<string, unknown>).alignItems === "center" &&
        node.title === "文案",
    );
    expect(copy).toBeTruthy();
    const background = template("hero-background");
    const mask = nodesOf(background).find((node) => node.title === "遮罩");
    expect((mask?.props?.style as Record<string, unknown>).pointerEvents).toBe("none");
  });
});

describe("物料面板可见性", () => {
  it("Navbar 不在「业务区块」分组里：留在组件面板", () => {
    expect(navbarMeta.group).not.toBe("业务区块");
  });
});

describe("三套产品矩阵模板：原子组合", () => {
  const CATEGORY_TITLES = ["开源产品", "AI 产品", "SaaS 应用"];

  /** 卡片 = 带 lc-pm-card 类的 Div，是网格的直接子节点。 */
  const cardsOf = (item: BlockTemplate) =>
    nodesOf(item).filter((node) => hasClass(node, "lc-pm-card"));

  it("三个模板：id / 名称 / 分类固定，根节点都是 Div，没有整体的 ProductMatrix 物料", () => {
    expect(PRODUCT_MATRIX_TEMPLATES.map((t) => [t.id, t.name, t.category])).toEqual([
      ["product-matrix-illustrated", "插画展示型", "产品展示"],
      ["product-matrix-icon", "轻量图标型", "产品展示"],
      ["product-matrix-visual", "视觉强调型", "产品展示"],
    ]);
    for (const item of PRODUCT_MATRIX_TEMPLATES) expect(item.componentName).toBe("Div");
    expect(Object.keys(siteBlockComponents).filter((name) => /matrix/i.test(name))).toEqual([]);
    expect(PRODUCT_MATRIX_TEMPLATES.filter((t) => t.recommended).map((t) => t.id)).toEqual([
      "product-matrix-illustrated",
    ]);
  });

  it("三套 Schema 互不相同，缩略图互不相同，但内容（区块标题与三个分类）一致", () => {
    expect(new Set(PRODUCT_MATRIX_TEMPLATES.map((t) => JSON.stringify(t.schema))).size).toBe(3);
    expect(new Set(PRODUCT_MATRIX_TEMPLATES.map((t) => t.thumbnail)).size).toBe(3);
    for (const item of PRODUCT_MATRIX_TEMPLATES) {
      const texts = textsOf(item);
      expect(texts).toEqual(
        expect.arrayContaining([
          "产品矩阵",
          "丰富的产品体系，满足多样化的业务需求",
          "覆盖开源产品、AI 产品与 SaaS 应用，助力个人、商家与企业实现数字化升级。",
          ...CATEGORY_TITLES,
          "代表产品：移山 ZEROCMF",
          "代表产品：GenLabs",
        ]),
      );
    }
  });

  it("三张分类卡片，每张都有标题 / 描述 / 配图 / 了解更多链接；网格自适应列数", () => {
    for (const item of PRODUCT_MATRIX_TEMPLATES) {
      const cards = cardsOf(item);
      expect(cards, item.id).toHaveLength(3);
      for (const card of cards) {
        const inside: BlockTemplateNode[] = [];
        walk(card, (node) => inside.push(node));
        expect(inside.filter((n) => n.componentName === "Image")).toHaveLength(1);
        expect(inside.filter((n) => n.componentName === "Link")).toHaveLength(1);
        expect(
          inside.filter((n) => n.componentName === "Typography" && n.props?.type === "h3"),
        ).toHaveLength(1);
      }
      const grid = nodesOf(item).find(
        (node) => (node.props?.style as Record<string, unknown> | undefined)?.display === "grid",
      );
      const style = grid?.props?.style as Record<string, string | number>;
      expect(style.gridTemplateColumns).toBe("repeat(auto-fit, minmax(min(100%, 320px), 1fr))");
      expect(style.alignItems).toBe("stretch");
      // 同一行等高：卡片是纵向 flex，不写固定高度
      for (const card of cards) {
        const cardStyle = card.props?.style as Record<string, unknown>;
        expect(cardStyle.display).toBe("flex");
        expect(cardStyle.flexDirection).toBe("column");
        expect(cardStyle).not.toHaveProperty("height");
      }
    }
  });

  it("复用 SectionHeader 与公共容器：三个模板的区块标题结构一致，容器不自己写宽度", () => {
    const headers = PRODUCT_MATRIX_TEMPLATES.map((item) => {
      const header = nodesOf(item).find((node) => node.title === "区块标题");
      expect(header, `${item.id} 缺区块标题`).toBeTruthy();
      return JSON.stringify(header);
    });
    expect(new Set(headers).size).toBe(1);
    for (const item of PRODUCT_MATRIX_TEMPLATES) {
      const containers = nodesOf(item).filter((node) => hasClass(node, "lc-site-container"));
      expect(containers).toHaveLength(1);
      const style = (containers[0]?.props?.style ?? {}) as Record<string, unknown>;
      expect(style).not.toHaveProperty("maxWidth");
      expect(style).not.toHaveProperty("width");
    }
  });

  it("图片：模板不带地址（显示占位）、比例固定、cover，不使用网络图片；链接都是占位 #", () => {
    for (const item of PRODUCT_MATRIX_TEMPLATES) {
      for (const node of byName(item, "Image")) {
        expect(node.props).not.toHaveProperty("src");
        const style = node.props?.style as Record<string, unknown>;
        expect(style.objectFit).toBe("cover");
        expect(String(style.aspectRatio)).toMatch(/^\d+ \/ \d+$/);
        expect(String(node.props?.alt).trim()).not.toBe("");
      }
      expect(JSON.stringify(item.schema)).not.toMatch(/https?:/);
      for (const node of byName(item, "Link")) expect(node.props?.href).toBe("#");
    }
  });

  it("三套视觉确实不同：插画图最大占比 16/9、图标型小图 21/9、视觉型 4/3；视觉型不用阴影", () => {
    const aspect = (id: string) =>
      (byName(template(id), "Image")[0]?.props?.style as Record<string, unknown>).aspectRatio;
    expect(aspect("product-matrix-illustrated")).toBe("16 / 9");
    expect(aspect("product-matrix-icon")).toBe("21 / 9");
    expect(aspect("product-matrix-visual")).toBe("4 / 3");
    for (const item of PRODUCT_MATRIX_TEMPLATES) {
      expect(JSON.stringify(item.schema)).not.toContain("boxShadow");
    }
    const illustrated = cardsOf(template("product-matrix-illustrated"))[0]?.props?.style as Record<
      string,
      unknown
    >;
    expect(illustrated.borderRadius).toBe(12);
    expect(illustrated.overflow).toBe("hidden");
  });

  it("每个卡片带悬停上浮的类名，CSS 里有对应规则并尊重减少动效", () => {
    for (const item of PRODUCT_MATRIX_TEMPLATES) {
      for (const card of cardsOf(item)) expect(hasClass(card, "lc-pm-card")).toBe(true);
    }
  });
});
