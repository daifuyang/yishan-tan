import { announcementBarMeta } from "./announcement-bar.meta";
/**
 * 业务区块模板目录（BlockTemplateCatalog）：区块面板的数据来源。
 *
 * 目录是**模板级**的：区块 = 原子组合，模板是一棵 Div / Typography / Link / Image / Navbar
 * 节点树，每张卡片拖入时落下自己的初始 schema。模板之间只靠 `id` 区分，不靠 `componentName`。
 *
 * 新增一类区块（Feature / ProductGrid / SiteFooter…）只需要：
 * 1. 用 `block-templates/atoms.ts` 的构造器写它的节点树，
 * 2. 在这里登记它的模板，
 * 3. 在 `blocks/thumbnails/` 里放一张同名的 16:9 缩略图（svg / png / webp）。
 * 只有带交互的部分（如 Navbar 的下拉）才需要新物料；不需要改引擎，也不需要改面板。
 */
import type { BlockTemplate, BlockTemplateNode } from "./block-template.types";
import { HEADER_TEMPLATES } from "./block-templates/header-templates";
import { HERO_TEMPLATES } from "./block-templates/hero-templates";
import { PRODUCT_MATRIX_TEMPLATES } from "./block-templates/product-matrix-templates";

/** 面板里的分类顺序。只有「至少有一个模板」的分类才会展示。 */
export const BLOCK_CATEGORIES = [
  "页头",
  "首屏展示",
  "产品展示",
  "内容展示",
  "营销转化",
  "互动组件",
] as const;

/**
 * 物料的 `defaultSchema`（带示例 id）→ 模板节点（不含 id）。
 * 公告条 / 页面布局的模板直接取自各自物料的默认值，物料默认值是唯一来源。
 */
export function toTemplateNode(source: Record<string, unknown> | undefined): BlockTemplateNode {
  const strip = (node: Record<string, unknown>): BlockTemplateNode => {
    const { id: _id, children, ...rest } = node;
    const next = { ...rest } as unknown as BlockTemplateNode;
    if (Array.isArray(children)) {
      next.children = children.map((child) =>
        typeof child === "string" ? child : strip(child as Record<string, unknown>),
      );
    }
    return next;
  };
  return strip(source ?? { componentName: "Unknown" });
}

/**
 * 把模板实例化成带 id 的节点树（给「不经过拖拽、直接写进页面 / 公共布局」的场景用，
 * 比如公共布局还没初始化时的默认页头）。拖拽插入时 id 由引擎生成，不走这里。
 * id 按深度优先顺序编号：`<prefix>`、`<prefix>_1`、`<prefix>_2`…，同一模板每次得到同一份，
 * 两个人同时打开也是同一个起点。
 */
export function instantiateTemplate(
  template: BlockTemplate,
  idPrefix: string,
): Record<string, unknown> {
  let counter = 0;
  const build = (node: BlockTemplateNode): Record<string, unknown> => {
    const id = counter === 0 ? idPrefix : `${idPrefix}_${counter}`;
    counter += 1;
    const { children, ...rest } = node;
    return {
      id,
      ...rest,
      ...(children
        ? { children: children.map((child) => (typeof child === "string" ? child : build(child))) }
        : {}),
    };
  };
  return build(template.schema);
}

const ANNOUNCEMENT_TEMPLATES: readonly BlockTemplate[] = [
  {
    id: "announcement-default",
    name: "顶部公告",
    description: "页面最上方的一行公告条，可带操作链接，可关闭。",
    category: "页头",
    componentName: "AnnouncementBar",
    thumbnail: "announcement-default",
    tags: ["公告", "通知"],
    schema: toTemplateNode(announcementBarMeta.defaultSchema),
  },
];

export const BLOCK_TEMPLATES: readonly BlockTemplate[] = [
  ...HEADER_TEMPLATES,
  ...HERO_TEMPLATES,
  ...PRODUCT_MATRIX_TEMPLATES,
  ...ANNOUNCEMENT_TEMPLATES,
];

export function getBlockTemplate(id: string): BlockTemplate | undefined {
  return BLOCK_TEMPLATES.find((template) => template.id === id);
}

/** 目录里实际出现过的分类（保持 `BLOCK_CATEGORIES` 的顺序，不展示空分类）。 */
export function listBlockCategories(
  templates: readonly BlockTemplate[] = BLOCK_TEMPLATES,
): string[] {
  const present = new Set(templates.map((template) => template.category));
  return BLOCK_CATEGORIES.filter((category) => present.has(category));
}

/** 按分类、关键词（名称 / 描述 / 分类 / 标签）筛模板；`category` 为空表示全部。 */
export function filterBlockTemplates(
  templates: readonly BlockTemplate[],
  options: { category?: string; keyword?: string },
): BlockTemplate[] {
  const query = (options.keyword ?? "").trim().toLowerCase();
  return templates.filter((template) => {
    if (options.category && template.category !== options.category) return false;
    if (!query) return true;
    const haystack = [
      template.name,
      template.description,
      template.category,
      ...(template.tags ?? []),
    ]
      .join("\n")
      .toLowerCase();
    return haystack.includes(query);
  });
}
