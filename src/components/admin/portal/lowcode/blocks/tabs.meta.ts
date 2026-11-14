import {
  type BlockMeta,
  LAYOUT_CONTAINER_GROUP,
  defineBlock,
  enumProp,
  numberProp,
  propOptions,
} from "./block-kit";
import {
  TABS_DEFAULTS as D,
  MAX_TABS,
  TABS_ALIGNS,
  TABS_ALIGN_LABEL,
  TABS_VARIANTS,
  TABS_VARIANT_LABEL,
  TAB_PANE_DEFAULT_TITLE,
} from "./tabs";

/**
 * Tabs：容器，只收 `TabPane`；默认带两页，用户继续往里拖「选项卡页」加页签。
 * TabPane：容器，只能放在 `Tabs` 里；标题就是页签文字。
 */
export const tabsMeta: BlockMeta = defineBlock({
  componentName: "Tabs",
  title: "选项卡",
  group: LAYOUT_CONTAINER_GROUP,
  props: {
    variant: enumProp("样式", "外观", D.variant, propOptions(TABS_VARIANTS, TABS_VARIANT_LABEL)),
    align: enumProp("页签对齐", "外观", D.align, propOptions(TABS_ALIGNS, TABS_ALIGN_LABEL)),
    defaultActive: numberProp("默认选中（第几个）", "行为", D.defaultActive, {
      min: 1,
      max: MAX_TABS,
    }),
  },
  configure: {
    component: { isContainer: true, nestingRule: { childWhitelist: ["TabPane"] } },
    supports: { style: true, condition: true, loop: false, events: [], textVariable: false },
  },
  defaultSchema: {
    componentName: "Tabs",
    props: { variant: D.variant, align: D.align, defaultActive: D.defaultActive },
    children: [1, 2].map((n) => ({
      componentName: "TabPane",
      props: { title: `${TAB_PANE_DEFAULT_TITLE} ${n}` },
      children: [],
    })),
  },
});

export const tabPaneMeta: BlockMeta = defineBlock({
  componentName: "TabPane",
  title: "选项卡页",
  group: LAYOUT_CONTAINER_GROUP,
  props: {
    title: {
      title: "页签标题",
      group: "内容",
      type: "string",
      defaultValue: TAB_PANE_DEFAULT_TITLE,
    },
  },
  configure: {
    component: { isContainer: true, nestingRule: { parentWhitelist: ["Tabs"] } },
    supports: { style: true, condition: true, loop: false, events: [], textVariable: false },
  },
  defaultSchema: {
    componentName: "TabPane",
    props: { title: TAB_PANE_DEFAULT_TITLE },
    children: [],
  },
});
