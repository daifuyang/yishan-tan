/**
 * 四套 Hero 模板：**原子组合**，不是一个整体物料。
 *
 * 每套都是一棵 `Div / Typography / Link / Image` 节点树，拖进画布后眉题、标题、描述、按钮、
 * 图片各是独立节点，可以单独选中、编辑、删除，也能再往里加元素（对标官方 antd 物料的 snippets）。
 * 样式直接写在节点 `style` 里，属性面板的样式编辑真实生效；响应式不用媒体查询：
 * `flex-wrap` + `flex-basis` 让左右两栏在窄屏自动上下堆叠，字号用 `clamp()`。
 *
 * 内容宽度：最外层容器带公共类 `lc-site-container`（1200px，见 `site-container.tsx`，
 * 与 Header / 公告条同一个），这里不写任何 max-width。
 *
 * 图片：不带地址，Image 原子为空时显示占位；选中它后在属性面板里上传 / 粘贴地址即可替换。
 * 链接：默认 `#` 占位，不虚构业务路由。
 */
import type { BlockTemplate, BlockTemplateNode } from "../block-template.types";
import { TOKEN, div, image, link, text } from "./atoms";

const COPY = {
  eyebrow: "AI SOFTWARE & DIGITAL SOLUTIONS",
  title: "用心打造专业的 AI 软件和产品",
  description:
    "以自研产品为核心，持续打造 AI 产品、SaaS 应用与行业解决方案，让复杂技术变成简单、实用、用得起的数字化工具。",
  primary: "探索产品",
  secondary: "解决方案",
} as const;

const SOFT_BLUE_GRADIENT = `linear-gradient(180deg, ${TOKEN.brandSoft} 0%, ${TOKEN.surface} 100%)`;
const DARK_GRADIENT = "linear-gradient(135deg, #0b1f4d 0%, #1d3f94 100%)";

const BUTTON = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 28px",
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.4,
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

type Tone = "light" | "dark";

const titleStyle = (tone: Tone, align?: "center") => ({
  fontSize: "clamp(32px, 4.6vw, 52px)",
  lineHeight: 1.15,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: tone === "dark" ? "#ffffff" : TOKEN.title,
  ...(align ? { textAlign: align } : {}),
});

const descriptionStyle = (tone: Tone, align?: "center") => ({
  fontSize: 17,
  lineHeight: 1.75,
  color: tone === "dark" ? "rgba(255,255,255,0.82)" : TOKEN.text,
  ...(align ? { textAlign: align } : {}),
});

const eyebrowStyle = (tone: Tone) => ({
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.12em",
  color: tone === "dark" ? "#8fb2ff" : TOKEN.brand,
});

function buttons(tone: Tone, justify: "flex-start" | "center" = "flex-start") {
  return div(
    { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: justify, marginTop: 8 },
    [
      link(
        COPY.primary,
        { ...BUTTON, background: TOKEN.brand, color: "#ffffff" },
        { title: "主按钮" },
      ),
      link(
        COPY.secondary,
        tone === "dark"
          ? { ...BUTTON, border: "1px solid rgba(255,255,255,0.5)", color: "#ffffff" }
          : {
              ...BUTTON,
              border: `1px solid ${TOKEN.line}`,
              color: TOKEN.title,
              background: TOKEN.surface,
            },
        { title: "次按钮" },
      ),
    ],
  );
}

/** 文案列：眉题 + 标题 + 描述 + 按钮。 */
function copyColumn(options: {
  tone: Tone;
  eyebrow?: string;
  basis: string;
  maxWidth: number;
  center?: boolean;
}): BlockTemplateNode {
  const { tone, basis, maxWidth, center } = options;
  const align = center ? "center" : undefined;
  return div(
    {
      flex: `1 1 ${basis}`,
      minWidth: 0,
      maxWidth,
      display: "flex",
      flexDirection: "column",
      alignItems: center ? "center" : "flex-start",
      gap: 20,
    },
    [
      text("caption", options.eyebrow ?? COPY.eyebrow, eyebrowStyle(tone), { title: "眉题" }),
      text("h1", COPY.title, titleStyle(tone, align), { title: "标题" }),
      text("body", COPY.description, descriptionStyle(tone, align), { title: "描述" }),
      buttons(tone, center ? "center" : "flex-start"),
    ],
    { title: "文案" },
  );
}

/** 图片：为空时是 Image 自带的占位；`aspectRatio` + `objectFit` 保证任何尺寸的图都不变形。 */
function picture(aspect: string, extra: Record<string, string | number> = {}): BlockTemplateNode {
  return image(
    "产品展示图",
    {
      width: "100%",
      aspectRatio: aspect,
      objectFit: "cover",
      minHeight: 0,
      background: `linear-gradient(135deg, ${TOKEN.brandSoft} 0%, #e6eeff 100%)`,
      border: "1px dashed #b7c9f3",
      color: "#6b83b8",
      fontSize: 14,
      ...extra,
    },
    { title: "主图" },
  );
}

