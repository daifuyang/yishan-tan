/**
 * 四套 Header 模板：**原子组合**，不是一个整体物料。
 *
 * 落到画布上是一棵 `Div / Typography / Link / Navbar` 节点树：品牌标识、导航栏、操作按钮各是
 * 独立节点，可以单独选中、改文案、删除。只有「导航下拉 + 手机折叠」带交互，由 `Navbar` 原子承担。
 *
 * 排布（标准 / 居中 / 极简 / 双层）与手机折叠由根节点的类名 `lc-sh--*` 配合 blocks.css 里的
 * 容器查询完成——媒体查询没法写进节点 `style`，所以这一块保留少量类名，节点上的 `style` 仍可覆盖。
 * 内容宽度走公共容器 `lc-site-container`（1200px，与 Hero、公告条同一个）。
 *
 * 链接约定：只有首页 `/` 是确定存在的路由；其余菜单与按钮的地址留空 / `#`，
 * 由站点管理员接入真实地址，避免把虚构的业务路由写进默认数据。联系电话 / 邮箱用保留的示例值。
 */
import type { BlockTemplate, BlockTemplateNode } from "../block-template.types";
import { div, link, navbar, text } from "./atoms";

type NavLeaf = { id: string; label: string; href: string; target: "_self" };
const leaf = (id: string, label: string, href = ""): NavLeaf => ({
  id,
  label,
  href,
  target: "_self",
});

const group = (id: string, label: string, children: NavLeaf[]) => ({
  id,
  label,
  href: "",
  target: "_self" as const,
  children,
});

/** 码上云官网的默认导航（标准 / 居中 / 双层三个模板共用）。 */
export const CODECLOUD_NAV = [
  { ...leaf("nav_home", "首页", "/"), active: true },
  group("nav_products", "产品中心", [
    leaf("nav_products_oss", "开源产品"),
    leaf("nav_products_ai", "AI 产品"),
    leaf("nav_products_saas", "SaaS 应用"),
  ]),
  group("nav_solutions", "解决方案", [
    leaf("nav_solutions_merchant", "商家数字化"),
    leaf("nav_solutions_enterprise", "企业数字化"),
    leaf("nav_solutions_ecosystem", "开源与 AI 生态"),
    leaf("nav_solutions_content", "AI 内容创作"),
  ]),
  group("nav_resources", "资源中心", [
    leaf("nav_resources_news", "产品动态"),
    leaf("nav_resources_articles", "技术文章"),
    leaf("nav_resources_guides", "使用指南"),
  ]),
  leaf("nav_about", "关于我们"),
];

/** 极简导航：导航数量刻意减少，只留四项，没有下拉。 */
export const MINIMAL_NAV = [
  { ...leaf("nav_product", "产品"), active: true },
  leaf("nav_docs", "文档"),
  leaf("nav_blog", "博客"),
  leaf("nav_about", "关于"),
];

const brand = (): BlockTemplateNode =>
  div(
    {},
    [
      text("body", "码", {}, { className: "lc-sh-brand-mark", title: "Logo 标识" }),
      link("码上云", {}, { href: "/", className: "lc-sh-brand-text", title: "品牌名" }),
      text("caption", "CodeCloud", {}, { className: "lc-sh-brand-sub", title: "品牌副标" }),
    ],
    { className: "lc-sh-brand", title: "品牌" },
  );

const action = (label: string, title: string): BlockTemplateNode =>
  link(label, {}, { className: "lc-sh-btn lc-sh-btn--primary", title });

const nav = (items: unknown[]): BlockTemplateNode => navbar(items, { title: "导航栏" });

const slot = (className: string, children: BlockTemplateNode[], title: string) =>
  div({}, children, { className, title });

const bar = (children: BlockTemplateNode[]): BlockTemplateNode =>
  div({}, children, { className: "lc-site-container lc-sh-inner", title: "主行" });

const header = (
  layout: string,
  children: BlockTemplateNode[],
  options: { border?: boolean } = {},
): BlockTemplateNode =>
  div({}, children, {
    className: `lc-sh lc-sh--${layout} lc-sh--light${options.border === false ? "" : " has-border"}`,
    title: "页头",
  });

