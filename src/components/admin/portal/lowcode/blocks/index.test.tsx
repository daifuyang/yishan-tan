import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementBar, safeColor } from "./announcement-bar";
import { safeHref } from "./block-kit";
import { siteBlockComponents, siteBlockMetas } from "./index";
import { SiteHeader } from "./site-header";
import {
  MAX_ACTIONS,
  isItemActive,
  normalizeActions,
  normalizeNavItems,
  readSiteHeaderConfig,
} from "./site-header.model";

/** 引擎基础物料包里已占用的名字（demo-react 的 17 个）。 */
const ENGINE_NAMES = [
  "Page",
  "Div",
  "Form",
  "FormItem",
  "Typography",
  "Link",
  "Button",
  "Input",
  "TextArea",
  "Select",
  "Checkbox",
  "Switch",
  "Tag",
  "Divider",
  "Image",
  "Progress",
  "Empty",
  "Alert",
];

describe("业务区块物料包", () => {
  it("描述与实现一一对应，且不与引擎物料重名", () => {
    const metaNames = siteBlockMetas.map((m) => m.componentName).sort();
    expect(metaNames).toEqual(Object.keys(siteBlockComponents).sort());
    for (const name of metaNames) expect(ENGINE_NAMES).not.toContain(name);
  });

  it("两个物料都是自包含的（不是容器）、归在「业务区块」", () => {
    for (const meta of siteBlockMetas) {
      expect(meta.group).toBe("业务区块");
      expect(meta.configure.component.isContainer).toBe(false);
    }
  });

  it("defaultSchema 只使用已声明的 props，且不含 props.children", () => {
    for (const meta of siteBlockMetas) {
      const schema = meta.defaultSchema as {
        componentName: string;
        props: Record<string, unknown>;
      };
      expect(schema.componentName).toBe(meta.componentName);
      expect(schema.props).not.toHaveProperty("children");
      for (const key of Object.keys(schema.props)) expect(meta.props).toHaveProperty(key);
    }
  });

  it("每个 prop 有分组与协议支持的类型；枚举 options 的值都是实现接受的", () => {
    const types = ["string", "number", "bool", "object", "array"];
    for (const meta of siteBlockMetas) {
      for (const [key, prop] of Object.entries(meta.props)) {
        expect(prop.group, `${meta.componentName}.${key} 缺分组`).toBeTruthy();
        expect(types).toContain(prop.type);
      }
    }
  });

  it("列表 setter 用标准 ArraySetter / ObjectSetter 配置：快捷项 + 条数上限", () => {
    type ItemConfig = { name: string; important?: boolean };
    type ListSetter = {
      componentName: string;
      props: {
        itemMaxLength: number;
        itemSetter: {
          componentName: string;
          props: { config: { items: ItemConfig[] } };
        };
      };
    };
    const header = siteBlockMetas.find((m) => m.componentName === "SiteHeader");
    for (const key of ["navItems", "actions"]) {
      const setter = header?.props[key]?.setter as ListSetter;
      expect(setter.componentName).toBe("ArraySetter");
      expect(setter.props.itemSetter.componentName).toBe("ObjectSetter");
      const quick = setter.props.itemSetter.props.config.items
        .filter((item) => item.important)
        .map((item) => item.name);
      expect(quick).toEqual(["label", "href"]);
    }
    const actions = header?.props.actions?.setter as ListSetter;
    expect(actions.props.itemMaxLength).toBe(2);
  });

  it("默认 schema 能渲染出完整头部", () => {
    const meta = siteBlockMetas.find((m) => m.componentName === "SiteHeader");
    const props = (meta?.defaultSchema as { props: Record<string, unknown> }).props;
    const html = renderToStaticMarkup(<SiteHeader {...props} data-node-id="n1" />);
    expect(html).toContain('data-node-id="n1"');
    expect(html).toContain("lc-sh--standard");
    expect(html).toContain("首页");
    expect(html).toContain("商务咨询");
  });
});

describe("SiteHeader 渲染", () => {
  it("图片为空时退回文字品牌标识，有图时渲染图片", () => {
    const text = renderToStaticMarkup(<SiteHeader brandText="易山" />);
    expect(text).toContain("易山");
    expect(text).not.toContain("<img");
    const image = renderToStaticMarkup(<SiteHeader logoSrc="/logo.png" showBrandText={false} />);
    expect(image).toContain('src="/logo.png"');
  });

  it("布局与外观相互独立", () => {
    const html = renderToStaticMarkup(<SiteHeader layout="centered" appearance="dark" />);
    expect(html).toContain("lc-sh--centered");
    expect(html).toContain("lc-sh--dark");
  });

  it("新窗口链接带 noopener，危险协议被丢弃", () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        navItems={[
          { label: "外链", href: "https://example.com", target: "_blank" },
          { label: "坏链接", href: "javascript:alert(1)" },
        ]}
      />,
    );
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("javascript:");
  });

  it("非法 props 退化为默认值而不是崩溃", () => {
    const config = readSiteHeaderConfig({ layout: "nope", height: "x", navItems: "oops" });
    expect(config.layout).toBe("standard");
    expect(config.height).toBe(64);
    expect(config.navItems).toEqual([]);
    expect(() =>
      renderToStaticMarkup(<SiteHeader navItems={{ a: 1 }} actions={7} />),
    ).not.toThrow();
  });
});

describe("导航与操作归一化", () => {
  it("操作按钮最多两个", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ label: `按钮${i}`, href: "/" }));
    expect(normalizeActions(many)).toHaveLength(MAX_ACTIONS);
  });

  it("二级菜单只保留一层，空文案项被忽略", () => {
    const items = normalizeNavItems([
      { label: "产品", children: [{ label: "A", children: [{ label: "深层" }] }, { label: "" }] },
    ]);
    expect(items[0]?.children).toHaveLength(1);
    expect(items[0]?.children[0]).not.toHaveProperty("children");
  });

  it("激活态：显式 active 或 activePath 命中子菜单都点亮父级", () => {
    const [item] = normalizeNavItems([{ label: "产品", children: [{ label: "A", href: "/a" }] }]);
    expect(item && isItemActive(item, "/a")).toBe(true);
    expect(item && isItemActive(item, "/b")).toBe(false);
  });
});

describe("AnnouncementBar", () => {
  it("渲染文案、操作链接与关闭按钮；可关闭可配置", () => {
    const html = renderToStaticMarkup(
      <AnnouncementBar text="大促" href="/sale" actionText="去看看" appearance="dark" />,
    );
    expect(html).toContain("大促");
    expect(html).toContain('href="/sale"');
    expect(html).toContain("lc-ab--dark");
    expect(html).toContain("lc-ab-close");
    expect(renderToStaticMarkup(<AnnouncementBar text="x" dismissible={false} />)).not.toContain(
      "lc-ab-close",
    );
  });

  it("颜色只接受安全写法", () => {
    expect(safeColor("#ff0000")).toBe("#ff0000");
    expect(safeColor("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
    expect(safeColor("red; background:url(x)")).toBeUndefined();
  });
});

describe("safeHref", () => {
  it("放行站内与常见协议，拒绝脚本协议", () => {
    for (const ok of ["/a", "#top", "https://x.com", "mailto:a@b.c", "tel:123", "about"]) {
      expect(safeHref(ok)).toBe(ok);
    }
    expect(safeHref("javascript:alert(1)")).toBe("");
    expect(safeHref("data:text/html,x")).toBe("");
  });
});