const section = (
  style: Record<string, string | number>,
  children: BlockTemplateNode[],
): BlockTemplateNode =>
  div({ width: "100%", boxSizing: "border-box", ...style }, children, { title: "首屏" });

const container = (
  style: Record<string, string | number>,
  children: BlockTemplateNode[],
): BlockTemplateNode => div(style, children, { className: "lc-site-container", title: "内容容器" });

const row: Record<string, string | number> = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 48,
};
const VERTICAL_PADDING = "clamp(48px, 8vw, 96px)";

const split = (): BlockTemplateNode =>
  section({ padding: `${VERTICAL_PADDING} 0`, background: SOFT_BLUE_GRADIENT }, [
    container(row, [
      copyColumn({ tone: "light", basis: "420px", maxWidth: 560 }),
      div({ flex: "1 1 420px", minWidth: 0 }, [picture("4 / 3")], { title: "图片列" }),
    ]),
  ]);

const centered = (): BlockTemplateNode =>
  section({ padding: `${VERTICAL_PADDING} 0`, background: SOFT_BLUE_GRADIENT }, [
    container({ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 }, [
      copyColumn({ tone: "light", basis: "auto", maxWidth: 820, center: true }),
      div({ width: "100%", maxWidth: 1000 }, [picture("16 / 9")], { title: "图片列" }),
    ]),
  ]);

/**
 * 背景视觉：Image 作为背景层铺满（可在属性面板里上传替换），上面压一层深色渐变保证文字对比度。
 * 遮罩 `pointerEvents: none`，画布里点击仍然落在图片上。
 */
const background = (): BlockTemplateNode =>
  section(
    {
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      minHeight: 560,
      padding: `${VERTICAL_PADDING} 0`,
      background: DARK_GRADIENT,
    },
    [
      image(
        "背景图片",
        {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          minHeight: 0,
          border: "none",
          background: "transparent",
          color: "transparent",
        },
        { title: "背景图", radius: 0 },
      ),
      div(
        {
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "linear-gradient(90deg, rgba(11,31,77,0.88) 0%, rgba(11,31,77,0.55) 100%)",
        },
        [],
        { title: "遮罩" },
      ),
      container({ position: "relative" }, [
        copyColumn({ tone: "dark", basis: "420px", maxWidth: 640 }),
      ]),
    ],
  );

const product = (): BlockTemplateNode =>
  section({ padding: `${VERTICAL_PADDING} 0`, background: SOFT_BLUE_GRADIENT }, [
    container(row, [
      copyColumn({ tone: "light", basis: "380px", maxWidth: 480, eyebrow: "AI PRODUCT SUITE" }),
      div(
        { flex: "1.3 1 460px", minWidth: 0 },
        [
          picture("16 / 10", {
            boxShadow: "0 24px 64px rgba(36, 99, 235, 0.18)",
            border: `1px solid ${TOKEN.line}`,
          }),
        ],
        { title: "图片列" },
      ),
    ]),
  ]);

export const HERO_TEMPLATES: readonly BlockTemplate[] = [
  {
    id: "hero-split",
    name: "标准左右分栏",
    description: "左侧眉题、标题、描述与按钮，右侧大图；窄屏自动上下堆叠，官网默认首屏。",
    category: "首屏展示",
    componentName: "Div",
    thumbnail: "hero-split",
    tags: ["Hero", "首屏", "官网", "通用"],
    recommended: true,
    schema: split(),
  },
  {
    id: "hero-centered",
    name: "居中展示",
    description: "标题、描述、按钮居中，下方一张大图；适合发布型、品牌型页面。",
    category: "首屏展示",
    componentName: "Div",
    thumbnail: "hero-centered",
    tags: ["Hero", "首屏", "品牌", "发布"],
    schema: centered(),
  },
  {
    id: "hero-background",
    name: "背景视觉",
    description: "整幅背景图加深色遮罩，文字左对齐叠在上面；背景图在属性面板里替换。",
    category: "首屏展示",
    componentName: "Div",
    thumbnail: "hero-background",
    tags: ["Hero", "首屏", "沉浸", "视觉"],
    schema: background(),
  },
  {
    id: "hero-product",
    name: "产品展示",
    description: "左文右图，图片更大并带投影与描边，突出产品界面截图。",
    category: "首屏展示",
    componentName: "Div",
    thumbnail: "hero-product",
    tags: ["Hero", "首屏", "SaaS", "产品"],
    schema: product(),
  },
];
