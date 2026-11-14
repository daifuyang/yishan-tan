import { type BlockMeta, defineBlock } from "./block-kit";
import { PAGE_LAYOUT_DEFAULTS as D, PAGE_LAYOUT_SLOTS } from "./page-layout";

/**
 * PageLayout 物料描述。
 *
 * `slots` 声明三个具名槽（页头 / 正文 / 页脚）：拖入时引擎按声明生成 `Slot` 子节点，
 * 槽本身不可删除 / 移动 / 复制，页头槽用 `childWhitelist` 限定只能放公告条与网站头部。
 * 自身 `isContainer: false` —— 内容只能进槽。
 */
const SLOT_TITLES: Record<(typeof PAGE_LAYOUT_SLOTS)[number], string> = {
  header: "页头",
  main: "正文",
  footer: "页脚",
};

export const pageLayoutMeta: BlockMeta = defineBlock({
  componentName: "PageLayout",
  title: "页面布局",
  group: "业务区块",
  props: {
    stickyHeader: { title: "页头吸顶", group: "行为", type: "bool", defaultValue: D.stickyHeader },
    stickyFooter: {
      title: "页脚沉底",
      group: "行为",
      type: "bool",
      defaultValue: D.stickyFooter,
    },
    mainMaxWidth: {
      title: "正文最大宽度（0 不限）",
      group: "布局",
      type: "number",
      defaultValue: D.mainMaxWidth,
      setter: { componentName: "NumberSetter", props: { min: 0, max: 2400, units: "px" } },
    },
  },
  configure: {
    component: {
      isContainer: false,
      slots: PAGE_LAYOUT_SLOTS.map((name) => ({
        name,
        title: SLOT_TITLES[name],
        ...(name === "header" ? { childWhitelist: ["AnnouncementBar", "Div"] } : {}),
      })),
    },
    supports: { style: true, condition: false, loop: false, events: [], textVariable: false },
  },
  // 预置：三个槽都留空。页头 / 页脚是全站公共布局，由 SiteLayout 在加载时注入
  // （见 portal-content.layout.ts），新页面不再自带页头；槽节点由引擎按 slots 声明补出 id。
  defaultSchema: {
    componentName: "PageLayout",
    props: {},
    children: PAGE_LAYOUT_SLOTS.map((name) => ({
      componentName: "Slot",
      title: SLOT_TITLES[name],
      props: { name },
      children: [],
    })),
  },
});
