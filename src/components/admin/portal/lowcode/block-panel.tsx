/**
 * 区块面板：与「组件」平行的独立左侧面板（图标导航里单独一个入口）。
 *
 * 参考钉钉宜搭设计器的「区块模板」面板：标题 + 搜索 + 分类标签（chips）+ 缩略图卡片。
 * 组件是单个控件，区块是一整块页面结构（页头、公告、页面骨架），拖到画布上落的是
 * 该物料的 `defaultSchema`，所以拖拽仍走引擎的 `onDragStart(componentName, event)`。
 *
 * 区块 = 分组为 `BLOCKS_GROUP` 的物料。分类与缩略图由下面的 `BLOCK_CATALOG` 登记，
 * 没登记的区块归「其他」、用通用缩略图，不会丢。
 */
import * as React from "react";

import { LayoutPanelLeft } from "lucide-react";

import {
  AnnouncementThumb,
  GenericBlockThumb,
  PageLayoutThumb,
  SiteHeaderThumb,
} from "./block-thumbnails";
import { BLOCKS_GROUP } from "./blocks/block-kit";
import type { LowcodeLeftPanel, LowcodeMaterialMeta, LowcodeMaterialPanelProps } from "./engine";
import { PanelSearch, PanelTitleBar, useRegistryMetas } from "./panel-chrome";

const ALL = "全部";
const OTHER = "其他";

export interface BlockCatalogEntry {
  category: string;
  Thumb: () => React.JSX.Element;
}

export const BLOCK_CATALOG: Record<string, BlockCatalogEntry> = {
  SiteHeader: { category: "页头", Thumb: SiteHeaderThumb },
  AnnouncementBar: { category: "公告", Thumb: AnnouncementThumb },
  PageLayout: { category: "布局", Thumb: PageLayoutThumb },
};

export function categoryOf(componentName: string): string {
  return BLOCK_CATALOG[componentName]?.category ?? OTHER;
}

/** 区块物料：分组为 `BLOCKS_GROUP`，跳过隐藏项。 */
export function listBlocks(metas: readonly LowcodeMaterialMeta[]): LowcodeMaterialMeta[] {
  return metas.filter((meta) => meta.group === BLOCKS_GROUP && !meta.configure.component.hidden);
}

/** 当前出现过的分类（保持目录登记顺序，「其他」垫底），前面加「全部」。 */
export function categoriesOf(blocks: readonly LowcodeMaterialMeta[]): string[] {
  const present = new Set(blocks.map((meta) => categoryOf(meta.componentName)));
  const ordered = [...new Set(Object.values(BLOCK_CATALOG).map((entry) => entry.category))].filter(
    (category) => present.has(category),
  );
  if (present.has(OTHER)) ordered.push(OTHER);
  return [ALL, ...ordered];
}

export function filterBlocks(
  blocks: readonly LowcodeMaterialMeta[],
  category: string,
  keyword: string,
): LowcodeMaterialMeta[] {
  const query = keyword.trim().toLowerCase();
  return blocks.filter((meta) => {
    if (category !== ALL && categoryOf(meta.componentName) !== category) return false;
    if (!query) return true;
    return (
      meta.title.toLowerCase().includes(query) || meta.componentName.toLowerCase().includes(query)
    );
  });
}

export interface BlockSection {
  name: string;
  items: LowcodeMaterialMeta[];
}

/** 按分类分节，顺序与分类标签一致（目录登记顺序，「其他」垫底）；空分类不出节。 */
export function groupByCategory(blocks: readonly LowcodeMaterialMeta[]): BlockSection[] {
  return categoriesOf(blocks)
    .filter((name) => name !== ALL)
    .map((name) => ({
      name,
      items: blocks.filter((meta) => categoryOf(meta.componentName) === name),
    }));
}

export function BlockPanel({
  registry,
  onDragStart,
  pinned,
  onTogglePin,
  onClose,
}: LowcodeMaterialPanelProps) {
  const [keyword, setKeyword] = React.useState("");
  const [category, setCategory] = React.useState(ALL);
  const metas = useRegistryMetas(registry);

  const blocks = React.useMemo(() => listBlocks(metas), [metas]);
  const categories = React.useMemo(() => categoriesOf(blocks), [blocks]);
  // 分类被移除（物料卸载）时退回「全部」，别停在一个空分类上
  const activeCategory = categories.includes(category) ? category : ALL;
  const visible = React.useMemo(
    () => filterBlocks(blocks, activeCategory, keyword),
    [blocks, activeCategory, keyword],
  );
  const sections = React.useMemo(() => groupByCategory(visible), [visible]);

  return (
    <div className="min-h-full bg-white font-sans text-xs text-[#171a1d]">
      <div className="sticky top-0 z-10 border-b-[0.67px] border-[rgba(31,56,88,0.1)] bg-white pb-3">
        <PanelTitleBar title="区块" pinned={pinned} onTogglePin={onTogglePin} onClose={onClose} />
        <div className="px-3">
          <PanelSearch value={keyword} placeholder="搜索区块" onChange={setKeyword} />
        </div>
        {categories.length > 2 ? (
          <div className="mt-2.5 flex flex-wrap gap-x-1.5 gap-y-1.5 px-3" role="tablist">
            {categories.map((name) => {
              const active = name === activeCategory;
              return (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={
                    active
                      ? "h-5 rounded-xl bg-[rgba(0,102,255,0.12)] px-1.5 leading-5 text-[#0089ff]"
                      : "h-5 rounded-xl bg-[#eeeeef] px-1.5 leading-5 text-[rgba(24,28,31,0.6)] hover:bg-[#e5e6e8]"
                  }
                  onClick={() => setCategory(name)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-[#8f959e]">
          {keyword.trim() ? "无匹配区块" : "暂无区块"}
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.name} className="px-3 pt-6 pb-1 first-of-type:pt-2.5">
            <h3 className="text-xs leading-5 font-bold">{section.name}</h3>
            <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-3">
              {section.items.map((meta) => {
                const Thumb = BLOCK_CATALOG[meta.componentName]?.Thumb ?? GenericBlockThumb;
                return (
                  <li
                    key={meta.componentName}
                    data-material={meta.componentName}
                    title={`${meta.title} · ${meta.componentName}`}
                    className="group cursor-grab select-none active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      onDragStart(meta.componentName, event);
                    }}
                  >
                    <div className="h-[100px] overflow-hidden rounded-md border-[0.67px] border-[rgba(132,138,144,0.16)] bg-[#f5f6f8] group-hover:border-[#0089ff]">
                      <Thumb />
                    </div>
                    <div className="mt-1.5 truncate text-center leading-[18px] text-black/60">
                      {meta.title}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

/** 交给 `createEditor({ leftPanels })` 的登记：排在「组件」入口之后。模块级常量，引用稳定。 */
export const blockLeftPanel: LowcodeLeftPanel = {
  key: "blocks",
  label: "区块",
  icon: <LayoutPanelLeft size={20} strokeWidth={1.5} />,
  after: "materials",
  component: BlockPanel,
};
