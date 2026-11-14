/**
 * 三套「产品矩阵」模板：**原子组合**，同一份内容、三种视觉。
 *
 * 落到画布上是 `Div（区块）> SectionHeader + Div（卡片网格）> 卡片 × 3`，每张卡片是一组
 * `Div / Typography / Link / Image` 节点：选中卡片后在画布上复制 = 新增、删除 = 删除、拖动 = 排序，
 * 标题、描述、链接、图片各自在属性面板里编辑（图片用现成的 ImageSetter，不另做上传）。
 *
 * 响应式不用媒体查询：网格用 `repeat(auto-fit, minmax(min(100%, 320px), 1fr))`，
 * 1440 / 1280 三列，1024 / 768 两列，375 单列；同一行的卡片被网格拉成同高，
 * 卡片是纵向 flex，链接 `marginTop: auto` 沉到底，内容顶部与底部都对齐。
 *
 * 内容宽度走公共容器 `lc-site-container`（与 Header / Hero 同一个）；这里不写任何 max-width。
 * 产品矩阵是**产品分类**（开源 / AI / SaaS），不是精选产品列表：卡片里的「代表产品」只是一行说明。
 * 图片先留空显示占位；链接默认 `#`，不虚构业务路由。
 */
import type { BlockTemplate, BlockTemplateNode } from "../block-template.types";
import { TOKEN, div, image, link, sectionHeader, text } from "./atoms";

const SECTION = {
  eyebrow: "产品矩阵",
  title: "丰富的产品体系，满足多样化的业务需求",
  description: "覆盖开源产品、AI 产品与 SaaS 应用，助力个人、商家与企业实现数字化升级。",
} as const;

const CATEGORIES = [
  {
    mark: "开源",
    title: "开源产品",
    description: "提供高质量的开源软件与开发框架，打造开放、可扩展的技术生态。",
    products: "代表产品：移山 ZEROCMF",
  },
  {
    mark: "AI",
    title: "AI 产品",
    description: "面向内容创作、智能应用与生产力提升的 AI 工具，让 AI 更简单、更实用。",
    products: "代表产品：GenLabs",
  },
  {
    mark: "SaaS",
    title: "SaaS 应用",
    description: "面向商家与企业的数字化工具，覆盖经营管理、营销增长与协同办公。",
    products: "代表产品：码上点、移山 CRM",
  },
] as const;

type Category = (typeof CATEGORIES)[number];
type Style = Record<string, string | number>;

const MEDIA_GRADIENT = "linear-gradient(135deg, #f5f8ff 0%, #dce8ff 100%)";

/** 图标：品牌色圆角块 + 一小段文字标识（没有图标库依赖，文字可直接改）。 */
const iconTile = (category: Category, size: number): BlockTemplateNode =>
  div(
    {
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: Math.round(size / 4),
      background: "#e6eeff",
    },
    [
      text(
        "caption",
        category.mark,
        { fontSize: 13, fontWeight: 700, lineHeight: 1, color: TOKEN.brand },
        { title: "图标文字" },
      ),
    ],
    { title: "图标" },
  );

const cardTitle = (category: Category, fontSize: number): BlockTemplateNode =>
  text(
    "h3",
    category.title,
    { fontSize, lineHeight: 1.3, fontWeight: 700, color: TOKEN.title },
    { title: "卡片标题" },
  );

const cardDescription = (category: Category): BlockTemplateNode =>
  text(
    "body",
    category.description,
    { fontSize: 15, lineHeight: 1.75, color: TOKEN.text },
    { title: "卡片描述" },
  );

const cardProducts = (category: Category): BlockTemplateNode =>
  text("caption", category.products, { fontSize: 13, color: "#94a3b8" }, { title: "代表产品" });

const cardLink = (style: Style = {}): BlockTemplateNode =>
  link(
    "了解更多 →",
    {
      marginTop: "auto",
      paddingTop: 4,
      fontSize: 14,
      fontWeight: 600,
      color: TOKEN.brand,
      textDecoration: "none",
      ...style,
    },
    { title: "了解更多" },
  );

/** 图片：为空是占位（带图标和替换提示，见 blocks.css 的 `.lc-pm-card`）；比例固定、cover 不变形。 */
const media = (category: Category, aspect: string, style: Style = {}): BlockTemplateNode =>
  image(
    `${category.title}配图`,
    {
      width: "100%",
      aspectRatio: aspect,
      objectFit: "cover",
      minHeight: 0,
      background: MEDIA_GRADIENT,
      border: "none",
      color: "#6b83b8",
      fontSize: 13,
      ...style,
    },
    { title: "配图", radius: 0 },
  );

const row = (children: BlockTemplateNode[], gap = 12): BlockTemplateNode =>
  div({ display: "flex", alignItems: "center", gap }, children, { title: "标题行" });