const standard = () =>
  header("standard", [
    bar([
      slot("lc-sh-brand-slot", [brand()], "品牌区"),
      slot("lc-sh-middle", [nav(CODECLOUD_NAV)], "导航区"),
      slot("lc-sh-side lc-sh-side--end", [action("商务咨询", "操作按钮")], "操作区"),
    ]),
  ]);

const centered = () =>
  header("centered", [
    bar([
      slot("lc-sh-center", [brand()], "品牌区"),
      slot("lc-sh-side lc-sh-side--end", [action("商务咨询", "操作按钮")], "操作区"),
    ]),
    slot("lc-sh-subrow", [nav(CODECLOUD_NAV)], "导航行"),
  ]);

const minimal = () =>
  header(
    "minimal",
    [
      bar([
        slot("lc-sh-brand-slot", [brand()], "品牌区"),
        slot(
          "lc-sh-side lc-sh-side--end",
          [nav(MINIMAL_NAV), action("开始使用", "操作按钮")],
          "导航与操作区",
        ),
      ]),
    ],
    { border: false },
  );

const utilityItem = (content: string, title: string) =>
  text("caption", content, {}, { className: "lc-sh-util-item", title });

const twoRow = () =>
  header("two-row", [
    div(
      {},
      [
        div(
          {},
          [
            slot(
              "lc-sh-util-group",
              [
                utilityItem("400-000-0000", "联系电话"),
                utilityItem("contact@example.com", "联系邮箱"),
              ],
              "联系方式",
            ),
            slot(
              "lc-sh-util-group lc-sh-util-group--end",
              [
                link("帮助中心", {}, { className: "lc-sh-util-item", title: "帮助中心" }),
                link("合作伙伴", {}, { className: "lc-sh-util-item", title: "合作伙伴" }),
                utilityItem("中文", "语言"),
              ],
              "辅助链接",
            ),
          ],
          { className: "lc-site-container lc-sh-utility-inner", title: "辅助信息容器" },
        ),
      ],
      { className: "lc-sh-utility", title: "辅助信息栏" },
    ),
    bar([
      slot("lc-sh-brand-slot", [brand()], "品牌区"),
      slot("lc-sh-middle lc-sh-middle--start", [nav(CODECLOUD_NAV)], "导航区"),
      slot("lc-sh-side lc-sh-side--end", [action("商务咨询", "操作按钮")], "操作区"),
    ]),
  ]);

export const HEADER_TEMPLATES: readonly BlockTemplate[] = [
  {
    id: "header-standard",
    name: "标准导航",
    description: "Logo 居左、导航居中、操作居右；白底浅边框，适合大多数企业官网。",
    category: "页头",
    componentName: "Div",
    thumbnail: "header-standard",
    tags: ["Header", "官网", "企业", "通用"],
    recommended: true,
    schema: standard(),
  },
  {
    id: "header-centered",
    name: "居中品牌",
    description: "品牌居中、导航在下一行居中、操作居右；突出品牌形象，适合品牌型官网。",
    category: "页头",
    componentName: "Div",
    thumbnail: "header-centered",
    tags: ["Header", "品牌", "发布站"],
    schema: centered(),
  },
  {
    id: "header-minimal",
    name: "极简导航",
    description: "Logo 居左、导航与一个主操作居右；无边框无装饰，适合 AI 产品与 SaaS 站点。",
    category: "页头",
    componentName: "Div",
    thumbnail: "header-minimal",
    tags: ["Header", "SaaS", "AI", "开发者"],
    schema: minimal(),
  },
  {
    id: "header-two-row",
    name: "双层导航",
    description: "上层是联系电话 / 邮箱 / 帮助等辅助信息，下层是主导航；适合业务复杂的企业官网。",
    category: "页头",
    componentName: "Div",
    thumbnail: "header-two-row",
    tags: ["Header", "企业级", "辅助信息"],
    schema: twoRow(),
  },
];
