/**
 * 模板里用的原子节点构造器：只是把 `{ componentName, props, children }` 写短一点，
 * 不引入任何新概念。区块 = 一棵原子节点树（Div / Typography / Link / Image / Navbar），
 * 落到画布后每个节点都是独立的、可单独选中编辑的标准物料节点。
 */
import type { BlockTemplateNode } from "../block-template.types";

type Style = Record<string, string | number>;
type Child = BlockTemplateNode | string;

/**
 * 设计令牌：写成 `var(--lc-*, 兜底值)`，换主题只改 blocks.css 里的变量，
 * 节点 style 里不出现写死的品牌色。
 */
export const TOKEN = {
  brand: "var(--lc-brand, #2463eb)",
  brandSoft: "var(--lc-brand-soft, #f5f8ff)",
  title: "var(--lc-title, #172b4d)",
  text: "var(--lc-text, #64748b)",
  surface: "var(--lc-surface, #ffffff)",
  line: "var(--lc-line, #e2e8f0)",
} as const;

export function div(
  style: Style,
  children: Child[],
  options: { className?: string; title?: string } = {},
): BlockTemplateNode {
  return {
    componentName: "Div",
    ...(options.title ? { title: options.title } : {}),
    props: { ...(options.className ? { className: options.className } : {}), style },
    children,
  };
}

export function text(
  type: "h1" | "h2" | "h3" | "h4" | "body" | "caption",
  content: string,
  style: Style = {},
  options: { className?: string; title?: string; props?: Record<string, unknown> } = {},
): BlockTemplateNode {
  return {
    componentName: "Typography",
    ...(options.title ? { title: options.title } : {}),
    props: {
      type,
      ...(options.className ? { className: options.className } : {}),
      ...options.props,
      style: { margin: 0, ...style },
    },
    children: [content],
  };
}

export function link(
  content: string,
  style: Style = {},
  options: { href?: string; className?: string; title?: string; target?: string } = {},
): BlockTemplateNode {
  return {
    componentName: "Link",
    ...(options.title ? { title: options.title } : {}),
    props: {
      // 没有确定存在的前台路由，默认只放占位 `#`，由站点管理员接入真实地址
      href: options.href ?? "#",
      ...(options.target ? { target: options.target } : {}),
      ...(options.className ? { className: options.className } : {}),
      style,
    },
    children: [content],
  };
}

export function image(
  alt: string,
  style: Style = {},
  options: { src?: string; title?: string; radius?: number } = {},
): BlockTemplateNode {
  return {
    componentName: "Image",
    ...(options.title ? { title: options.title } : {}),
    props: {
      ...(options.src ? { src: options.src } : {}),
      alt,
      radius: options.radius ?? 16,
      style,
    },
  };
}

export function navbar(
  items: unknown[],
  options: { style?: Style; title?: string } = {},
): BlockTemplateNode {
  return {
    componentName: "Navbar",
    ...(options.title ? { title: options.title } : {}),
    props: { items, ...(options.style ? { style: options.style } : {}) },
  };
}

/**
 * SectionHeader：区块顶部的「眉题 + 标题 + 描述」。各区块（产品矩阵、之后的方案 / 特性网格）共用，
 * 对齐方式由 `align` 决定；它只是一段原子节点，落到画布后三行文字各自可编辑。
 */
export function sectionHeader(options: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}): BlockTemplateNode {
  const align = options.align ?? "center";
  const items: BlockTemplateNode[] = [];
  if (options.eyebrow) {
    items.push(
      text(
        "caption",
        options.eyebrow,
        { fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", color: TOKEN.brand },
        { title: "顶部标签" },
      ),
    );
  }
  items.push(
    text(
      "h2",
      options.title,
      {
        fontSize: "clamp(26px, 3.4vw, 38px)",
        lineHeight: 1.25,
        fontWeight: 700,
        letterSpacing: "-0.01em",
        color: TOKEN.title,
      },
      { title: "标题" },
    ),
  );
  if (options.description) {
    items.push(
      text(
        "body",
        options.description,
        { fontSize: 16, lineHeight: 1.75, color: TOKEN.text, maxWidth: 720 },
        { title: "描述" },
      ),
    );
  }
  return div(
    {
      display: "flex",
      flexDirection: "column",
      alignItems: align === "center" ? "center" : "flex-start",
      textAlign: align,
      gap: 12,
      marginBottom: 48,
    },
    items,
    { title: "区块标题" },
  );
}