const body = (children: BlockTemplateNode[]): BlockTemplateNode =>
  div({ display: "flex", flexDirection: "column", flex: 1, gap: 12, padding: 24 }, children, {
    title: "卡片内容",
  });

const card = (style: Style, children: BlockTemplateNode[], title: string): BlockTemplateNode =>
  div({ display: "flex", flexDirection: "column", minWidth: 0, ...style }, children, {
    className: "lc-pm-card",
    title,
  });

const grid = (cards: BlockTemplateNode[]): BlockTemplateNode =>
  div(
    {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
      gap: 24,
      alignItems: "stretch",
    },
    cards,
    { title: "卡片列表" },
  );

const section = (cards: BlockTemplateNode[], background: string): BlockTemplateNode =>
  div(
    { width: "100%", boxSizing: "border-box", padding: "clamp(56px, 7vw, 96px) 0", background },
    [
      div({}, [sectionHeader({ ...SECTION, align: "center" }), grid(cards)], {
        className: "lc-site-container",
        title: "内容容器",
      }),
    ],
    { title: "产品矩阵" },
  );

/** 模板 01：插画展示型——顶部大幅插画，下方图标 + 标题 + 描述 + 了解更多。 */
const illustrated = (): BlockTemplateNode =>
  section(
    CATEGORIES.map((category) =>
      card(
        {
          background: TOKEN.surface,
          border: `1px solid ${TOKEN.line}`,
          borderRadius: 12,
          overflow: "hidden",
        },
        [
          media(category, "16 / 9", {
            background: "linear-gradient(135deg, #eaf2ff 0%, #d6e5ff 100%)",
          }),
          body([
            row([iconTile(category, 40), cardTitle(category, 20)]),
            cardDescription(category),
            cardProducts(category),
            cardLink(),
          ]),
        ],
        category.title,
      ),
    ),
    TOKEN.surface,
  );

/** 模板 02：轻量图标型——紧凑，弱化边框，突出分类标题，底部一张小视觉。 */
const icon = (): BlockTemplateNode =>
  section(
    CATEGORIES.map((category) =>
      card(
        {
          gap: 16,
          padding: 24,
          background: TOKEN.surface,
          border: "1px solid #eef2f7",
          borderRadius: 12,
        },
        [
          row([iconTile(category, 44), cardTitle(category, 22)], 14),
          cardDescription(category),
          cardProducts(category),
          media(category, "21 / 9", { borderRadius: 10 }),
          cardLink({ marginTop: 0 }),
        ],
        category.title,
      ),
    ),
    TOKEN.surface,
  );

/** 模板 03：视觉强调型——浅色渐变卡片，较大的主题视觉，底部文字链接，不用阴影。 */
const visual = (): BlockTemplateNode =>
  section(
    CATEGORIES.map((category) =>
      card(
        {
          gap: 16,
          padding: 24,
          background: "linear-gradient(180deg, #f5f8ff 0%, #eaf1ff 100%)",
          border: "1px solid #e1eafb",
          borderRadius: 16,
        },
        [
          row([iconTile(category, 40), cardTitle(category, 20)]),
          cardDescription(category),
          cardProducts(category),
          media(category, "4 / 3", {
            borderRadius: 12,
            background: "linear-gradient(135deg, #ffffff 0%, #dbe7ff 100%)",
          }),
          cardLink(),
        ],
        category.title,
      ),
    ),
    "#f8fafc",
  );

const TAGS = ["ProductMatrix", "产品矩阵", "产品分类"];

export const PRODUCT_MATRIX_TEMPLATES: readonly BlockTemplate[] = [
  {
    id: "product-matrix-illustrated",
    name: "插画展示型",
    description: "三列等宽卡片，顶部大幅插画，下方图标、标题、描述与了解更多；官网首页默认方案。",
    category: "产品展示",
    componentName: "Div",
    thumbnail: "product-matrix-illustrated",
    tags: [...TAGS, "插画", "官网"],
    recommended: true,
    schema: illustrated(),
  },
  {
    id: "product-matrix-icon",
    name: "轻量图标型",
    description: "紧凑的三列卡片，弱化边框、突出分类标题，底部一张小型视觉；适合分类较多的首页。",
    category: "产品展示",
    componentName: "Div",
    thumbnail: "product-matrix-icon",
    tags: [...TAGS, "图标", "简洁"],
    schema: icon(),
  },
  {
    id: "product-matrix-visual",
    name: "视觉强调型",
    description: "浅色渐变卡片，中部较大的产品主题视觉，底部文字链接；适合科技、AI 产品官网。",
    category: "产品展示",
    componentName: "Div",
    thumbnail: "product-matrix-visual",
    tags: [...TAGS, "视觉", "AI", "科技"],
    schema: visual(),
  },
];
