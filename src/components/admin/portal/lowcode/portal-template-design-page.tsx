/**
 * 门户模板设计页：低代码编辑器。
 *
 * 页面职责很薄 —— 取模板、把 schema 交给编辑器、把编辑器保存出来的 PageSchema
 * 落回 `portal_template.schema`。引擎的画布、物料、属性面板、撤销重做与保存
 * 按钮都由 lowcode-next 提供，宿主不额外套壳，编辑器占满整屏。
 */
import * as React from "react";

import { ArrowLeft } from "lucide-react";
import type { JsonValue } from "~/../db/schema";
import { usePortalTemplate } from "~/features/portal-content/portal-content.queries";
import { useUpdatePortalTemplate } from "~/features/portal-content/portal-content.use-mutations";

import type { LowcodePageSchema } from "./engine";
import { PortalTemplateDesigner } from "./portal-template-designer";
import { PortalPreviewCanvas } from "./preview-canvas";

/** 模板 json → 引擎的页面结构；形状不对就当空模板处理。 */
function toLowcodePageSchema(value: JsonValue | null | undefined): LowcodePageSchema | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.version !== "string") return null;
  const tree = candidate.componentsTree;
  if (!tree || typeof tree !== "object" || Array.isArray(tree)) return null;
  return value as unknown as LowcodePageSchema;
}

/** 引擎的页面结构 → 可落库的 JSON（JSON 往返，顺带丢掉 undefined 字段）。 */
function toJsonValue(schema: LowcodePageSchema): Record<string, JsonValue> {
  return JSON.parse(JSON.stringify(schema)) as Record<string, JsonValue>;
}

export function PortalTemplateDesignPage({ templateId }: { templateId: string }) {
  const template = usePortalTemplate(templateId);
  const updateMut = useUpdatePortalTemplate();
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const data = template.data;
  const schema = React.useMemo(() => toLowcodePageSchema(data?.schema), [data?.schema]);

  const handleSave = React.useCallback(
    async (next: LowcodePageSchema) => {
      setSaveError(null);
      try {
        await updateMut.mutateAsync({ id: templateId, schema: toJsonValue(next) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "模板保存失败";
        setSaveError(message);
        throw error;
      }
    },
    [templateId, updateMut],
  );

  const [preview, setPreview] = React.useState<LowcodePageSchema | null>(null);

  const handlePreview = React.useCallback((next: LowcodePageSchema) => {
    setPreview(next);
  }, []);

  if (template.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-[13px] text-text-soft">
        正在加载模板…
      </div>
    );
  }

  if (template.isError || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-text-strong">模板加载失败</p>
        <p className="max-w-md text-xs text-text-soft">
          {template.error instanceof Error ? template.error.message : "模板不存在或无访问权限"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-page">
      <PortalTemplateDesigner
        documentId={data.id}
        schema={schema}
        onSave={handleSave}
        onError={(message) => setSaveError(message)}
        onPreview={handlePreview}
      />
      {preview ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-[13px] text-text-soft">预览</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-[13px] text-text-strong hover:bg-muted"
              onClick={() => setPreview(null)}
            >
              <ArrowLeft className="size-4" aria-hidden />
              返回编辑
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <PortalPreviewCanvas schema={preview} />
          </div>
        </div>
      ) : null}
      {saveError ? (
        <div className="absolute right-4 top-4 z-50 rounded-md border border-destructive/30 bg-white px-3 py-2 text-xs text-destructive shadow-card">
          {saveError}
        </div>
      ) : null}
    </div>
  );
}
