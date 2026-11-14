import {
  ANNOUNCEMENT_ALIGNS,
  ANNOUNCEMENT_ALIGN_LABEL,
  ANNOUNCEMENT_APPEARANCES,
  ANNOUNCEMENT_APPEARANCE_LABEL,
  ANNOUNCEMENT_DEFAULTS as D,
} from "./announcement-bar";
import { type BlockMeta, defineBlock, enumProp, numberProp, propOptions } from "./block-kit";

export const announcementBarMeta: BlockMeta = defineBlock({
  componentName: "AnnouncementBar",
  title: "顶部公告",
  group: "业务区块",
  props: {
    text: { title: "公告文字", group: "内容", type: "string", defaultValue: D.text },
    href: { title: "跳转地址", group: "内容", type: "string", defaultValue: D.href },
    actionText: { title: "操作文字", group: "内容", type: "string", defaultValue: D.actionText },
    dismissible: { title: "可关闭", group: "内容", type: "bool", defaultValue: D.dismissible },

    appearance: enumProp(
      "外观",
      "外观",
      D.appearance,
      propOptions(ANNOUNCEMENT_APPEARANCES, ANNOUNCEMENT_APPEARANCE_LABEL),
    ),
    bgColor: {
      title: "背景颜色",
      group: "外观",
      type: "string",
      defaultValue: D.bgColor,
      setter: "ColorSetter",
    },
    textColor: {
      title: "文字颜色",
      group: "外观",
      type: "string",
      defaultValue: D.textColor,
      setter: "ColorSetter",
    },

    align: enumProp(
      "对齐方式",
      "布局",
      D.align,
      propOptions(ANNOUNCEMENT_ALIGNS, ANNOUNCEMENT_ALIGN_LABEL),
    ),
    height: numberProp("高度", "布局", D.height, { min: 24, max: 120, units: "px" }),
  },
  configure: {
    component: { isContainer: false },
    supports: { style: true, condition: true, loop: false, events: [], textVariable: false },
  },
  defaultSchema: {
    id: "announcement_bar_default",
    componentName: "AnnouncementBar",
    props: {
      text: D.text,
      href: D.href,
      actionText: D.actionText,
      appearance: D.appearance,
      dismissible: D.dismissible,
      align: D.align,
      height: D.height,
    },
  },
});
