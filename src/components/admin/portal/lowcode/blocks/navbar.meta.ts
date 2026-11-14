/**
 * Navbar 物料描述（对标官方 antd 物料的 `Menu`：数据驱动的 `items`，二级菜单即下拉）。
 *
 * 只管「菜单项 + 下拉 + 手机折叠」；外观（颜色、间距、字号）走 `style`，不在这里堆属性。
 * 手机折叠由所在页头的容器查询触发，`items` 之外只有一个 `activePath`。
 */
import { type BlockMeta, defineBlock, propOptions } from "./block-kit";
import {
  LINK_TARGETS,
  LINK_TARGET_LABEL,
  MAX_NAV_ITEMS,
  MAX_SUB_ITEMS,
  NAVBAR_DEFAULT_ITEMS,
} from "./navbar.model";

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
 * 菜单项：ArraySetter + ObjectSetter（与 lowcode-engine-ext 同一套写法）。
 * `important` 的字段（名称、地址）直接显示在行内，其余点铅笔在弹层里编辑；
 * 二级菜单是对象里再嵌一个 ArraySetter，只支持一层。
 */
const ITEMS_SETTER = {
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

export const navbarMeta: BlockMeta = defineBlock({
  componentName: "Navbar",
  title: "导航栏",
  group: "导航",
  props: {
    items: {
      title: "菜单项",
      group: "菜单",
      type: "array",
      defaultValue: NAVBAR_DEFAULT_ITEMS,
      setter: ITEMS_SETTER,
      supportVariable: false,
    },
    activePath: { title: "当前页面路径", group: "菜单", type: "string", defaultValue: "" },
    style: { title: "样式", group: "样式", type: "object" },
  },
  configure: {
    component: { isContainer: false },
    supports: { style: true, condition: true, loop: false, events: [], textVariable: false },
  },
  defaultSchema: {
    id: "navbar_default",
    componentName: "Navbar",
    props: { items: NAVBAR_DEFAULT_ITEMS },
  },
});
