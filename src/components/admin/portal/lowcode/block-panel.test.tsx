// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BlockPanel, blockLeftPanel, groupTemplatesByCategory } from "./block-panel";
import { BLOCK_TEMPLATES } from "./blocks/block-template-catalog";
import type { LowcodeMaterialMeta, LowcodeMaterialPanelProps } from "./engine";

const meta = (componentName: string, title: string): LowcodeMaterialMeta => ({
  componentName,
  title,
  configure: { component: {} },
});

const ALL_METAS = [
  meta("Div", "容器"),
  meta("AnnouncementBar", "顶部公告"),
  meta("PageLayout", "页面布局"),
  meta("Button", "按钮"),
];

function setup(metas = ALL_METAS, overrides: Partial<LowcodeMaterialPanelProps> = {}) {
  const onDragStart = vi.fn();
  const registry = { list: () => metas, subscribe: () => () => {}, getVersion: () => 0 };
  const view = render(<BlockPanel registry={registry} onDragStart={onDragStart} {...overrides} />);
  return { onDragStart, ...view };
}

const cards = () => Array.from(document.querySelectorAll<HTMLElement>("li[data-template]"));
/** 页头 / Hero 模板的根节点都是基础原子 Div；按模板 id 前缀区分。 */
const headerCards = () => cards().filter((card) => card.dataset.template?.startsWith("header-"));
const rootClass = (schema: unknown) =>
  String((schema as { props: { className?: string } }).props.className ?? "");

