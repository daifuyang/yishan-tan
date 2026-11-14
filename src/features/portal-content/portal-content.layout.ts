/**
 * 页面 Schema 的「组合 / 拆分」：把全站公共布局（页头 / 页脚）与页面正文拼成一份完整的
 * PageSchema，或反过来拆开存储。
 *
 * 数据归属（核心业务规则）：
 *
 * ```
 * PageLayout
 * ├── header ← SiteLayout（全站共享，所有页面同一份）
 * ├── main   ← Page（当前页面独有）
 * └── footer ← SiteLayout（全站共享）
 * ```
 *
 * - 页面持久化时**只保存 Main**；Header / Footer 在页面 Schema 里是两个空槽。
 * - 编辑器、预览、正式渲染都走同一对函数：`composePageSchema` 加载时拼接，
 *   `decomposePageSchema` 保存时拆开。三处结果一致，不会出现「编辑器里看到的和线上不一样」。
 *
 * 纯函数：无 IO、不依赖 React / 引擎 / 数据库；不修改入参（全部深拷贝后再改）。
 * 节点的类型只声明用到的结构（与引擎协议 `NodeSchema` 同形状），不 import 引擎包——
 * 引擎是未发布的私有源码，服务端和 CI 里不一定在场。
 */

export const PAGE_LAYOUT_COMPONENT = "PageLayout";
export const SLOT_COMPONENT = "Slot";
export const LAYOUT_SLOTS = ["header", "main", "footer"] as const;
export type LayoutSlotName = (typeof LAYOUT_SLOTS)[number];

/** 编辑器大纲里的槽名：页头 / 页脚明确标「全站共享」，正文标「当前页面」。 */
export const SHARED_SLOT_TITLES: Record<LayoutSlotName, string> = {
  header: "页头 · 全站共享",
  main: "正文 · 当前页面",
  footer: "页脚 · 全站共享",
};

/** 持久化进页面的槽名：不带共享标识（标识由组合时临时加上，不落库）。 */
export const PLAIN_SLOT_TITLES: Record<LayoutSlotName, string> = {
  header: "页头",
  main: "正文",
  footer: "页脚",
};

export interface SchemaNode {
  id: string;
  componentName: string;
  title?: string;
  props?: Record<string, unknown>;
  children?: Array<SchemaNode | string>;
  [key: string]: unknown;
}

export interface PageSchemaDoc {
  version: string;
  componentsTree: SchemaNode;
  [key: string]: unknown;
}

/** 公共布局的内容：页头 / 页脚各是一组节点（可以有多个，如公告条 + 网站头部）。 */
export interface SiteLayoutContent {
  header: SchemaNode[];
  footer: SchemaNode[];
}

/** `composePageSchema` 需要的公共布局来源：形状与 `PortalSiteLayoutDto` 对齐，取其中四个字段。 */
export interface SiteLayoutSource {
  draftHeader?: unknown;
  publishedHeader?: unknown;
  draftFooter?: unknown;
  publishedFooter?: unknown;
}

export type ComposeMode = "draft" | "published";

/* ------------------------------------------------------------------ */
/* 基础工具                                                            */
/* ------------------------------------------------------------------ */

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isSchemaNode(value: unknown): value is SchemaNode {
  return isRecord(value) && typeof value.id === "string" && typeof value.componentName === "string";
}

/** 只留合法节点；不是数组返回 null（区分「没有」和「空数组 = 有意清空」）。 */
function asNodes(value: unknown): SchemaNode[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(isSchemaNode);
}

function asPageSchemaDoc(value: unknown): PageSchemaDoc | null {
  if (!isRecord(value)) return null;
  const tree = value.componentsTree;
  if (!isSchemaNode(tree)) return null;
  return value as PageSchemaDoc;
}

function visit(node: SchemaNode, callback: (node: SchemaNode) => void): void {
  callback(node);
  for (const child of node.children ?? []) if (typeof child !== "string") visit(child, callback);
}

export function collectNodeIds(roots: readonly SchemaNode[]): string[] {
  const ids: string[] = [];
  for (const root of roots) visit(root, (node) => ids.push(node.id));
  return ids;
}

export function hasDuplicateIds(root: SchemaNode): boolean {
  const ids = collectNodeIds([root]);
  return new Set(ids).size !== ids.length;
}

/** 深度优先找第一个 `PageLayout` 节点（一个页面里应该只有一个）。 */
export function findPageLayout(root: SchemaNode): SchemaNode | null {
  let found: SchemaNode | null = null;
  const walk = (node: SchemaNode) => {
    if (found) return;
    if (node.componentName === PAGE_LAYOUT_COMPONENT) {
      found = node;
      return;
    }
    for (const child of node.children ?? []) if (typeof child !== "string") walk(child);
  };
  walk(root);
  return found;
}

