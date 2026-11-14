/**
 * 自定义物料面板（替换引擎内置的「组件库」布局，钉钉式简约风格）。
 *
 * 引擎通过 `createEditor({ materialPanel })` 把注册表订阅、拖拽起点、固定 / 关闭回调
 * 交进来（见 `LowcodeMaterialPanelProps`），这里只决定长相：
 * 加粗标题 + 圆角搜索框 + 无折叠的分组标题 + 两列「图标在左」的描边条目；
 * 传了 `tabs`（多于一个）时多一条灰底分段选项卡。
 *
 * 区块（`BLOCKS_GROUP`）不在这里：它们在独立的「区块」面板（见 `block-panel.tsx`）。
 *
 * 面板与引擎同处主文档（不在画布 iframe 里），所以可以用 Tailwind；
 * 但引擎自己 `createRoot`，拿不到宿主的 React 上下文，这里不依赖任何上下文。
 *
 * 条目数值取自钉钉宜搭设计器的实测：全面板 12px、条目高 33、圆角 6、
 * 细描边、图标 14px 与文字间距 8；悬停只把描边换成 #0089ff。
 */
import * as React from "react";

import { BLOCKS_GROUP } from "./blocks/block-kit";
import { COMPONENT_ICONS, FALLBACK_ICON } from "./component-icons";
import type { LowcodeMaterialMeta, LowcodeMaterialPanelProps, LowcodeMaterialTab } from "./engine";
import { PanelSearch, PanelTitleBar, useRegistryMetas } from "./panel-chrome";

export interface MaterialSection {
  name: string;
  items: LowcodeMaterialMeta[];
}

/** 物料归属哪个选项卡：命中 `groups` 的归它，否则归第一个没写 `groups` 的（兜底）。 */
export function tabKeyOf(tabs: readonly LowcodeMaterialTab[], group: string): string {
  const hit =
    tabs.find((tab) => tab.groups?.includes(group)) ?? tabs.find((tab) => !tab.groups) ?? tabs[0];
  return hit?.key ?? "";
}

/** 按 `group` 分节：跳过隐藏物料（页面壳 Page）与区块，并按关键词过滤。 */
export function groupMaterials(
  metas: readonly LowcodeMaterialMeta[],
  keyword: string,
): MaterialSection[] {
  const query = keyword.trim().toLowerCase();
  const sections = new Map<string, LowcodeMaterialMeta[]>();
  for (const meta of metas) {
    if (meta.configure.component.hidden || meta.group === BLOCKS_GROUP) continue;
    if (
      query &&
      !meta.title.toLowerCase().includes(query) &&
      !meta.componentName.toLowerCase().includes(query)
    ) {
      continue;
    }
    const name = meta.group ?? "其他";
    const bucket = sections.get(name);
    if (bucket) bucket.push(meta);
    else sections.set(name, [meta]);
  }
  return [...sections.entries()].map(([name, items]) => ({ name, items }));
}

export function MaterialPanel({
  registry,
  tabs,
  onDragStart,
  pinned,
  onTogglePin,
  onClose,
}: LowcodeMaterialPanelProps) {
  const [keyword, setKeyword] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<string | null>(null);
  const metas = useRegistryMetas(registry);

  const tabbed = tabs && tabs.length > 1 ? tabs : null;
  const currentTab = tabbed
    ? (tabbed.find((tab) => tab.key === activeTab) ?? tabbed[0])?.key
    : null;

  const matched = React.useMemo(() => groupMaterials(metas, keyword), [metas, keyword]);
  const sections = tabbed
    ? matched.filter((section) => tabKeyOf(tabbed, section.name) === currentTab)
    : matched;
  const searching = keyword.trim() !== "";

  const countOf = (key: string) =>
    matched
      .filter((section) => tabbed && tabKeyOf(tabbed, section.name) === key)
      .reduce((sum, section) => sum + section.items.length, 0);

  return (
    <div className="min-h-full bg-white font-sans text-xs text-[#171a1d]">
      <div className="sticky top-0 z-10 bg-white">
        <PanelTitleBar title="组件" pinned={pinned} onTogglePin={onTogglePin} onClose={onClose} />

        {tabbed ? (
          <div
            className="mx-3 flex h-7 items-center gap-0.5 rounded-md bg-[#e5e6e8] px-0.5"
            role="tablist"
          >
            {tabbed.map((tab) => {
              const active = tab.key === currentTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={
                    active
                      ? "flex h-6 flex-1 items-center justify-center rounded-md bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                      : "flex h-6 flex-1 items-center justify-center rounded-md text-black/60 hover:text-[#171a1d]"
                  }
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.title}
                  {searching ? (
                    <span className="ml-1 text-[#a9aeb8]">{countOf(tab.key)}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="border-b-[0.67px] border-[rgba(31,56,88,0.1)] p-3">
          <PanelSearch value={keyword} placeholder="搜索组件" onChange={setKeyword} />
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="px-4 py-10 text-center text-xs text-[#8f959e]">
          {searching ? "无匹配组件" : "暂无组件"}
        </p>
      ) : (
        sections.map((section) => (
          <section key={section.name} className="px-3 pt-6 pb-1 first-of-type:pt-2.5">
            <h3 className="text-xs leading-5 font-bold">{section.name}</h3>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {section.items.map((meta) => {
                const Icon = COMPONENT_ICONS[meta.componentName] ?? FALLBACK_ICON;
                return (
                  <li
                    key={meta.componentName}
                    data-material={meta.componentName}
                    title={`${meta.title} · ${meta.componentName}`}
                    className="flex h-[33px] cursor-grab select-none items-center rounded-md border-[0.67px] border-[rgba(132,138,144,0.16)] bg-white px-2 leading-[18px] hover:border-[#0089ff] active:cursor-grabbing"
                    onPointerDown={(event) => {
                      // 阻止默认的文本选中，否则拖动时整块面板会被刷蓝
                      event.preventDefault();
                      onDragStart(meta.componentName, event);
                    }}
                  >
                    <Icon className="mr-2 size-[14px] shrink-0" strokeWidth={1.5} aria-hidden />
                    <span className="truncate">{meta.title}</span>
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
