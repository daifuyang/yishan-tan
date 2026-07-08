import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Loader2, Save } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/admin/layout";
import { OptionRow } from "@/components/admin/settings/option-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SYSTEM_OPTION_GROUPS,
  type SystemOptionGroup as SystemOptionGroupDef,
  deserializeOptionValue,
  serializeOptionValue,
} from "~/features/system-settings/system-settings.groups";
import { useSystemOptionGroup } from "~/features/system-settings/system-settings.queries";
import { useSaveSystemOptionGroup } from "~/features/system-settings/system-settings.use-mutations";
import { MONO_CHIP } from "~/lib/classes";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <PageHeader title="站点配置" />
      <div className="space-y-4">
        {SYSTEM_OPTION_GROUPS.map((group) => (
          <SettingsGroupCard key={group.code} group={group} />
        ))}
      </div>
    </div>
  );
}

type GroupDraftValue = unknown;

function SettingsGroupCard({ group }: { group: SystemOptionGroupDef }) {
  const query = useSystemOptionGroup(group.code);
  const saveMut = useSaveSystemOptionGroup();

  const [draft, setDraft] = React.useState<Record<string, GroupDraftValue>>({});
  const [open, setOpen] = React.useState(true);
  const [hydrated, setHydrated] = React.useState(false);

  // 拉取到 DTO 后，把远端 value 反序列化进 draft；本地编辑不回写到远端。
  // 只在水合阶段同步一次，之后即便本组 query 因 invalidate 重新拉取，也保留本地草稿。
  React.useEffect(() => {
    if (!query.data || hydrated) return;
    const next: Record<string, GroupDraftValue> = {};
    for (const opt of group.options) {
      const dto = query.data.find((d) => d.key === opt.key);
      next[opt.key] = deserializeOptionValue(dto?.value ?? "");
    }
    setDraft(next);
    setHydrated(true);
  }, [query.data, group.options, hydrated]);

  const setOptionValue = React.useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isSaving = saveMut.isPending;
  const errorMessage = saveMut.isError
    ? saveMut.error instanceof Error
      ? saveMut.error.message
      : "保存失败"
    : undefined;

  const handleSave = async () => {
    if (isSaving) return;
    const items = group.options.map((opt) => ({
      key: opt.key,
      value: serializeOptionValue(draft[opt.key]),
    }));
    try {
      await saveMut.mutateAsync({ groupCode: group.code, items });
    } catch {
      // 错误通过 errorMessage 暴露
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-md border-line shadow-card">
        <CardHeader className="border-b border-line/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-7 gap-1 px-2 text-[14px] font-semibold text-text-strong"
                    aria-expanded={open}
                  >
                    <ChevronDown
                      className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`}
                      aria-hidden
                    />
                    {group.name}
                  </Button>
                </CollapsibleTrigger>
                <Badge variant="neutral" className={MONO_CHIP}>
                  {group.code}
                </Badge>
              </div>
              {group.description ? (
                <p className="text-[12px] text-text-mute">{group.description}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
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
                onClick={handleSave}
                disabled={isSaving || !hydrated}
                className="min-w-[88px]"
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-3.5" aria-hidden />
                )}
                保存本组
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-5 pt-5">
            {query.isLoading && !hydrated ? (
              <div className="grid gap-5 md:grid-cols-2">
                {group.options.map((opt) => (
                  <div key={opt.key} className="space-y-1.5">
                    <div className="h-4 w-24 animate-pulse rounded bg-line-soft" />
                    <div className="h-8 w-full animate-pulse rounded bg-line-soft" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-line-soft" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {group.options.map((opt) => (
                  <OptionRow
                    key={opt.key}
                    option={opt}
                    value={draft[opt.key]}
                    onChange={(next) => setOptionValue(opt.key, next)}
                    disabled={isSaving}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
