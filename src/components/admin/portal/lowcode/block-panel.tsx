/**
 * 区块面板：与「组件」平行的独立左侧面板（图标导航里单独一个入口）。
 *
 * 参考钉钉宜搭设计器的「区块模板」面板：标题 + 搜索 + 分类标签（chips）+ 缩略图卡片。
 * 组件是单个控件，区块是一整块页面结构（页头、公告、首屏）。
 *
 * **模板级**：数据来自 `BLOCK_TEMPLATES`（见 `block-template-catalog.ts`）。区块 = 原子组合：
 * 四套 Header、四套 Hero 的根节点都是基础原子 `Div`，里面是 Typography / Link / Image / Navbar
 * 等原子节点树。拖拽时把模板自己的 schema 随载荷交给引擎，落下的就是这棵标准节点树
 * （引擎为整棵子树换新 id），不改物料注册表、不留全局状态。
 *
 * 注册表只用来确认「这个物料在当前装配里存在」：没装配的物料，它的模板不展示。
 */
import * as React from "react";

import { LayoutPanelLeft } from "lucide-react";

import { GenericBlockThumb, resolveThumbnailSrc } from "./block-thumbnails";
import {
  BLOCK_TEMPLATES,
  filterBlockTemplates,
  listBlockCategories,
} from "./blocks/block-template-catalog";
import type { BlockTemplate } from "./blocks/block-template.types";
import type { LowcodeLeftPanel, LowcodeMaterialPanelProps } from "./engine";
import { PanelSearch, PanelTitleBar, useRegistryMetas } from "./panel-chrome";

const ALL = "全部";

export interface TemplateSection {
  name: string;
  items: BlockTemplate[];
}

/** 按分类分节，顺序与分类标签一致（目录里的分类顺序）；空分类不出节。 */
export function groupTemplatesByCategory(templates: readonly BlockTemplate[]): TemplateSection[] {
  return listBlockCategories(templates).map((name) => ({
    name,
    items: templates.filter((template) => template.category === name),
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

  // 模板对应的物料没装配进来就不展示，免得拖了没反应
  const available = React.useMemo(() => {
    const registered = new Set(metas.map((meta) => meta.componentName));
    return BLOCK_TEMPLATES.filter((template) => registered.has(template.componentName));
  }, [metas]);

  const categories = React.useMemo(() => [ALL, ...listBlockCategories(available)], [available]);
  // 分类被移除（物料卸载）时退回「全部」，别停在一个空分类上
  const activeCategory = categories.includes(category) ? category : ALL;
  const visible = React.useMemo(
    () =>
      filterBlockTemplates(available, {
        category: activeCategory === ALL ? undefined : activeCategory,
        keyword,
      }),
    [available, activeCategory, keyword],
  );
  const sections = React.useMemo(() => groupTemplatesByCategory(visible), [visible]);
  // 分组标题只在「全部」里出现；选中具体分类时标签本身已说明内容，不再重复
  const showHeadings = activeCategory === ALL;

  return (
    <div className="min-h-full bg-white font-sans text-xs text-[#171a1d]">
      <div className="sticky top-0 z-10 border-b-[0.67px] border-[rgba(31,56,88,0.1)] bg-white pb-3">
        <PanelTitleBar title="区块" pinned={pinned} onTogglePin={onTogglePin} onClose={onClose} />
        <div className="px-4">
          <PanelSearch value={keyword} placeholder="搜索区块" onChange={setKeyword} />
        </div>
        {categories.length > 2 ? (
          <div className="mt-2.5 flex flex-wrap gap-x-1.5 gap-y-1.5 px-4" role="tablist">
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
                      ? "h-5 cursor-pointer rounded-xl bg-[rgba(0,102,255,0.12)] px-1.5 leading-5 text-[#0089ff]"
                      : "h-5 cursor-pointer rounded-xl bg-[#eeeeef] px-1.5 leading-5 text-[rgba(24,28,31,0.6)] hover:bg-[#e5e6e8]"
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
          <section key={section.name} className="px-4 pt-6 pb-1 first-of-type:pt-2.5">
            {showHeadings ? <h3 className="text-xs leading-5 font-bold">{section.name}</h3> : null}
            <ul
              className={
                showHeadings
                  ? "mt-2 grid grid-cols-2 gap-x-3 gap-y-4"
                  : "grid grid-cols-2 gap-x-3 gap-y-4"
              }
            >
              {section.items.map((template) => {
                const thumbnailSrc = resolveThumbnailSrc(template.thumbnail);
                return (
                  <li
                    key={template.id}
                    data-template={template.id}
                    data-material={template.componentName}
                    title={`${template.name} · ${template.description}`}
                    className="group cursor-move select-none"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      // 模板自己的 schema 随载荷交给引擎；落下的仍是 `componentName` 这个物料
                      onDragStart(template.componentName, event, {
                        schema: template.schema as unknown as Record<string, unknown>,
                        label: template.name,
                      });
                    }}
                  >
                    <div className="aspect-video w-full overflow-hidden rounded-md border-[0.67px] border-[rgba(132,138,144,0.16)] bg-[#f5f6f8] transition-shadow group-hover:border-[#0089ff] group-hover:shadow-[0_2px_8px_rgba(0,137,255,0.16)]">
                      {thumbnailSrc ? (
                        <img
                          src={thumbnailSrc}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <GenericBlockThumb />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 leading-[18px]">
                      <span className="truncate text-left text-black/70">{template.name}</span>
                      {template.recommended ? (
                        <span className="shrink-0 rounded-sm bg-[rgba(0,102,255,0.12)] px-1 text-[10px] leading-4 text-[#0089ff]">
                          推荐
                        </span>
                      ) : null}
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
  width: 400,
  component: BlockPanel,
};
