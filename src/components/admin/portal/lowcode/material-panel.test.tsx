import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { siteBlockMetas } from "./blocks";
import { BLOCKS_GROUP, LAYOUT_CONTAINER_GROUP } from "./blocks/block-kit";
import { COMPONENT_ICONS } from "./component-icons";
import type { LowcodeMaterialMeta, LowcodeMaterialPanelProps } from "./engine";
import { MaterialPanel, groupMaterials, tabKeyOf } from "./material-panel";

const meta = (
  componentName: string,
  title: string,
  group?: string,
  hidden = false,
): LowcodeMaterialMeta => ({ componentName, title, group, configure: { component: { hidden } } });

const METAS = [
  meta("Page", "页面", "页面", true),
  meta("Button", "按钮", "通用"),
  meta("Input", "输入框", "表单"),
  meta("Tabs", "选项卡", LAYOUT_CONTAINER_GROUP),
  meta("SiteHeader", "网站头部", BLOCKS_GROUP),
];

const TABS = [
  { key: "basic", title: "基础组件" },
  { key: "layout", title: "容器", groups: [LAYOUT_CONTAINER_GROUP] },
];

function render(overrides: Partial<LowcodeMaterialPanelProps> = {}) {
  const registry = { list: () => METAS, subscribe: () => () => {}, getVersion: () => 0 };
  return renderToStaticMarkup(
    <MaterialPanel registry={registry} onDragStart={() => {}} {...overrides} />,
  );
}

/** 引擎基础包里对用户可见的组件（Page / Slot 是隐藏的系统物料）。 */
const ENGINE_VISIBLE = [
  "Alert",
  "Button",
  "Checkbox",
  "Div",
  "Divider",
  "Empty",
  "Form",
  "FormItem",
  "Image",
  "Input",
  "Link",
  "Progress",
  "Select",
  "Switch",
  "Tag",
  "TextArea",
  "Typography",
];

describe("组件面板", () => {
  it("区块不进组件面板：分节里没有业务区块分组，也不渲染它的条目", () => {
    const names = groupMaterials(METAS, "").flatMap((s) => s.items.map((i) => i.componentName));
    expect(names).toEqual(["Button", "Input", "Tabs"]);
    const html = render();
    expect(html).not.toContain('data-material="SiteHeader"');
    expect(html).not.toContain('data-material="Page"');
    expect(html).toContain('data-material="Tabs"');
  });

  it("分节：按关键词（标题或组件名）过滤", () => {
    expect(groupMaterials(METAS, "input").map((s) => s.name)).toEqual(["表单"]);
    expect(groupMaterials(METAS, "按钮").map((s) => s.name)).toEqual(["通用"]);
    expect(groupMaterials(METAS, "网站头部")).toEqual([]);
  });

  it("不传页签时不画页签栏；传了多个就画，默认显示第一个页签的内容", () => {
    expect(render()).not.toContain('role="tablist"');
    const html = render({ tabs: TABS });
    expect(html).toContain('role="tablist"');
    expect(html).toContain('data-material="Button"');
    expect(html).not.toContain('data-material="Tabs"');
  });

  it("页签归属：命中 groups 的进对应页签，其余进没写 groups 的兜底页签", () => {
    expect(tabKeyOf(TABS, LAYOUT_CONTAINER_GROUP)).toBe("layout");
    expect(tabKeyOf(TABS, "通用")).toBe("basic");
  });

  it("有固定 / 关闭回调时才出按钮，并随 pinned 切换文案", () => {
    expect(render()).not.toContain('aria-label="关闭"');
    const html = render({ pinned: true, onTogglePin: () => {}, onClose: () => {} });
    expect(html).toContain('aria-label="取消固定"');
    expect(html).toContain('aria-label="关闭"');
    expect(render({ pinned: false, onTogglePin: () => {} })).toContain('aria-label="固定"');
  });
});

describe("组件图标表", () => {
  it("引擎基础组件与宿主容器都登记了图标，漏补会在这里红", () => {
    const containers = siteBlockMetas
      .filter((m) => m.group === LAYOUT_CONTAINER_GROUP)
      .map((m) => m.componentName);
    for (const name of [...ENGINE_VISIBLE, ...containers]) {
      expect(COMPONENT_ICONS, `${name} 缺图标`).toHaveProperty(name);
    }
  });

  it("每个组件用互不相同的图标（输入框 / 多行文本 / 下拉等不再共用一个矩形）", () => {
    const icons = ENGINE_VISIBLE.map((name) => COMPONENT_ICONS[name]);
    expect(new Set(icons).size).toBe(icons.length);
  });
});
