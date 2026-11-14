/**
 * 业务物料的小工具集。
 *
 * 为什么不直接用引擎的 `defineMaterial` / `propOptions` / `pick`：
 * 引擎是私有源码、不一定在场（CI 用 `engine-unavailable.ts` 替身），业务物料包
 * 必须在引擎缺席时也能被 import、被测试。所以这里只依赖协议的**形状**，不依赖引擎运行时。
 * 形状与 `@lowcode-next/protocol` 的 `ComponentMeta` 对齐，引擎在场时结构兼容。
 */

export type BlockPropType = "string" | "number" | "bool" | "object" | "array";

export interface BlockPropOption {
  label: string;
  value: string | number | boolean;
}

export interface BlockPropMeta {
  title?: string;
  type?: BlockPropType;
  defaultValue?: unknown;
  options?: BlockPropOption[];
  group?: string;
  setter?:
    | string
    | { componentName: string; props?: Record<string, unknown>; initialValue?: unknown };
  supportVariable?: boolean;
}

export interface BlockMeta {
  componentName: string;
  title: string;
  group?: string;
  props: Record<string, BlockPropMeta>;
  configure: {
    component: {
      isContainer?: boolean;
      emptyPlaceholder?: boolean;
      hidden?: boolean;
      /** 具名插槽声明（引擎 DESIGN-v1 §14） */
      slots?: Array<{ name: string; title?: string; childWhitelist?: string[] }>;
      /** 嵌套约束（协议 `NestingRule`）：Tabs 只收 TabPane、TabPane 只进 Tabs */
      nestingRule?: { parentWhitelist?: string[]; childWhitelist?: string[] };
    };
    supports: {
      style?: boolean;
      condition?: boolean;
      loop?: boolean;
      events?: Array<string | { name: string; title?: string }>;
      textVariable?: boolean;
    };
  };
  defaultSchema?: Record<string, unknown>;
}

/** 与引擎 `propOptions` 同语义：枚举常量数组 → 面板选项。 */
export function propOptions(
  values: readonly (string | number)[],
  labels?: Record<string, string>,
): BlockPropOption[] {
  return values.map((value) => ({ label: labels?.[String(value)] ?? String(value), value }));
}

export function defineBlock(meta: BlockMeta): BlockMeta {
  if (!meta.componentName) throw new Error("defineBlock: 缺少 componentName");
  if (!meta.title) throw new Error(`defineBlock(${meta.componentName}): 缺少 title`);
  return meta;
}

export function numberProp(
  title: string,
  group: string,
  defaultValue: number,
  params: { min: number; max: number; step?: number; units?: string },
): BlockPropMeta {
  return {
    title,
    group,
    type: "number",
    defaultValue,
    setter: { componentName: "NumberSetter", props: params },
  };
}

export function radioProp(
  title: string,
  group: string,
  defaultValue: string,
  options: BlockPropOption[],
): BlockPropMeta {
  return { title, group, type: "string", defaultValue, options, setter: "RadioGroupSetter" };
}

/* ------------------------------------------------------------------ */
/* props 收口：schema 里的值不可信，坏数据退化成默认值而不是崩溃              */
/* ------------------------------------------------------------------ */

export type RawProps = Record<string, unknown>;

export function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function num(value: unknown, fallback: number, min?: number, max?: number): number {
  const parsed = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  let result = parsed;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}

export function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/**
 * 透传引擎注入的 `data-*` / `aria-*`。`data-node-id` 靠这一句落到 DOM，
 * 选中框与拖放命中都依赖它。
 */
export function passthrough(props: RawProps): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("data-") || key.startsWith("aria-")) output[key] = value;
  }
  return output;
}

const SAFE_URL = /^(https?:|mailto:|tel:|\/|#|\.{0,2}\/)/i;

/**
 * 链接只放行 http(s) / mailto / tel / 站内路径 / 锚点。
 * schema 可能来自手写 JSON 或旧数据，`javascript:` 之类的协议必须在渲染边界拦下。
 */
export function safeHref(value: unknown): string {
  const href = str(value).trim();
  if (!href) return "";
  if (SAFE_URL.test(href)) return href;
  // 没有协议的相对写法（`about`、`a/b`）；含冒号说明带了未知协议，丢弃。
  return href.includes(":") ? "" : href;
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 区块物料的 `group`：组件面板据此把它们排除，区块面板据此只收它们。 */
export const BLOCKS_GROUP = "业务区块";

/**
 * 选项卡等通用容器的 `group`，留在组件面板里。必须与引擎基础包里 `Div` 的分组同名（「布局」），
 * 否则面板里会并排出现两个相近的分组。
 */
export const LAYOUT_CONTAINER_GROUP = "布局";
