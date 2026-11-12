/**
 * 文章模板设计页：取模板、把 schema 交给编辑器、把保存结果落回 `portal_template.schema`。
 */
import * as React from "react";

import { usePortalTemplate } from "~/features/portal-content/portal-content.queries";
import { useUpdatePortalTemplate } from "~/features/portal-content/portal-content.use-mutations";

import type { LowcodePageSchema } from "./engine";
import { PortalDesignShell, toJsonValue, toLowcodePageSchema } from "./portal-design-shell";

export function PortalTemplateDesignPage({ templateId }: { templateId: string }) {
  const template = usePortalTemplate(templateId);
  const updateMut = useUpdatePortalTemplate();
  const data = template.data;
  const schema = React.useMemo(() => toLowcodePageSchema(data?.schema), [data?.schema]);

  const handleSave = React.useCallback(
    async (next: LowcodePageSchema) => {
      await updateMut.mutateAsync({ id: templateId, schema: toJsonValue(next) });
    },
    [templateId, updateMut],
  );

  return (
    <PortalDesignShell
      documentId={data?.id ?? null}
      noun="模板"
      loading={template.isLoading}
      error={template.isError ? template.error : null}
      schema={schema}
      onSave={handleSave}
    />
  );
}
