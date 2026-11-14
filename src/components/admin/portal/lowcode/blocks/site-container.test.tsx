import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementBar } from "./announcement-bar";
import type { BlockTemplateNode } from "./block-template.types";
import { HEADER_TEMPLATES } from "./block-templates/header-templates";
import { HERO_TEMPLATES } from "./block-templates/hero-templates";
import { PRODUCT_MATRIX_TEMPLATES } from "./block-templates/product-matrix-templates";
import { SITE_CONTAINER_CLASS, SiteContainer } from "./site-container";

const css = readFileSync(new URL("./blocks.css", import.meta.url), "utf8");

/** 取出某个选择器的第一个规则体（`selector { ... }`），找不到返回 null。 */
function ruleBody(selector: string, source = css): string | null {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close);
}

const classesOf = (node: BlockTemplateNode) => String(node.props?.className ?? "").split(" ");
const isContainer = (node: BlockTemplateNode) => classesOf(node).includes(SITE_CONTAINER_CLASS);

/** 遍历模板树，同时告诉访问者「当前节点是否已在公共容器内」。 */
function walkWithContainer(
  node: BlockTemplateNode,
  visit: (node: BlockTemplateNode, insideContainer: boolean) => void,
  inside = false,
) {
  visit(node, inside);
  const nextInside = inside || isContainer(node);
  for (const child of node.children ?? []) {
    if (typeof child !== "string") walkWithContainer(child, visit, nextInside);
  }
}

const containersOf = (root: BlockTemplateNode) => {
  const found: BlockTemplateNode[] = [];
  walkWithContainer(root, (node) => {
    if (isContainer(node)) found.push(node);
  });
  return found;
};

const header = (id: string) => {
  const template = HEADER_TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(`缺少模板 ${id}`);
  return template.schema;
};

