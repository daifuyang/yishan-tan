import type {
  LowcodeCreateEditorOptions,
  LowcodeEditorHandle,
  LowcodeMaterialPackage,
  LowcodeToolbarContext,
  LowcodeToolbarItem,
} from "@lowcode-next/lowcode-react";
import type { LowcodePageSchema } from "@lowcode-next/protocol";
/**
 * lowcode-next 引擎接入层 —— 本项目里**唯一**接触引擎的模块。
 *
 * 引擎的包是 private、未发布到 npm，通过 Vite alias 以源码形态引入（见 vite.config.ts）。
 * 引擎的 Monaco 在模块作用域就摸 `self`（`designer-react/src/monaco-setup.ts`），
 * 在 Node 里 import 会直接抛 `self is not defined` —— 所以引擎**只能进浏览器**。
 *
 * 这里用 `createClientOnlyFn` 包一层：TanStack Start 的编译器会把 client-only 调用
 * 从 server 产物里剥掉，引擎的代码不会进 SSR bundle；调用点放在 `useEffect` 里，
 * 服务端渲染时根本不会执行。
 *
 * 注意不要用 `import '@tanstack/react-start/client-only'`：那个标记的语义是
 * 「**谁 import 这个文件**，服务器 import 就 build error」，而本项目
 * `src/routeTree.gen.ts` 是全量静态 import 所有路由，用它反而会让生产构建挂掉。
 */
import { createClientOnlyFn } from "@tanstack/react-start";

export type {
  LowcodeCreateEditorOptions,
  LowcodeEditorHandle,
  LowcodeMaterialPackage,
  LowcodePageSchema,
  LowcodeToolbarContext,
  LowcodeToolbarItem,
};

export interface LowcodeEngine {
  createEditor(container: HTMLElement, options: LowcodeCreateEditorOptions): LowcodeEditorHandle;
  parsePageSchema(input: unknown): LowcodePageSchema;
  /** 空白模板的起始页。 */
  sampleSchema: LowcodePageSchema;
  /** 引擎自带的基础物料包（Button / Input / Div / Form 等）。 */
  basicPackage: LowcodeMaterialPackage;
  /** 宿主定义的业务区块包（SiteHeader / AnnouncementBar），与基础包并列装配。 */
  packages: LowcodeMaterialPackage[];
}

const loadEngine = createClientOnlyFn(async (): Promise<LowcodeEngine> => {
  const [lowcode, protocol, materials, blocks] = await Promise.all([
    import("@lowcode-next/lowcode-react"),
    import("@lowcode-next/protocol"),
    import("@lowcode-next/materials-react/basic"),
    import("./blocks"),
  ]);
  return {
    createEditor: lowcode.createEditor,
    parsePageSchema: protocol.parsePageSchema,
    sampleSchema: protocol.sampleSchema,
    basicPackage: materials.basicReactMaterialPackage,
    packages: [materials.basicReactMaterialPackage, blocks.siteBlocksPackage],
  };
});

/** 加载引擎；只允许在浏览器（事件回调 / effect）里调用。 */
export function loadLowcodeEngine(): Promise<LowcodeEngine> {
  return loadEngine();
}
