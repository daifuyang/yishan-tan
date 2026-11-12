/**
 * lowcode-next 引擎的本地最小类型声明。
 *
 * 引擎（`~/workspace/study/lowcode-next`）的包全部是 private、未发布到 npm，
 * 本项目通过 Vite alias 以**源码形态**引入（见 `vite.config.ts`）。但 `tsc`
 * 不认识 alias，所以这里手写一份与引擎 API 对齐的类型声明：
 *
 * - 好处：`npm run typecheck` 不依赖引擎目录是否存在（CI / 部署机没有引擎也能过）。
 * - 代价：引擎改了签名，这里要跟着改。改动面只有 `createEditor` 的入参与
 *   `PageSchema` 两个结构，引擎侧稳定。
 *
 * 引擎侧对应实现：
 * - `packages/lowcode-react/src/editor.tsx` —— `createEditor` / `CreateEditorOptions`
 * - `packages/protocol/src/schema.ts` —— `PageSchema` / `parsePageSchema`
 * - `packages/materials-react/src/basic/index.ts` —— `basicReactMaterialPackage`
 */
declare module "@lowcode-next/protocol" {
  /** 页面节点。引擎的 NodeSchema 字段较多，这里只声明宿主会用到的部分。 */
  export interface LowcodeNodeSchema {
    id: string;
    componentName: string;
    title?: string;
    props?: Record<string, unknown>;
    children?: Array<LowcodeNodeSchema | string>;
    [key: string]: unknown;
  }

  /** 页面结构：引擎的 PageSchema，是本项目门户模板 `schema` 列的载荷。 */
  export interface LowcodePageSchema {
    version: string;
    componentsMap: Record<string, unknown>[];
    componentsTree: LowcodeNodeSchema;
    dataSource?: { list: Record<string, unknown>[] };
    meta?: Record<string, unknown>;
    state?: Record<string, unknown>;
    methods?: Record<string, string>;
    lifeCycles?: Record<string, string>;
    css?: string;
  }

  /** 校验并归一化页面结构；不合法时抛 `SchemaValidationError`。 */
  export function parsePageSchema(input: unknown): LowcodePageSchema;

  /** 示例页面（可解析通过）。宿主用它当「空白模板」的起始页。 */
  export const sampleSchema: LowcodePageSchema;
}

declare module "@lowcode-next/lowcode-react" {
  import type { LowcodePageSchema } from "@lowcode-next/protocol";

  /** 物料包：描述（meta）与实现（components）成对。 */
  export interface LowcodeMaterialPackage {
    meta?: {
      id?: string;
      title?: string;
      version?: string;
      metas?: unknown[];
    };
    components?: Record<string, unknown>;
  }

  export interface LowcodeCreateEditorOptions {
    /** 初始页面；必填，运行时过 `parsePageSchema` 校验。 */
    schema: LowcodePageSchema | Record<string, unknown>;
    /** 画布内边距，默认 20；整幅落地页可设 0。 */
    canvasPadding?: number;
    /** 文档 id；同时是引擎内部保存的 storage key。 */
    documentId?: string;
    /** 每次提交后回调（可用于自动保存 / 脏标记）。 */
    onSchemaChange?: (schema: LowcodePageSchema) => void;
    /** 保存出口：保存按钮 / Ctrl+S 时收到当前 schema；存到哪由宿主决定。 */
    onSave?: (schema: LowcodePageSchema) => void;
    /** 预览按钮的触发点；不传则按钮置灰。 */
    onPreview?: () => void;
    /** 物料包列表。 */
    packages?: LowcodeMaterialPackage[];
    /** 额外实现的组件（componentName → React 组件）。 */
    components?: Record<string, unknown>;
    /** 是否包含系统层物料（`Page` 根壳），默认 true。 */
    includeSystem?: boolean;
  }

  export interface LowcodeEditorHandle {
    destroy(): void;
    getSchema(): LowcodePageSchema;
    getDocument(): unknown;
  }

  /**
   * 在容器上挂载编辑器（自建 React root，宿主不要往容器里渲染 React 子节点）。
   */
  export function createEditor(
    container: string | HTMLElement,
    options: LowcodeCreateEditorOptions,
  ): LowcodeEditorHandle;
}

declare module "@lowcode-next/materials-react/basic" {
  import type { LowcodeMaterialPackage } from "@lowcode-next/lowcode-react";

  /** 引擎自带的基础物料（Button / Input / Div / Form 等 17 个组件）。 */
  export const basicReactMaterialPackage: LowcodeMaterialPackage;
}

declare module "@lowcode-next/render-react" {
  import type { LowcodePageSchema } from "@lowcode-next/protocol";
  import type { LowcodeMaterialPackage } from "@lowcode-next/lowcode-react";

  /**
   * 渲染态组件：把 PageSchema 渲染成 DOM（与编辑器共用渲染内核）。
   *
   * 宿主预览页用它渲染快照 —— 只 import 物料包与渲染组件，不引编辑器代码。
   */
  export interface LowcodeRenderProps {
    schema: LowcodePageSchema | Record<string, unknown>;
    /** 物料包列表。 */
    packages?: LowcodeMaterialPackage[];
    /** 额外实现的组件（componentName → React 组件）。 */
    components?: Record<string, unknown>;
    className?: string;
  }
  export function LowcodeRender(props: LowcodeRenderProps): import("react").ReactNode;
}