describe("公共容器 CSS：只定义一次，规范值", () => {
  it(".lc-site-container：width 100%、max-width 1200px、居中、左右内边距 24px、border-box", () => {
    const body = ruleBody(".lc-site-container") as string;
    expect(body).not.toBeNull();
    for (const declaration of [
      "box-sizing: border-box",
      "width: 100%",
      "max-width: var(--lc-container-max, 1200px)",
      "margin-inline: auto",
      "padding-inline: 24px",
    ]) {
      expect(body).toContain(declaration);
    }
  });

  it("768px 以下左右内边距 16px（视口媒体查询 + 页头自身宽度的容器查询都覆盖）", () => {
    expect(css).toMatch(
      /@media \(max-width: 768px\)\s*\{\s*\.lc-site-container\s*\{\s*padding-inline: 16px;/,
    );
    const container = css.slice(css.indexOf("@container lc-sh (max-width: 768px)"));
    expect(ruleBody(".lc-sh .lc-site-container", container)).toContain("padding-inline: 16px");
  });

  it("容器规则只出现一份，没有被复制成多份", () => {
    expect(css.match(/^\.lc-site-container \{/gm)).toHaveLength(1);
    expect(css.match(/max-width: var\(--lc-container-max/g)).toHaveLength(1);
  });

  it("各层内部排布规则里不再写 max-width / margin / padding（宽度只归公共容器管）", () => {
    for (const selector of [
      ".lc-sh-inner",
      ".lc-sh-utility-inner",
      ".lc-ab-container",
      ".lc-ab-inner",
    ]) {
      const body = ruleBody(selector) as string;
      expect(body, `${selector} 规则缺失`).not.toBeNull();
      expect(body, `${selector} 不应自己写 max-width`).not.toMatch(/max-width/);
      expect(body, `${selector} 不应自己写 margin`).not.toMatch(/margin/);
      expect(body, `${selector} 不应自己写 padding`).not.toMatch(/padding/);
    }
    expect(css).not.toContain("--lc-sh-max");
  });

  it("平板收紧档只收紧间距，不改容器内边距（否则会和公告条的边界错开）", () => {
    const tablet = css.slice(css.indexOf("@container lc-sh (max-width: 1024px)"));
    const body = ruleBody(".lc-sh .lc-sh-inner,\n  .lc-sh .lc-sh-utility-inner", tablet) as string;
    expect(body).toContain("gap: 16px");
    expect(body).not.toMatch(/padding/);
  });

  it("不用绝对定位 / transform / 固定 margin 硬凑对齐：公告关闭按钮是网格里的普通元素", () => {
    const close = ruleBody(".lc-ab-close") as string;
    expect(close).not.toMatch(/position:\s*absolute/);
    expect(close).not.toMatch(/transform/);
    expect(close).toContain("justify-self: end");
    for (const selector of [".lc-sh-inner", ".lc-sh-utility-inner"]) {
      const body = ruleBody(selector) as string;
      expect(body).not.toMatch(/position:\s*absolute|transform|margin-left/);
    }
  });
});

describe("层叠：展开的下拉不被相邻区块盖住", () => {
  const zIndexOf = (body: string | null) => Number(/z-index:\s*(\d+)/.exec(body ?? "")?.[1]);

  it("有下拉 / 移动菜单展开的 Header 整体抬高，高于未展开时的 z-index", () => {
    const base = zIndexOf(ruleBody(".lc-sh"));
    const elevated = zIndexOf(
      ruleBody(".lc-sh:has(.lc-sh-dropdown, .lc-sh-mobile),\n.lc-sh:hover,\n.lc-sh:focus-within"),
    );
    expect(base).toBeGreaterThan(0);
    expect(elevated).toBeGreaterThan(base);
  });

  it("下拉自己的层级高于 Header 内部其它内容", () => {
    expect(zIndexOf(ruleBody(".lc-sh-dropdown"))).toBeGreaterThanOrEqual(50);
  });
});

describe("手机折叠：看页头自身宽度（容器查询），而不是视口或 JS 测宽", () => {
  it("页头是名为 lc-sh 的查询容器；768 以下收起横排导航、显示汉堡，所有布局统一一行", () => {
    const root = ruleBody(".lc-sh") as string;
    expect(root).toContain("container-type: inline-size");
    expect(root).toContain("container-name: lc-sh");
    const mobile = css.slice(css.indexOf("@container lc-sh (max-width: 768px)"));
    expect(mobile).toMatch(/\.lc-sh-nav \.lc-sh-list[^{]*\{\s*display: none;/);
    expect(ruleBody(".lc-sh-nav .lc-sh-burger", mobile)).toContain("display: inline-flex");
    expect(ruleBody(".lc-sh-burger")).toContain("display: none");
    expect(ruleBody(".lc-sh .lc-sh-inner", mobile)).toContain("display: flex");
  });

  it("不再有 JS 状态类 is-mobile / is-compact", () => {
    expect(css).not.toMatch(/is-mobile|is-compact/);
  });
});

describe("产品矩阵卡片的 CSS", () => {
  it("悬停上浮，并尊重「减少动效」；空图片占位有图标和替换提示", () => {
    expect(ruleBody(".lc-pm-card:hover")).toContain("translateY(-4px)");
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.lc-pm-card \{\s*transition: none;/,
    );
    expect(ruleBody(".lc-pm-card .lc-image--empty::after")).toContain("在属性面板中替换图片");
    expect(ruleBody(".lc-pm-card .lc-image--empty::before")).toContain("data:image/svg+xml");
  });
});

describe("SiteContainer 组件", () => {
  it("渲染公共容器类，可追加自己的类名与属性", () => {
    const html = renderToStaticMarkup(
      <SiteContainer className="x" data-k="v">
        内容
      </SiteContainer>,
    );
    expect(html).toBe(`<div data-k="v" class="${SITE_CONTAINER_CLASS} x">内容</div>`);
    expect(SITE_CONTAINER_CLASS).toBe("lc-site-container");
  });
});

describe("所有区块都用同一个公共容器", () => {
  it.each([
    ["header-standard", 1],
    ["header-centered", 1],
    ["header-minimal", 1],
    ["header-two-row", 2],
  ])("%s：每一层内容行都带 lc-site-container（共 %i 个）", (id, count) => {
    expect(containersOf(header(id))).toHaveLength(count);
  });

  it("两层页头：辅助信息栏与主行用的是同一个容器类（上下两层左右边界一致）", () => {
    const names = containersOf(header("header-two-row")).map((node) => classesOf(node).join(" "));
    expect(names.some((name) => name.includes("lc-sh-utility-inner"))).toBe(true);
    expect(names.some((name) => name.includes("lc-sh-inner"))).toBe(true);
  });

  it("品牌、操作按钮、辅助信息都在容器内；导航在容器内，居中布局的第二行除外（整行居中）", () => {
    for (const template of HEADER_TEMPLATES) {
      walkWithContainer(template.schema, (node, inside) => {
        const marker = classesOf(node).find((name) =>
          ["lc-sh-brand", "lc-sh-side", "lc-sh-util-group"].includes(name),
        );
        if (marker) expect(inside, `${template.id} 的 ${marker} 跑到了容器外`).toBe(true);
        if (node.componentName === "Navbar" && template.id !== "header-centered") {
          expect(inside, `${template.id} 的导航跑到了容器外`).toBe(true);
        }
      });
    }
  });

  it("Hero：背景（section）全宽，内容在容器里；背景视觉里的文案也在容器里", () => {
    for (const template of HERO_TEMPLATES) {
      expect(isContainer(template.schema), `${template.id} 根节点不该是容器`).toBe(false);
      let copyOutside = 0;
      walkWithContainer(template.schema, (node, inside) => {
        if (node.componentName === "Typography" && !inside) copyOutside += 1;
      });
      expect(copyOutside, `${template.id} 有文案在容器外`).toBe(0);
    }
  });

  it("产品矩阵：背景（section）全宽，区块标题与卡片网格都在容器里，且只有一个容器", () => {
    for (const template of PRODUCT_MATRIX_TEMPLATES) {
      expect(isContainer(template.schema), `${template.id} 根节点不该是容器`).toBe(false);
      expect(containersOf(template.schema), template.id).toHaveLength(1);
      let outside = 0;
      walkWithContainer(template.schema, (node, inside) => {
        if (node.componentName === "Typography" && !inside) outside += 1;
      });
      expect(outside, `${template.id} 有文案在容器外`).toBe(0);
    }
  });

  it("公告条：背景全宽，文案与关闭按钮都在容器里", () => {
    const html = renderToStaticMarkup(<AnnouncementBar text="公告" dismissible />);
    const container = html.match(
      /<div class="lc-site-container lc-ab-container">([\s\S]*)<\/div><\/section>/,
    );
    expect(container).not.toBeNull();
    expect(container?.[1]).toContain("lc-ab-inner");
    expect(container?.[1]).toContain("lc-ab-close");
    // section（背景）本身不是容器
    expect(html.startsWith('<section aria-label="站点公告" class="lc-ab ')).toBe(true);
    expect(html.match(/lc-site-container/g)).toHaveLength(1);
  });

  it("公告条不可关闭时没有关闭按钮，容器仍在", () => {
    const html = renderToStaticMarkup(<AnnouncementBar text="公告" dismissible={false} />);
    expect(html).toContain("lc-ab-container");
    expect(html).not.toContain("lc-ab-close");
  });
});

describe("宽度来源：默认统一 1200，容器自己不写宽度", () => {
  it("Header / Hero / 产品矩阵的容器节点都没有 max-width / width / --lc-container-max", () => {
    for (const template of [...HEADER_TEMPLATES, ...HERO_TEMPLATES, ...PRODUCT_MATRIX_TEMPLATES]) {
      for (const node of containersOf(template.schema)) {
        const style = (node.props?.style ?? {}) as Record<string, unknown>;
        for (const key of ["maxWidth", "width", "--lc-container-max"]) {
          expect(style, `${template.id} 的容器不该写 ${key}`).not.toHaveProperty(key);
        }
      }
      expect(JSON.stringify(template.schema)).not.toContain("--lc-container-max");
    }
  });
});
