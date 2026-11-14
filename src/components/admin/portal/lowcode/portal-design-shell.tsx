/**
 * 低代码设计页的公共外壳：加载 / 失败态、编辑器、预览层、保存失败提示。
 *
 * 文章模板与门户页面都是「取一份 PageSchema → 交给编辑器 → 把保存结果落回去」，
 * 区别只在数据从哪来、存到哪去，所以外壳抽出来共用，两个设计页各自只管数据。
 */
import * as React from "react";

import { ArrowLeft } from "lucide-react";
import type { JsonValue } from "~/../db/schema";
import { Toaster } from "~/components/ui/sonner";

import { DesignerSkeleton } from "./designer-skeleton";
import { type LowcodePageSchema, type LowcodeToolbarItem, loadLowcodeEngine } from "./engine";
import { PortalTemplateDesigner } from "./portal-template-designer";
import { PortalPreviewCanvas } from "./preview-canvas";

/** json → 引擎的页面结构；形状不对就当空白处理。 */
export function toLowcodePageSchema(value: JsonValue | null | undefined): LowcodePageSchema | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.version !== "string") return null;
  const tree = candidate.componentsTree;
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return null;
  return value as unknown as LowcodePageSchema;
}

/** 引擎的页面结构 → 可落库的 JSON（JSON 往返，顺带丢掉 undefined 字段）。 */
export function toJsonValue(schema: LowcodePageSchema): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, JsonValue>;
}

export interface PortalDesignShellProps {
  /** 编辑器文档 id（引擎内部保存 key）。 */
  documentId: string | null;
  /** 对象名称，用于加载 / 失败文案，如「模板」「页面」。 */
  noun: string;
  loading: boolean;
  error: unknown;
  schema: LowcodePageSchema | null;
  /** 引擎点「保存」时回调；成功提示由调用方在这里自己给（toast），抛错会在右上角提示。 */
  onSave: (schema: LowcodePageSchema) => Promise<void>;
  /**
   * 点「预览」时先执行：把当前内容落库（草稿，不发布），让预览看到的就是库里真实存着的东西。
   * 成功才打开预览层；抛错会在右上角提示，并且不进入预览（不预览一份没存下来的内容）。
   * 不传则直接用编辑器里此刻的内容预览。
   */
  onPreview?: (schema: LowcodePageSchema) => Promise<void>;
  /** 编辑器工具栏里的扩展按钮（如「发布」），由引擎渲染、行为由调用方提供。 */
  toolbar?: readonly LowcodeToolbarItem[];
}

export function PortalDesignShell({
  documentId,
  noun,
  loading,
  error,
  schema,
  onSave,
  onPreview,
  toolbar,
}: PortalDesignShellProps) {
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<LowcodePageSchema | null>(null);

  const handleSave = React.useCallback(
    async (next: LowcodePageSchema) => {
      setSaveError(null);
      try {
        await onSave(next);
      } catch (saveFailure) {
        setSaveError(saveFailure instanceof Error ? saveFailure.message : `${noun}保存失败`);
        throw saveFailure;
      }
    },
    [onSave, noun],
  );

  const handlePreview = React.useCallback(
    (next: LowcodePageSchema) => {
      void (async () => {
        setSaveError(null);
        try {
          await onPreview?.(next);
          setPreview(next);
        } catch (failure) {
          setSaveError(failure instanceof Error ? failure.message : `${noun}保存失败，无法预览`);
        }
      })();
    },
    [onPreview, noun],
  );

  // 编辑器只用「首次加载到的」schema 起步。保存 / 发布会让数据重新拉取、引用变化，
  // 若跟着变，编辑器会被重建，撤销历史和选中状态全丢。
  const initialSchema = React.useRef<{ value: LowcodePageSchema | null } | null>(null);
  if (!loading && initialSchema.current === null) initialSchema.current = { value: schema };

  // 数据请求和引擎代码并行加载，而不是等数据回来才开始拉引擎。
  React.useEffect(() => {
    loadLowcodeEngine().catch(() => {
      // 失败由设计器挂载时的加载流程呈现，这里只负责预热。
    });
  }, []);

  if (loading) {
    return (
      <div className="h-screen">
        <DesignerSkeleton />
      </div>
    );
  }

  if (error || !documentId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-text-strong">{noun}加载失败</p>
        <p className="max-w-md text-xs text-text-soft">
          {error instanceof Error ? error.message : `${noun}不存在或无访问权限`}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-page">
      <PortalTemplateDesigner
        documentId={documentId}
        schema={initialSchema.current?.value ?? null}
        onSave={handleSave}
        onError={(message) => setSaveError(message)}
        onPreview={handlePreview}
        toolbar={toolbar}
      />
      {preview ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-white">
          <div className="flex h-12 shrink-0 items-center border-b border-line bg-white px-3">
            <button
              type="button"
              className="group inline-flex h-8 items-center gap-1 rounded-md pr-3 pl-2 text-[13px] font-medium text-text-soft transition-colors hover:bg-muted hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              onClick={() => setPreview(null)}
            >
              <ArrowLeft
                className="size-4 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
              返回
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <PortalPreviewCanvas schema={preview} />
          </div>
        </div>
      ) : null}
      <Toaster />
      {saveError ? (
        <div className="absolute right-4 top-4 z-50 rounded-md border border-destructive/30 bg-white px-3 py-2 text-xs text-destructive shadow-card">
          {saveError}
        </div>
      ) : null}
    </div>
  );
}