function findSlot(layout: SchemaNode, name: LayoutSlotName): SchemaNode | null {
  for (const child of layout.children ?? []) {
    if (typeof child === "string") continue;
    if (child.componentName === SLOT_COMPONENT && child.props?.name === name) return child;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 稳定序列化 / 比较                                                    */
/* ------------------------------------------------------------------ */

/** key 排序后的 JSON：同一份数据不论键的书写顺序都得到同一串，用来判断「有没有改」。 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** 去掉所有节点 id 之后的指纹：同一个页头在不同页面里 id 不同，但内容相同时指纹一致。 */
export function nodesFingerprint(nodes: readonly SchemaNode[]): string {
  const strip = (node: SchemaNode): unknown => {
    const { id: _id, children, ...rest } = node;
    return {
      ...rest,
      children: (children ?? []).map((child) => (typeof child === "string" ? child : strip(child))),
    };
  };
  return stableStringify(nodes.map(strip));
}

/** 两份公共布局内容是否一致（含 id：编辑器里改了就会变，没改就逐字节一致）。 */
export function siteLayoutEquals(a: SiteLayoutContent, b: SiteLayoutContent): boolean {
  return stableStringify(a) === stableStringify(b);
}

/* ------------------------------------------------------------------ */
/* 空白页                                                              */
/* ------------------------------------------------------------------ */

function slotNode(id: string, name: LayoutSlotName): SchemaNode {
  return {
    id,
    componentName: SLOT_COMPONENT,
    title: PLAIN_SLOT_TITLES[name],
    props: { name },
    children: [],
  };
}

/**
 * 新页面的起始结构：一个 `PageLayout`，三个槽都是空的。
 * 页头 / 页脚由 SiteLayout 在加载时注入，所以新页面不再各自生成一份 Header。
 */
export function blankPageSchema(): PageSchemaDoc {
  return {
    version: "1.0.0",
    componentsMap: [],
    componentsTree: {
      id: "root",
      componentName: "Page",
      props: {},
      children: [
        {
          id: "page_layout",
          componentName: PAGE_LAYOUT_COMPONENT,
          props: {},
          children: [
            slotNode("page_slot_header", "header"),
            slotNode("page_slot_main", "main"),
            slotNode("page_slot_footer", "footer"),
          ],
        },
      ],
    },
  };
}

/* ------------------------------------------------------------------ */
/* 组合                                                                */
/* ------------------------------------------------------------------ */

/** 按模式从来源里取页头 / 页脚：草稿优先、没有草稿用已发布；已发布模式只看已发布。 */
export function resolveSiteLayout(source: SiteLayoutSource, mode: ComposeMode): SiteLayoutContent {
  const pick = (draft: unknown, published: unknown): SchemaNode[] => {
    const publishedNodes = asNodes(published);
    if (mode === "published") return publishedNodes ?? [];
    return asNodes(draft) ?? publishedNodes ?? [];
  };
  return {
    header: pick(source.draftHeader, source.publishedHeader),
    footer: pick(source.draftFooter, source.publishedFooter),
  };
}

/** 让 `base` 在 `taken` 里不重复：加后缀 `_p1`、`_p2`…，结果确定（同样输入同样输出）。 */
function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let index = 1;
  while (taken.has(`${base}_p${index}`)) index += 1;
  return `${base}_p${index}`;
}

function ensureSlot(layout: SchemaNode, name: LayoutSlotName, taken: Set<string>): SchemaNode {
  const existing = findSlot(layout, name);
  if (existing) return existing;
  // 槽缺失（手写 JSON / 旧数据）：补上，并放在规范位置（页头最前、页脚最后、正文在页脚之前）
  const created = slotNode(uniqueId(`page_slot_${name}`, taken), name);
  taken.add(created.id);
  const children = layout.children ?? [];
  if (name === "header") children.unshift(created);
  else if (name === "main") {
    const footerIndex = children.findIndex(
      (child) => typeof child !== "string" && child.props?.name === "footer",
    );
    children.splice(footerIndex >= 0 ? footerIndex : children.length, 0, created);
  } else children.push(created);
  layout.children = children;
  return created;
}

/**
 * 组合：公共页头 + 页面正文 + 公共页脚 → 完整 PageSchema（编辑器 / 预览 / 正式渲染共用）。
 *
 * - 页面里没有 `PageLayout`（旧的扁平页面）：原样返回，不注入任何东西。
 * - 公共布局某一块是空的：保留页面槽里自带的节点，不会把旧数据吞掉
 *   （迁移之前的页面、或还没初始化公共布局时的退路）。
 * - 注入的节点 id 与页面节点冲突时，改的是页面一侧的 id（确定性后缀），公共布局的 id 保持稳定，
 *   否则每次加载 id 都在变，公共布局会被误判成「被修改过」。
 * - 槽标题加「全站共享 / 当前页面」，大纲里能分清哪些改了会影响全站。标题不落库（拆分时还原）。
 */
export function composePageSchema(input: {
  siteLayout: SiteLayoutSource;
  pageMainSchema: unknown;
  mode: ComposeMode;
}): PageSchemaDoc {
  const base = asPageSchemaDoc(input.pageMainSchema) ?? blankPageSchema();
  const schema = clone(base);
  const layout = findPageLayout(schema.componentsTree);
  if (!layout) return schema;

  const injected = resolveSiteLayout(input.siteLayout, input.mode);
  const taken = new Set(collectNodeIds([schema.componentsTree]));

  const headerSlot = ensureSlot(layout, "header", taken);
  const mainSlot = ensureSlot(layout, "main", taken);
  const footerSlot = ensureSlot(layout, "footer", taken);

  // 先把页面一侧与公共节点撞 id 的节点改名，再注入公共节点
  const sharedIds = new Set(collectNodeIds([...injected.header, ...injected.footer]));
  if (sharedIds.size > 0) {
    const used = new Set([...taken, ...sharedIds]);
    visit(schema.componentsTree, (node) => {
      if (!sharedIds.has(node.id)) return;
      // 注入前页面一侧还没有这些公共节点，所以命中的都是页面自己的节点
      node.id = uniqueId(node.id, used);
      used.add(node.id);
    });
  }

  if (injected.header.length > 0) headerSlot.children = clone(injected.header);
  if (injected.footer.length > 0) footerSlot.children = clone(injected.footer);

  headerSlot.title = SHARED_SLOT_TITLES.header;
  mainSlot.title = SHARED_SLOT_TITLES.main;
  footerSlot.title = SHARED_SLOT_TITLES.footer;
  return schema;
}

/* ------------------------------------------------------------------ */
/* 拆分                                                                */
/* ------------------------------------------------------------------ */

export interface DecomposedPage {
  /** 页面要持久化的 Schema：页头 / 页脚槽是空的，只剩正文。 */
  mainSchema: PageSchemaDoc;
  /** 编辑器里页头槽的节点；页面没有 `PageLayout`（扁平页面）时是 null，表示「不归公共布局管」。 */
  header: SchemaNode[] | null;
  footer: SchemaNode[] | null;
  hasLayout: boolean;
}

/**
 * 拆分：完整 PageSchema → 页面正文 + 公共页头 + 公共页脚。
 * 与 `composePageSchema` 互逆：`compose(decompose(x))` 还原出 `x`（槽标题除外，那是组合时临时加的）。
 */
export function decomposePageSchema(full: unknown): DecomposedPage {
  const base = asPageSchemaDoc(full);
  if (!base) throw new Error("decomposePageSchema: 不是合法的 PageSchema");
  const schema = clone(base);
  const layout = findPageLayout(schema.componentsTree);
  if (!layout) return { mainSchema: schema, header: null, footer: null, hasLayout: false };

  const take = (name: LayoutSlotName): SchemaNode[] => {
    const slot = findSlot(layout, name);
    if (!slot) return [];
    const nodes = (slot.children ?? []).filter(isSchemaNode);
    slot.children = [];
    return nodes;
  };
  const header = take("header");
  const footer = take("footer");

  // 还原槽标题：「全站共享」标识只在内存里，不写进页面
  for (const name of LAYOUT_SLOTS) {
    const slot = findSlot(layout, name);
    if (slot) slot.title = PLAIN_SLOT_TITLES[name];
  }
  return { mainSchema: schema, header, footer, hasLayout: true };
}

/* ------------------------------------------------------------------ */
/* 迁移辅助                                                            */
/* ------------------------------------------------------------------ */

/** 返回一份把指定槽的子节点换掉的拷贝（槽不存在或没有 PageLayout 时原样返回拷贝）。 */
export function withSlotChildren(
  page: PageSchemaDoc,
  name: LayoutSlotName,
  nodes: readonly SchemaNode[],
): PageSchemaDoc {
  const schema = clone(page);
  const layout = findPageLayout(schema.componentsTree);
  const slot = layout ? findSlot(layout, name) : null;
  if (slot) slot.children = clone([...nodes]);
  return schema;
}
