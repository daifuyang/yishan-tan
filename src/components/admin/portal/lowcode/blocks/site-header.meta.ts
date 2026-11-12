/**
 * SiteHeader 物料描述。每个 prop 都有实现里同名的读取（见 `readSiteHeaderConfig`），
 * 枚举 options 来自同一份常量数组。
 *
 * 自包含：`isContainer` 缺省为 false，引擎不会允许往里拖入其它节点；
 * 导航 / 操作按钮用 array prop + 自定义 setter 配置，不暴露 JSON。
 */
import { type BlockMeta, defineBlock, numberProp, propOptions, radioProp } from "./block-kit";
import {
  ACTION_VARIANTS,
  ACTION_VARIANT_LABEL,
  SITE_HEADER_DEFAULTS as D,
  HEADER_APPEARANCES,
  HEADER_APPEARANCE_LABEL,
  HEADER_LAYOUTS,
  HEADER_LAYOUT_LABEL,
  LINK_TARGETS,
  LINK_TARGET_LABEL,
  MAX_ACTIONS,
  MAX_NAV_ITEMS,
  MAX_SUB_ITEMS,
  SITE_HEADER_DEFAULT_ACTIONS,
  SITE_HEADER_DEFAULT_NAV,
} from "./site-header.model";

const linkField = (name: string, title: string, important = false) => ({
  name,
  title,
  important,
  setter: "StringSetter",
});

const targetField = {
  name: "target",
  title: "打开方式",
  type: "string",
  defaultValue: "_self",
  options: propOptions(LINK_TARGETS, LINK_TARGET_LABEL),
  setter: "RadioGroupSetter",
};

const activeField = { name: "active", title: "设为当前", type: "bool", setter: "BoolSetter" };

/**
 * 导航菜单：ArraySetter + ObjectSetter（与 lowcode-engine-ext 同一套写法）。
 * `important` 的字段（名称、地址）直接显示在行内，其余点铅笔在弹层里编辑；
 * 二级菜单是对象里再嵌一个 ArraySetter，只支持一层。
 */
const NAV_ITEMS_SETTER = {
  componentName: "ArraySetter",
  props: {
    itemMaxLength: MAX_NAV_ITEMS,
    itemSetter: {
      componentName: "ObjectSetter",
      initialValue: { label: "新菜单", href: "", target: "_self" },
      props: {
        descriptor: "label",
        config: {
          items: [
            linkField("label", "菜单名称", true),
            linkField("href", "跳转地址", true),
            targetField,
            activeField,
            {
              name: "children",
              title: "二级菜单",
              type: "array",
              setter: {
                componentName: "ArraySetter",
                props: {
                  itemMaxLength: MAX_SUB_ITEMS,
                  itemSetter: {
                    componentName: "ObjectSetter",
                    initialValue: { label: "子菜单", href: "", target: "_self" },
                    props: {
                      descriptor: "label",
                      config: {
                        items: [
                          linkField("label", "菜单名称", true),
                          linkField("href", "跳转地址", true),
                          targetField,
                          activeField,
                        ],
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
  },
};

/** 操作按钮：最多两个（`itemMaxLength`），渲染边界还会再截一次。 */
const ACTIONS_SETTER = {
  componentName: "ArraySetter",
  props: {
    itemMaxLength: MAX_ACTIONS,
    itemSetter: {
      componentName: "ObjectSetter",
      initialValue: { label: "咨询", href: "", target: "_self", variant: "outline" },
      props: {
        descriptor: "label",
        config: {
          items: [
            linkField("label", "按钮文字", true),
            linkField("href", "跳转地址", true),
            {
              name: "variant",
              title: "按钮风格",
              type: "string",
              defaultValue: "text",
              options: propOptions(ACTION_VARIANTS, ACTION_VARIANT_LABEL),
              setter: "RadioGroupSetter",
            },
            targetField,
          ],
        },
      },
    },
  },
};

export const siteHeaderMeta: BlockMeta = defineBlock({
  componentName: "SiteHeader",
  title: "网站头部",
  group: "业务区块",
  props: {
    // 品牌
    logoSrc: { title: "Logo 图片地址", group: "品牌", type: "string", defaultValue: D.logoSrc },
    logoAlt: { title: "Logo 替代文本", group: "品牌", type: "string", defaultValue: D.logoAlt },
    brandText: { title: "品牌文字", group: "品牌", type: "string", defaultValue: D.brandText },
    brandHref: { title: "品牌链接", group: "品牌", type: "string", defaultValue: D.brandHref },
    logoWidth: numberProp("Logo 宽度", "品牌", D.logoWidth, { min: 16, max: 400, units: "px" }),
    showBrandText: {
      title: "显示品牌文字",
      group: "品牌",
      type: "bool",
      defaultValue: D.showBrandText,
    },

    // 导航
    navItems: {
      title: "导航菜单",
      group: "导航",
      type: "array",
      defaultValue: SITE_HEADER_DEFAULT_NAV,
      setter: NAV_ITEMS_SETTER,
      supportVariable: false,
    },
    activePath: {
      title: "当前页面路径",
      group: "导航",
      type: "string",
      defaultValue: D.activePath,
    },

    // 操作
    actions: {
      title: "操作按钮",
      group: "操作",
      type: "array",
      defaultValue: SITE_HEADER_DEFAULT_ACTIONS,
      setter: ACTIONS_SETTER,
      supportVariable: false,
    },

    // 布局
    layout: radioProp(
      "布局变体",
      "布局",
      D.layout,
      propOptions(HEADER_LAYOUTS, HEADER_LAYOUT_LABEL),
    ),
    maxWidth: numberProp("内容最大宽度", "布局", D.maxWidth, { min: 640, max: 2400, units: "px" }),
    height: numberProp("头部高度", "布局", D.height, { min: 40, max: 160, units: "px" }),

    // 外观
    appearance: radioProp(
      "外观模式",
      "外观",
      D.appearance,
      propOptions(HEADER_APPEARANCES, HEADER_APPEARANCE_LABEL),
    ),
    showBorder: { title: "底部边框", group: "外观", type: "bool", defaultValue: D.showBorder },

    // 行为
    sticky: { title: "吸顶", group: "行为", type: "bool", defaultValue: D.sticky },
    overlay: { title: "悬浮覆盖下方内容", group: "行为", type: "bool", defaultValue: D.overlay },
    mobileMenu: { title: "移动端导航", group: "行为", type: "bool", defaultValue: D.mobileMenu },
    mobileBreakpoint: numberProp("移动端断点", "行为", D.mobileBreakpoint, {
      min: 320,
      max: 1280,
      units: "px",
    }),
  },
  configure: {
    component: { isContainer: false },
    supports: { style: true, condition: true, loop: false, events: [], textVariable: false },
  },
  defaultSchema: {
    id: "site_header_default",
    componentName: "SiteHeader",
    props: {
      brandText: D.brandText,
      brandHref: D.brandHref,
      showBrandText: D.showBrandText,
      logoWidth: D.logoWidth,
      navItems: SITE_HEADER_DEFAULT_NAV,
      actions: SITE_HEADER_DEFAULT_ACTIONS,
      layout: D.layout,
      appearance: D.appearance,
      maxWidth: D.maxWidth,
      height: D.height,
      showBorder: D.showBorder,
      sticky: D.sticky,
      mobileMenu: D.mobileMenu,
      mobileBreakpoint: D.mobileBreakpoint,
    },
  },
});