describe("区块面板（模板级）", () => {
  it("一个物料多张卡片：四张 Header 模板都出现，且都落成基础原子 Div", () => {
    setup();
    const headers = headerCards();
    for (const card of headers) expect(card.dataset.material).toBe("Div");
    expect(headers.map((card) => card.dataset.template)).toEqual([
      "header-standard",
      "header-centered",
      "header-minimal",
      "header-two-row",
    ]);
    for (const name of ["标准导航", "居中品牌", "极简导航", "双层导航"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("每张卡片有自己的缩略图（四张 Header 缩略图是各自不同的图片）", () => {
    setup();
    const svgs = headerCards().map((card) => card.querySelector("img")?.getAttribute("src"));
    expect(svgs.every(Boolean)).toBe(true);
    expect(new Set(svgs).size).toBe(4);
  });

  it("缩略图区域是 16:9，名称左对齐；推荐模板带「推荐」标识", () => {
    setup();
    const standard = document.querySelector('li[data-template="header-standard"]') as HTMLElement;
    expect(standard.querySelector(".aspect-video")).not.toBeNull();
    expect(within(standard).getByText("推荐")).toBeInTheDocument();
    expect(within(standard).getByText("标准导航")).toHaveClass("text-left");
    const centered = document.querySelector('li[data-template="header-centered"]') as HTMLElement;
    expect(within(centered).queryByText("推荐")).toBeNull();
  });

  it("按下卡片开始拖拽：把该模板自己的 schema 随载荷交出去，物料名是基础原子 Div", () => {
    const { onDragStart } = setup();
    for (const id of ["header-standard", "header-centered", "header-minimal", "header-two-row"]) {
      const card = document.querySelector(`li[data-template="${id}"]`) as HTMLElement;
      fireEvent.pointerDown(card);
    }
    expect(onDragStart).toHaveBeenCalledTimes(4);
    const layouts = onDragStart.mock.calls.map(([name, , template]) => {
      expect(name).toBe("Div");
      expect((template.schema as { componentName: string }).componentName).toBe("Div");
      return rootClass(template.schema);
    });
    // 四次拖拽落下四种不同布局：同一个物料，不同模板
    expect(
      layouts.map((name) => /lc-sh--(standard|centered|minimal|two-row)/.exec(name)?.[1]),
    ).toEqual(["standard", "centered", "minimal", "two-row"]);
    expect(onDragStart.mock.calls.map(([, , template]) => template.label)).toEqual([
      "标准导航",
      "居中品牌",
      "极简导航",
      "双层导航",
    ]);
  });

  it("拖拽载荷里的 schema 就是目录里那份模板（引擎负责换新 id，这里不带 id）", () => {
    const { onDragStart } = setup();
    fireEvent.pointerDown(document.querySelector('li[data-template="header-two-row"]') as Element);
    const template = BLOCK_TEMPLATES.find((t) => t.id === "header-two-row");
    expect(onDragStart.mock.calls[0]?.[2].schema).toBe(template?.schema);
    // 节点本身不带 id（props 里导航项自己的 id 是业务数据，不是节点 id）
    expect(template?.schema).not.toHaveProperty("id");
  });

  it("没有装配进当前注册表的物料，它的模板不展示（拖了也没反应）", () => {
    setup([meta("AnnouncementBar", "顶部公告")]);
    expect(cards().map((card) => card.dataset.template)).toEqual(["announcement-default"]);
  });

  it("分类标签只展示有模板的分类；「全部」下按分类分节出标题，选中分类后不再出标题", async () => {
    const user = userEvent.setup();
    setup();
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["全部", "页头", "首屏展示", "产品展示"]);
    expect(Array.from(document.querySelectorAll("h3")).map((h) => h.textContent)).toEqual([
      "页头",
      "首屏展示",
      "产品展示",
    ]);

    await user.click(screen.getByRole("tab", { name: "首屏展示" }));
    expect(document.querySelectorAll("h3")).toHaveLength(0);
    expect(cards().every((card) => card.dataset.template?.startsWith("hero-"))).toBe(true);
  });

  it("搜索：按名称 / 标签 / 描述过滤；无结果给空态", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByPlaceholderText("搜索区块");
    await user.type(input, "极简");
    expect(cards().map((card) => card.dataset.template)).toEqual(["header-minimal"]);

    await user.clear(input);
    await user.type(input, "辅助信息");
    expect(cards().map((card) => card.dataset.template)).toEqual(["header-two-row"]);

    await user.clear(input);
    await user.type(input, "zzz不存在");
    expect(cards()).toHaveLength(0);
    expect(screen.getByText("无匹配区块")).toBeInTheDocument();
  });

  it("没有任何可用区块时给空态，且不画分类标签", () => {
    setup([meta("Button", "按钮")]);
    expect(screen.getByText("暂无区块")).toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("不影响基础组件：面板里没有组件面板的条目", () => {
    setup();
    expect(document.querySelector('[data-material="Button"]')).toBeNull();
  });

  it("有固定 / 关闭回调时才出按钮，并随 pinned 切换文案", () => {
    const first = setup();
    expect(screen.queryByLabelText("关闭")).toBeNull();
    first.unmount();
    setup(ALL_METAS, { pinned: true, onTogglePin: () => {}, onClose: () => {} });
    expect(screen.getByLabelText("取消固定")).toBeInTheDocument();
    expect(screen.getByLabelText("关闭")).toBeInTheDocument();
  });
});

describe("按分类分节 / 登记", () => {
  it("分节顺序同预设分类顺序，空分类不出节", () => {
    expect(groupTemplatesByCategory(BLOCK_TEMPLATES).map((s) => s.name)).toEqual([
      "页头",
      "首屏展示",
      "产品展示",
    ]);
    expect(groupTemplatesByCategory([])).toEqual([]);
  });

  it("登记：key 为 blocks、排在「组件」之后、宽 400，且不与内置入口重名", () => {
    expect(blockLeftPanel.key).toBe("blocks");
    expect(blockLeftPanel.after).toBe("materials");
    expect(blockLeftPanel.width).toBe(400);
    expect(["tree", "materials", "datasource", "code", "schema"]).not.toContain(blockLeftPanel.key);
    expect(blockLeftPanel.component).toBe(BlockPanel);
  });
});

describe("区块面板：Hero 首屏模板", () => {
  const heroCards = () => cards().filter((card) => card.dataset.template?.startsWith("hero-"));

  it("四张 Hero 卡片都出现，顺序固定，名称是规划里的中文名", () => {
    setup();
    expect(heroCards().map((card) => card.dataset.template)).toEqual([
      "hero-split",
      "hero-centered",
      "hero-background",
      "hero-product",
    ]);
    // 「产品展示」同时是一个分类名，所以按卡片取名称，不按全局文本取
    expect(heroCards().map((card) => card.getAttribute("title"))).toEqual([
      expect.stringContaining("标准左右分栏"),
      expect.stringContaining("居中展示"),
      expect.stringContaining("背景视觉"),
      expect.stringContaining("产品展示"),
    ]);
  });

  it("归入一级分类「首屏展示」：分类标签顺序为 页头 → 首屏展示 → 产品展示", () => {
    setup();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "全部",
      "页头",
      "首屏展示",
      "产品展示",
    ]);
    const headings = Array.from(document.querySelectorAll("h3")).map((h) => h.textContent);
    expect(headings).toEqual(["页头", "首屏展示", "产品展示"]);
  });

  it("选中「首屏展示」：只剩四张 Hero 卡片", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("tab", { name: "首屏展示" }));
    expect(cards().map((card) => card.dataset.template)).toEqual([
      "hero-split",
      "hero-centered",
      "hero-background",
      "hero-product",
    ]);
  });

  it("每张 Hero 卡片的缩略图都不同（四种真实布局）；16:9；只有标准左右分栏带「推荐」", () => {
    setup();
    const svgs = heroCards().map((card) => card.querySelector("img")?.getAttribute("src"));
    expect(svgs.every(Boolean)).toBe(true);
    expect(new Set(svgs).size).toBe(4);
    for (const card of heroCards()) expect(card.querySelector(".aspect-video")).not.toBeNull();
    const recommended = heroCards().filter((card) => card.textContent?.includes("推荐"));
    expect(recommended.map((card) => card.dataset.template)).toEqual(["hero-split"]);
  });

  it("每张卡片有名称 + 简短说明（悬浮提示里）", () => {
    setup();
    for (const card of heroCards()) {
      expect(card.getAttribute("title")).toMatch(/ · .{10,}/);
    }
  });

  it("搜索支持「Hero」「首屏」和模板名称", async () => {
    const user = userEvent.setup();
    setup();
    const input = screen.getByPlaceholderText("搜索区块");
    for (const [keyword, expected] of [
      ["Hero", ["hero-split", "hero-centered", "hero-background", "hero-product"]],
      ["首屏", ["hero-split", "hero-centered", "hero-background", "hero-product"]],
      ["居中展示", ["hero-centered"]],
      ["背景视觉", ["hero-background"]],
      [
        "产品展示",
        [
          "hero-product",
          "product-matrix-illustrated",
          "product-matrix-icon",
          "product-matrix-visual",
        ],
      ],
      ["标准左右分栏", ["hero-split"]],
    ] as const) {
      await user.clear(input);
      await user.type(input, keyword);
      expect(
        cards().map((card) => card.dataset.template),
        keyword,
      ).toEqual(expected);
    }
  });

  it("拖拽四张卡片：都是 Div 根节点，各自带自己的节点树与模板名", () => {
    const { onDragStart } = setup();
    for (const id of ["hero-split", "hero-centered", "hero-background", "hero-product"]) {
      fireEvent.pointerDown(document.querySelector(`li[data-template="${id}"]`) as Element);
    }
    expect(onDragStart).toHaveBeenCalledTimes(4);
    const trees = onDragStart.mock.calls.map(([name, , template]) => {
      expect(name).toBe("Div");
      expect((template.schema as { componentName: string }).componentName).toBe("Div");
      return JSON.stringify(template.schema);
    });
    // 四棵树互不相同，且都含标题 / 链接 / 图片三种原子
    expect(new Set(trees).size).toBe(4);
    for (const tree of trees) {
      for (const atom of ["Typography", "Link", "Image"]) expect(tree).toContain(`"${atom}"`);
    }
    expect(onDragStart.mock.calls.map(([, , template]) => template.label)).toEqual([
      "标准左右分栏",
      "居中展示",
      "背景视觉",
      "产品展示",
    ]);
  });

  it("基础原子 Div 没装配进注册表时，Header / Hero 模板都不展示，其它区块不受影响", () => {
    setup([meta("AnnouncementBar", "顶部公告")]);
    expect(heroCards()).toHaveLength(0);
    expect(headerCards()).toHaveLength(0);
    expect(cards().map((card) => card.dataset.template)).toEqual(["announcement-default"]);
  });
});
