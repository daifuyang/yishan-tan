import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

import { OptionRow } from "@/components/admin/settings/option-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  SYSTEM_OPTION_GROUPS,
  type SystemOptionDef,
  type SystemOptionGroup as SystemOptionGroupDef,
  deserializeOptionValue,
  serializeOptionValue,
} from "~/features/system-settings/system-settings.groups";
import { useSystemOptionGroup } from "~/features/system-settings/system-settings.queries";
import { useSaveAllSystemOptions } from "~/features/system-settings/system-settings.use-mutations";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="space-y-5 pb-20">
      <SettingsForm />
    </div>
  );
}

function SettingsForm() {
  const siteQuery = useSystemOptionGroup("site");
  const authQuery = useSystemOptionGroup("auth");
  const uploadQuery = useSystemOptionGroup("upload");
  const uiQuery = useSystemOptionGroup("ui");
  const saveMut = useSaveAllSystemOptions();

  const [draft, setDraft] = React.useState<Record<string, unknown>>({});
  const [initialDraft, setInitialDraft] = React.useState<Record<string, unknown>>({});
  const [hydrated, setHydrated] = React.useState(false);

  // 4 个分组并行加载；任一未就绪则等待；水合完成后即便 query invalidate 也不再覆盖本地草稿
  React.useEffect(() => {
    if (hydrated) return;
    const allData = [siteQuery.data, authQuery.data, uploadQuery.data, uiQuery.data];
    if (allData.some((d) => !d)) return;
    const next: Record<string, unknown> = {};
    for (const group of SYSTEM_OPTION_GROUPS) {
      const groupData = allData.find((d) => d?.some((row) => row.key.startsWith(`${group.code}.`)));
      for (const opt of group.options) {
        const dto = groupData?.find((d) => d.key === opt.key);
        next[opt.key] = deserializeOptionValue(dto?.value ?? "");
      }
    }
    setDraft(next);
    setInitialDraft(next);
    setHydrated(true);
  }, [siteQuery.data, authQuery.data, uploadQuery.data, uiQuery.data, hydrated]);

  const setOptionValue = React.useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isLoading =
    siteQuery.isLoading || authQuery.isLoading || uploadQuery.isLoading || uiQuery.isLoading;
  const isSaving = saveMut.isPending;
  const errorMessage = saveMut.isError
    ? saveMut.error instanceof Error
      ? saveMut.error.message
      : "保存失败"
    : undefined;

  const handleSave = async () => {
    if (isSaving || !hydrated) return;
    const items = SYSTEM_OPTION_GROUPS.flatMap((group) =>
      group.options.map((opt) => ({
        key: opt.key,
        value: serializeOptionValue(draft[opt.key]),
      })),
    );
    try {
      await saveMut.mutateAsync(items);
    } catch {
      // 错误通过 errorMessage 暴露
    }
  };

  const handleReset = React.useCallback(() => {
    if (!hydrated || isSaving) return;
    setDraft(initialDraft);
    saveMut.reset();
  }, [hydrated, isSaving, initialDraft, saveMut]);

  const groupedQueries: Record<string, { data: ReturnType<typeof useSystemOptionGroup>["data"] }> =
    {
      site: siteQuery,
      auth: authQuery,
      upload: uploadQuery,
      ui: uiQuery,
    };

  return (
    <>
      <Card className="rounded-md border-line shadow-card">
        <CardHeader className="border-b border-line/60">
          <h2 className="text-[15px] font-medium text-text-strong">站点配置</h2>
        </CardHeader>
        <CardContent className="space-y-8 pt-6 pb-12">
          {SYSTEM_OPTION_GROUPS.map((group) => (
            <SettingsGroupSection
              key={group.code}
              group={group}
              draft={draft}
              onChange={setOptionValue}
              disabled={isSaving || !hydrated}
              isGroupLoading={groupedQueries[group.code]?.data === undefined && isLoading}
            />
          ))}
        </CardContent>
      </Card>

      <div className="fixed right-0 bottom-0 left-0 z-20 lg:left-[var(--admin-sidebar-width)]">
        <div className="border-t border-line bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] sm:px-6 lg:px-8">
          <div className="flex items-center justify-end gap-3">
            {errorMessage ? (
              <span
                role="alert"
                className="max-w-[280px] truncate text-[12px] text-destructive"
                title={errorMessage}
              >
                {errorMessage}
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleReset}
              disabled={isSaving || !hydrated || isLoading}
              className="min-w-[88px]"
            >
              重置
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving || !hydrated || isLoading}
              className="min-w-[88px]"
            >
              保存
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

type SettingsGroupSectionProps = {
  group: SystemOptionGroupDef;
  draft: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  disabled: boolean;
  isGroupLoading: boolean;
};

function SettingsGroupSection({
  group,
  draft,
  onChange,
  disabled,
  isGroupLoading,
}: SettingsGroupSectionProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h3 className="text-[14px] font-semibold text-text-strong">{group.name}</h3>
        {group.description ? (
          <p className="text-[12px] text-text-mute">{group.description}</p>
        ) : null}
      </header>
      {isGroupLoading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {group.options.map((opt) => (
            <OptionRowSkeleton key={opt.key} option={opt} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {group.options.map((opt) => (
            <OptionRow
              key={opt.key}
              option={opt}
              value={draft[opt.key]}
              onChange={(next) => onChange(opt.key, next)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function OptionRowSkeleton({ option }: { option: SystemOptionDef }) {
  return (
    <div className="space-y-1.5" aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded bg-line-soft" />
      <div className="h-8 w-full animate-pulse rounded bg-line-soft" />
      {option.description ? <div className="h-3 w-2/3 animate-pulse rounded bg-line-soft" /> : null}
    </div>
  );
}
