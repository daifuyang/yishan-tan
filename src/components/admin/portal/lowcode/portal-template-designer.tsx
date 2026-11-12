/**
 * 门户模板设计器：把 lowcode-next 的编辑器挂到宿主页面里。
 *
 * 引擎自己 `createRoot`（React 19 允许第二个 root），所以挂载点必须是一个
 * **宿主不渲染 React 子节点**的空 div；宿主上下文（主题、路由、i18n）不跨 root，
 * 引擎面板拿不到 —— 这是引擎当前的形态，物料层换成本项目组件时会重新评估。
 *
 * 引擎负责画布、物料、属性面板与自己的保存按钮；**存到哪**是宿主的事：
 * `onSave` 回调把当前 PageSchema 交给上层落库。
 */
import * as React from "react";

import { type LowcodePageSchema, loadLowcodeEngine } from "./engine";

export interface PortalTemplateDesignerProps {
  /** 文档 id：引擎内部用它做保存 key，这里用模板 id。 */
  documentId: string;
  /** 起始页面；为 null 时用引擎自带的示例页。 */
  schema: LowcodePageSchema | null;
  /** 引擎点「保存」时回调；抛错会提示保存失败。 */
  onSave: (schema: LowcodePageSchema) => Promise<void> | void;
  /** 每次提交后回调（用于「未保存」标记）。 */
  onChange?: (schema: LowcodePageSchema) => void;
  /** 保存失败时回调（用于 toast）。 */
  onError?: (message: string) => void;
  /** 点「预览」时回调，参数是当前 schema（未保存的改动也在内）。 */
  onPreview?: (schema: LowcodePageSchema) => void;
}

export function PortalTemplateDesigner({
  documentId,
  schema,
  onSave,
  onChange,
  onError,
  onPreview,
}: PortalTemplateDesignerProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "failed">("loading");
  const [error, setError] = React.useState<string | null>(null);

  // 保存回调放进 ref：引擎在挂载时抓一次，避免父组件重建导致引擎拿到旧闭包。
  const handlersRef = React.useRef({ onSave, onChange, onError, onPreview });
  handlersRef.current = { onSave, onChange, onError, onPreview };

  // 预览要拿到「此刻」的 schema：引擎的 onPreview 不带参数，只能自己留一份最新的。
  const latestSchemaRef = React.useRef<LowcodePageSchema | null>(schema);

  React.useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | null = null;

    void (async () => {
      try {
        const engine = await loadLowcodeEngine();
        if (disposed || !containerRef.current) return;

        const initial = schema ?? engine.parsePageSchema(engine.sampleSchema);
        latestSchemaRef.current = initial;
        const handle = engine.createEditor(containerRef.current, {
          schema: initial,
          documentId,
          packages: [engine.basicPackage],
          canvasPadding: 0,
          onSchemaChange: (next) => {
            latestSchemaRef.current = next;
            handlersRef.current.onChange?.(next);
          },
          onPreview: () => {
            const current = latestSchemaRef.current;
            if (current) handlersRef.current.onPreview?.(current);
          },
          onSave: (next) => {
            void (async () => {
              try {
                await handlersRef.current.onSave(next);
              } catch (saveError) {
                const message = saveError instanceof Error ? saveError.message : "模板保存失败";
                handlersRef.current.onError?.(message);
              }
            })();
          },
        });
        destroy = handle.destroy;
        setStatus("ready");
      } catch (loadError) {
        if (disposed) return;
        setStatus("failed");
        setError(loadError instanceof Error ? loadError.message : "低代码编辑器加载失败");
      }
    })();

    return () => {
      disposed = true;
      destroy?.();
    };
  }, [documentId, schema]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-white">
      {/* 挂载点：宿主不往里渲染 React 子节点，引擎自己 createRoot。 */}
      <div ref={containerRef} className="h-full w-full" />
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[13px] text-text-soft">
          正在加载低代码编辑器…
        </div>
      ) : null}
      {status === "failed" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white p-8 text-center">
          <p className="text-sm font-medium text-text-strong">低代码编辑器加载失败</p>
          <p className="max-w-md text-xs text-text-soft">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
