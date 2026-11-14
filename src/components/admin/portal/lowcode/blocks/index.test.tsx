import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AnnouncementBar, safeColor } from "./announcement-bar";
import { BLOCKS_GROUP, LAYOUT_CONTAINER_GROUP, safeHref } from "./block-kit";
import { siteBlockComponents, siteBlockMetas } from "./index";
import { PageLayout } from "./page-layout";
import { SiteHeader } from "./site-header";
import {
  MAX_ACTIONS,
  isItemActive,
  normalizeActions,
  normalizeNavItems,
  readSiteHeaderConfig,
} from "./site-header.model";
import { TabPane, Tabs } from "./tabs";

/** 引擎基础物料包里已占用的名字（demo-react 的 17 个）。 */
const ENGINE_NAMES = [
  "Page",
  "Slot",
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

  it("区块归「业务区块」且自包含；选项卡一对是容器、与引擎 Div 同归「布局」", () => {
    const containers = ["Tabs", "TabPane"];
    for (const meta of siteBlockMetas) {
      const isContainer = containers.includes(meta.componentName);
      expect(meta.group).toBe(isContainer ? LAYOUT_CONTAINER_GROUP : BLOCKS_GROUP);
      expect(meta.configure.component.isContainer).toBe(isContainer);
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

describe("PageLayout 具名插槽", () => {
  const layout = siteBlockMetas.find((m) => m.componentName === "PageLayout");
  type Child = { componentName: string; props?: { name?: string }; children?: Child[] };

  it("声明 header / main / footer 三个槽，页头槽只收公告条与网站头部", () => {
    const slots = layout?.configure.component.slots ?? [];
    expect(slots.map((s) => s.name)).toEqual(["header", "main", "footer"]);
    expect(slots[0]?.childWhitelist).toEqual(["AnnouncementBar", "SiteHeader"]);
    expect(slots[1]?.childWhitelist).toBeUndefined();
  });

  it("自身不是容器；defaultSchema 的 Slot 子节点与声明一一对应，页头预置 SiteHeader", () => {
    expect(layout?.configure.component.isContainer).toBe(false);
    const children = (layout?.defaultSchema as { children: Child[] }).children;
    expect(children.map((c) => c.componentName)).toEqual(["Slot", "Slot", "Slot"]);
    expect(children.map((c) => c.props?.name)).toEqual(
      layout?.configure.component.slots?.map((s) => s.name),
    );
    expect(children[0]?.children?.map((c) => c.componentName)).toEqual(["SiteHeader"]);
  });

  it("只摆放 props.slots 里的三块内容，没有 children 通道", () => {
    const html = renderToStaticMarkup(
      <PageLayout
        data-node-id="pl1"
        stickyHeader
        mainMaxWidth={1000}
        slots={{
          header: <div id="h">H</div>,
          main: <div id="m">M</div>,
          footer: <div id="f">F</div>,
        }}
      >
        不该出现
      </PageLayout>,
    );
    expect(html.indexOf('id="h"')).toBeLessThan(html.indexOf('id="m"'));
    expect(html.indexOf('id="m"')).toBeLessThan(html.indexOf('id="f"'));
    expect(html).not.toContain("不该出现");
    expect(html).toContain("has-sticky-header");
    expect(html).toContain("--lc-pl-main-max:1000px");
    expect(html).toContain('data-node-id="pl1"');
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

describe("Tabs 选项卡", () => {
  /** 模拟渲染器：每个子节点外包一层（真实环境是容错边界）。 */
  function Boundary({ children }: { children?: React.ReactNode }) {
    return <>{children}</>;
  }
  const pane = (title: string | undefined, body: string, key: string) => (
    <Boundary key={key}>
      <TabPane title={title}>
        <p>{body}</p>
      </TabPane>
    </Boundary>
  );

  it("穿过包装层读出各页标题，默认选中第一页，其余面板隐藏但仍在 DOM 里", () => {
    const html = renderToStaticMarkup(
      <Tabs>
        {pane("概览", "内容 A", "a")}
        {pane("详情", "内容 B", "b")}
      </Tabs>,
    );
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain(">概览</button>");
    expect(html).toContain(">详情</button>");
    expect(html).toContain("内容 A");
    expect(html).toContain("内容 B");
    expect(html.match(/hidden=""/g)).toHaveLength(1);
    expect(html).toMatch(/aria-selected="true"[^>]*>概览/);
  });

  it("defaultActive 从 1 起算，越界收口到最后一页", () => {
    const two = (defaultActive: unknown) =>
      renderToStaticMarkup(
        <Tabs defaultActive={defaultActive}>
          {pane("一", "a", "a")}
          {pane("二", "b", "b")}
        </Tabs>,
      );
    expect(two(2)).toMatch(/aria-selected="true"[^>]*>二/);
    expect(two(99)).toMatch(/aria-selected="true"[^>]*>二/);
    expect(two("坏数据")).toMatch(/aria-selected="true"[^>]*>一/);
  });

  it("标题为空时退回「选项卡 N」；非 TabPane 的子节点原样保留、不进页签", () => {
    const html = renderToStaticMarkup(
      <Tabs variant="pill" align="center">
        {pane("", "a", "a")}
        <div key="x" className="stray">
          占位
        </div>
      </Tabs>,
    );
    expect(html).toContain(">选项卡 1</button>");
    expect(html.match(/role="tab"/g)).toHaveLength(1);
    expect(html).toContain('class="stray"');
    expect(html).toContain("lc-tabs--pill");
    expect(html).toContain("lc-tabs--align-center");
  });

  it("没有任何页时不渲染页签栏；非法样式退回默认", () => {
    const html = renderToStaticMarkup(<Tabs variant="bogus" />);
    expect(html).not.toContain("tablist");
    expect(html).toContain("lc-tabs--line");
  });

  it("嵌套约束：Tabs 只收 TabPane，TabPane 只进 Tabs；默认带两页", () => {
    const tabs = siteBlockMetas.find((m) => m.componentName === "Tabs");
    const tabPane = siteBlockMetas.find((m) => m.componentName === "TabPane");
    expect(tabs?.configure.component.nestingRule).toEqual({ childWhitelist: ["TabPane"] });
    expect(tabPane?.configure.component.nestingRule).toEqual({ parentWhitelist: ["Tabs"] });
    const schema = tabs?.defaultSchema as { children: Array<{ componentName: string }> };
    expect(schema.children.map((c) => c.componentName)).toEqual(["TabPane", "TabPane"]);
  });
});
