import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BLOCK_CATALOG,
  BlockPanel,
  blockLeftPanel,
  categoriesOf,
  categoryOf,
  filterBlocks,
  groupByCategory,
  listBlocks,
} from "./block-panel";
import { siteBlockMetas } from "./blocks";
import { BLOCKS_GROUP, LAYOUT_CONTAINER_GROUP } from "./blocks/block-kit";
import type { LowcodeMaterialMeta } from "./engine";

const meta = (
  componentName: string,
  title: string,
  group?: string,
  hidden = false,
): LowcodeMaterialMeta => ({ componentName, title, group, configure: { component: { hidden } } });

const METAS = [
  meta("Page", "页面", "页面", true),
  meta("Button", "按钮", "通用"),
  meta("Tabs", "选项卡", LAYOUT_CONTAINER_GROUP),
  meta("SiteHeader", "网站头部", BLOCKS_GROUP),
  meta("AnnouncementBar", "顶部公告", BLOCKS_GROUP),
  meta("PageLayout", "页面布局", BLOCKS_GROUP),
  meta("Mystery", "未登记区块", BLOCKS_GROUP),
];

function render(metas: LowcodeMaterialMeta[] = METAS, props = {}) {
  const registry = { list: () => metas, subscribe: () => () => {}, getVersion: () => 0 };
  return renderToStaticMarkup(<BlockPanel registry={registry} onDragStart={() => {}} {...props} />);
}

describe("区块面板", () => {
  it("只收业务区块分组的物料：组件、容器、隐藏项都不在", () => {
    expect(listBlocks(METAS).map((m) => m.componentName)).toEqual([
      "SiteHeader",
      "AnnouncementBar",
      "PageLayout",
      "Mystery",
    ]);
  });

  it("每个宿主区块物料都在目录里登记了分类与缩略图", () => {
    for (const m of siteBlockMetas.filter((x) => x.group === BLOCKS_GROUP)) {
      expect(BLOCK_CATALOG, `${m.componentName} 未登记`).toHaveProperty(m.componentName);
    }
  });

  it("分类：全部在最前，按目录顺序，未登记的归「其他」垫底；分类不存在的区块仍可见", () => {
    const blocks = listBlocks(METAS);
    expect(categoriesOf(blocks)).toEqual(["全部", "页头", "公告", "布局", "其他"]);
    expect(categoryOf("Mystery")).toBe("其他");
    expect(filterBlocks(blocks, "全部", "").length).toBe(4);
    expect(filterBlocks(blocks, "其他", "").map((m) => m.componentName)).toEqual(["Mystery"]);
  });

  it("搜索按标题或组件名，与分类叠加", () => {
    const blocks = listBlocks(METAS);
    expect(filterBlocks(blocks, "全部", "头部").map((m) => m.componentName)).toEqual([
      "SiteHeader",
    ]);
    expect(filterBlocks(blocks, "全部", "announcement").map((m) => m.componentName)).toEqual([
      "AnnouncementBar",
    ]);
    expect(filterBlocks(blocks, "公告", "头部")).toEqual([]);
  });

  it("渲染：标题「区块」、缩略图卡片、分类标签；不含组件面板的东西", () => {
    const html = render();
    expect(html).toContain(">区块</h2>");
    expect(html).toContain('placeholder="搜索区块"');
    for (const name of ["SiteHeader", "AnnouncementBar", "PageLayout", "Mystery"]) {
      expect(html).toContain(`data-material="${name}"`);
    }
    expect(html).not.toContain('data-material="Button"');
    expect(html).not.toContain('data-material="Tabs"');
    expect(html).toContain(">页头</button>");
    expect(html.match(/role="img"/g)?.length).toBe(4);
  });

  it("没有区块时给空态，且不画分类标签", () => {
    const html = render([meta("Button", "按钮", "通用")]);
    expect(html).toContain("暂无区块");
    expect(html).not.toContain('role="tablist"');
  });

  it("登记：key 为 blocks、排在「组件」入口之后，且不与内置入口重名", () => {
    expect(blockLeftPanel.key).toBe("blocks");
    expect(blockLeftPanel.after).toBe("materials");
    expect(["tree", "materials", "datasource", "code", "schema"]).not.toContain(blockLeftPanel.key);
    expect(blockLeftPanel.component).toBe(BlockPanel);
  });
});

describe("区块面板分组标题", () => {
  it("按分类分节：顺序同分类标签，「其他」垫底，空分类不出节", () => {
    const sections = groupByCategory(listBlocks(METAS));
    expect(sections.map((s) => s.name)).toEqual(["页头", "公告", "布局", "其他"]);
    expect(sections.find((s) => s.name === "其他")?.items.map((m) => m.componentName)).toEqual([
      "Mystery",
    ]);
    expect(groupByCategory([])).toEqual([]);
  });

  it("「全部」下每个分类一个标题；选中分类后只剩那一节", () => {
    const html = render();
    for (const name of ["页头", "公告", "布局", "其他"]) {
      expect(html).toContain(`>${name}</h3>`);
    }
    const onlyOne = groupByCategory(filterBlocks(listBlocks(METAS), "公告", ""));
    expect(onlyOne.map((s) => s.name)).toEqual(["公告"]);
  });
});
