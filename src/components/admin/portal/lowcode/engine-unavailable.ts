/**
 * 引擎缺席时的替身。
 *
 * lowcode-next 是**未发布**的私有 monorepo，Vite alias 找不到它时（CI、部署机、
 * 同事的机器没有这份源码）就把 `@lowcode-next/*` 全部指到这里 —— 这样
 * `npm run build` 依然能过，只是设计页给出一句人话提示，而不是构建报错。
 *
 * 一个文件同时扮演三个模块（protocol / lowcode-react / materials-react/basic），
 * 因为 Vite alias 是按模块 id 映射的，指向同一个文件最省事。
 */

/** 引擎的页面结构（此处只用于类型标注）。 */
interface UnavailablePageSchema {
  version: string;
  componentsMap: Record<string, unknown>[];
  componentsTree: { id: string; componentName: string };
}

const UNAVAILABLE_PAGE: UnavailablePageSchema = {
  version: "1.0.0",
  componentsMap: [],
  componentsTree: { id: "root", componentName: "Page" },
};

/** 引擎缺失时不做校验，原样返回。 */
export function parsePageSchema(input: unknown): UnavailablePageSchema {
  if (input && typeof input === "object") {
    return input as UnavailablePageSchema;
  }
  return UNAVAILABLE_PAGE;
}

export const sampleSchema: UnavailablePageSchema = UNAVAILABLE_PAGE;

export const basicReactMaterialPackage = {
  meta: { id: "@lowcode-next/materials-react", title: "基础物料（不可用）", version: "0.0.0" },
  components: {},
};

export interface UnavailableEditorHandle {
  destroy(): void;
  getSchema(): UnavailablePageSchema;
  getDocument(): unknown;
}

/** 往容器里写一句提示，并给一个空 handle，保证调用方不用特判。 */
export function createEditor(
  container: string | HTMLElement,
  options: { schema?: unknown },
): UnavailableEditorHandle {
  const host =
    typeof container === "string"
      ? globalThis.document?.querySelector<HTMLElement>(container)
      : container;
  if (host) {
    host.innerHTML = `
      <div class="flex h-full min-h-72 flex-col items-center justify-center gap-2 p-8 text-center">
        <p class="text-sm font-medium text-text-strong">低代码编辑器未启用</p>
        <p class="max-w-md text-xs text-text-soft">
          没有找到 lowcode-next 源码目录。请在项目根目录放置该仓库，或用环境变量
          <code class="rounded bg-line-soft px-1 py-0.5">LOWCODE_NEXT_DIR</code>
          指向它的位置后重启开发服务。
        </p>
      </div>
    `;
  }
  return {
    destroy: () => {
      if (host) host.innerHTML = "";
    },
    getSchema: () => parsePageSchema(options.schema),
    getDocument: () => {
      throw new Error("低代码编辑器未启用，没有可用的文档实例");
    },
  };
}
