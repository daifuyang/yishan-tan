import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, LayoutTemplate, Plus, Star } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TABLE_DANGER_ACTION_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { DateRangePicker, Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { ResourcePage } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortalsList } from "~/features/portals/portals.queries";
import { portalListQuerySchema } from "~/features/portals/portals.schema";
import type { PortalDto, PortalThemeMode } from "~/features/portals/portals.types";
import {
  useCreatePortal,
  useDeletePortal,
  useSetDefaultPortal,
  useUpdatePortal,
} from "~/features/portals/portals.use-mutations";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

type StatusFilter = "all" | "enabled" | "disabled";
type DefaultFilter = "all" | "default" | "non-default";

type FilterState = {
  keyword: string;
  isDefault: DefaultFilter;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  isDefault: "all",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

const THEME_MODE_LABELS: Record<PortalThemeMode, string> = {
  light: "浅色",
  dark: "深色",
};

export const Route = createFileRoute("/admin/portals")({
  component: AdminPortalsPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildListQuery(filters: FilterState, page: number, pageSize: number) {
  const trim = (v: string) => v.trim() || undefined;
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  return portalListQuerySchema.parse({
    page,
    pageSize,
    keyword: trim(filters.keyword),
    isDefault: filters.isDefault === "all" ? undefined : filters.isDefault === "default",
    status: filters.status === "all" ? undefined : filters.status,
    createdFrom,
    createdTo,
  });
}

function AdminPortalsPage() {
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<PortalDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<EditPortalFormValue>(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = React.useState<EditPortalFormValue>(EMPTY_EDIT_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);

  const query = buildListQuery(filters, page, pageSize);
  const list = usePortalsList(query);
  const createMut = useCreatePortal();
  const updateMut = useUpdatePortal();
  const deleteMut = useDeletePortal();
  const setDefaultMut = useSetDefaultPortal();

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPageOnFilterChange = React.useCallback(() => {
    setPage(1);
  }, []);

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filter fields used only as trigger for reset
  React.useEffect(() => {
    resetPageOnFilterChange();
  }, [
    draft.keyword,
    draft.isDefault,
    draft.status,
    draft.createdFrom,
    draft.createdTo,
    resetPageOnFilterChange,
  ]);

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleFilterSubmit = () => {
    setFilters(draft);
  };

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleStartEdit = (row: PortalDto) => {
    setEditing(row);
    setEditForm({
      name: row.name ?? "",
      code: row.code ?? "",
      domain: row.domain ?? "",
      logoUrl: row.logoUrl ?? "",
      themePrimary: row.themePrimary ?? "",
      themeMode: row.themeMode,
      isDefault: row.isDefault,
      description: row.description ?? "",
      status: row.status,
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleOpenCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const handleToggleStatus = React.useCallback(
    async (row: PortalDto) => {
      const next: "enabled" | "disabled" = row.status === "enabled" ? "disabled" : "enabled";
      try {
        await updateMut.mutateAsync({ id: row.id, status: next });
      } catch {
        // 错误已通过 useMutation errorMessage 暴露
      }
    },
    [updateMut],
  );

  const handleSetDefault = React.useCallback(
    async (row: PortalDto) => {
      try {
        await setDefaultMut.mutateAsync(row.id);
      } catch {
        // 错误已通过 useMutation errorMessage 暴露
      }
    },
    [setDefaultMut],
  );

  const handleDeleteConfirm = React.useCallback(
    async (row: PortalDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const columns: ResourceColumn<PortalDto>[] = [
    {
      key: "name",
      header: "名称",
      width: "200px",
      cell: (row) => (
        <div className="flex items-center gap-2 truncate">
          <LayoutTemplate className="size-3.5 shrink-0 text-text-mute" aria-hidden />
          <span
            className="break-words whitespace-normal text-[13px] text-text-strong"
            title={row.name}
          >
            {row.name}
          </span>
          {row.isDefault ? (
            <StatusBadge tone="warning" label="默认" icon={Star} variant="soft" />
          ) : null}
        </div>
      ),
    },
    {
      key: "code",
      header: "编码",
      width: "140px",
      cell: (row) => (
        <span className={MONO_CELL} title={row.code}>
          {row.code}
        </span>
      ),
    },
    {
      key: "domain",
      header: "域名",
      width: "240px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.domain ?? ""}
        >
          {row.domain ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "theme",
      header: "主题",
      width: "160px",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.themePrimary ? (
            <span
              className="inline-block size-4 shrink-0 rounded-[3px] border border-line"
              style={{ backgroundColor: row.themePrimary }}
              aria-label={`主题色 ${row.themePrimary}`}
            />
          ) : (
            <span className="inline-block size-4 shrink-0 rounded-[3px] border border-line bg-muted" />
          )}
          <StatusBadge tone="neutral" label={THEME_MODE_LABELS[row.themeMode]} variant="soft" />
        </div>
      ),
    },
    {
      key: "status",
      header: "状态",
      width: "90px",
      cell: (row) => (
        <StatusBadge
          tone={row.status === "enabled" ? "success" : "danger"}
          label={row.status === "enabled" ? "启用" : "已禁用"}
          variant="soft"
        />
      ),
    },
    {
      key: "createdAt",
      header: "创建时间",
      width: "170px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      width: "220px",
      sticky: "right",
      cell: (row) => {
        const isDisabled = row.status === "disabled";
        return (
          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(row);
              }}
            >
              编辑
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className={
                row.isDefault
                  ? "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-text-mute hover:no-underline"
                  : TABLE_ACTION_CLASS
              }
              onClick={(e) => {
                e.stopPropagation();
                void handleSetDefault(row);
              }}
              disabled={row.isDefault || setDefaultMut.isPending}
            >
              {row.isDefault ? "默认中" : "设为默认"}
            </Button>
            {isDisabled ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className={TABLE_ACTION_CLASS}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleToggleStatus(row);
                }}
                disabled={updateMut.isPending}
              >
                启用
              </Button>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className={TABLE_DANGER_ACTION_CLASS}
                onClick={(e) => {
                  e.stopPropagation();
                  setDisablePopconfirmRowId(row.id);
                }}
                disabled={updateMut.isPending}
              >
                禁用
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={TABLE_ACTION_CLASS}
                  onClick={(e) => e.stopPropagation()}
                >
                  更多
                  <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-32 rounded-[4px]">
                <DropdownMenuItem
                  variant="destructive"
                  disabled={row.isDefault || deleteMut.isPending}
                  onSelect={(e) => {
                    e.preventDefault();
                    setPopconfirmRowId(row.id);
                  }}
                >
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popconfirm
              open={popconfirmRowId === row.id}
              onOpenChange={(next) => {
                if (!next && popconfirmRowId === row.id) setPopconfirmRowId(null);
              }}
              title={`删除「${row.name}」？`}
              description="你确认删除吗？"
              confirmLabel="删除"
              tone="danger"
              loading={deleteMut.isPending && popconfirmRowId === row.id}
              onConfirm={() => handleDeleteConfirm(row)}
              side="top"
              align="end"
              sideOffset={6}
            >
              <span aria-hidden className="size-0" />
            </Popconfirm>
            <Popconfirm
              open={disablePopconfirmRowId === row.id}
              onOpenChange={(next) => {
                if (!next && disablePopconfirmRowId === row.id) setDisablePopconfirmRowId(null);
              }}
              title="禁用门户"
              description="你确认禁用吗？"
              confirmLabel="禁用"
              tone="danger"
              loading={updateMut.isPending && disablePopconfirmRowId === row.id}
              onConfirm={() => handleToggleStatus(row)}
              side="top"
              align="end"
              sideOffset={6}
            >
              <span aria-hidden className="size-0" />
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  const handleEditSubmit = async () => {
    if (!editing) return;
    await updateMut.mutateAsync({
      id: editing.id,
      name: editForm.name,
      code: editForm.code,
      domain: editForm.domain || undefined,
      logoUrl: editForm.logoUrl || undefined,
      themePrimary: editForm.themePrimary || undefined,
      themeMode: editForm.themeMode,
      isDefault: editForm.isDefault,
      description: editForm.description || undefined,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      name: createForm.name,
      code: createForm.code,
      domain: createForm.domain || undefined,
      logoUrl: createForm.logoUrl || undefined,
      themePrimary: createForm.themePrimary || undefined,
      themeMode: createForm.themeMode,
      isDefault: createForm.isDefault,
      description: createForm.description || undefined,
      status: createForm.status,
    });
    setCreating(false);
  };

  return (
    <>
      <ResourcePage
        title="门户管理"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="名称/编码/域名" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.keyword}
                onChange={(e) => applyDraftPatch({ keyword: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="是否默认" htmlFor="filter-default">
              <Select
                value={draft.isDefault}
                onValueChange={(v) => applyDraftPatch({ isDefault: v as DefaultFilter })}
              >
                <SelectTrigger id="filter-default" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="default">默认</SelectItem>
                  <SelectItem value="non-default">备用</SelectItem>
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-status">
              <Select
                value={draft.status}
                onValueChange={(v) => applyDraftPatch({ status: v as StatusFilter })}
              >
                <SelectTrigger id="filter-status" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="创建时间" htmlFor="filter-created-range">
              <DateRangePicker
                id="filter-created-range"
                value={{ start: draft.createdFrom || null, end: draft.createdTo || null }}
                onChange={(r) =>
                  applyDraftPatch({ createdFrom: r.start ?? "", createdTo: r.end ?? "" })
                }
              />
            </QueryFormItem>
          </>
        }
        filterValues={draft}
        onFilterSubmit={handleFilterSubmit}
        onFilterReset={handleResetFilters}
        filterLoading={list.isFetching}
        toolbarTitle="门户列表"
        toolbarActions={
          <Button type="button" size="sm" onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新建门户
          </Button>
        }
        tableProps={{
          columns: columns as ResourceColumn<PortalDto>[],
          data: items,
          rowKey: (row) => row.id,
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
          loading: list.isFetching,
          emptyTitle: "暂无门户",
          error: list.isError
            ? list.error instanceof Error
              ? list.error.message
              : "加载失败"
            : undefined,
        }}
      />

      <ResponsiveFormLayer
        open={editing !== null}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseEdit();
        }}
        title="编辑门户"
        dialogSize="lg"
        sheetSize="lg"
        submitLabel="保存"
        loading={updateMut.isPending}
        errorMessage={
          updateMut.isError
            ? updateMut.error instanceof Error
              ? updateMut.error.message
              : "保存失败"
            : undefined
        }
        onSubmit={handleEditSubmit}
      >
        {editing ? (
          <EditPortalFields
            key={`edit-${editing.id}`}
            value={editForm}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新建门户"
        dialogSize="lg"
        sheetSize="lg"
        submitLabel="创建"
        loading={createMut.isPending}
        errorMessage={
          createMut.isError
            ? createMut.error instanceof Error
              ? createMut.error.message
              : "创建失败"
            : undefined
        }
        onSubmit={handleCreateSubmit}
      >
        <EditPortalFields
          key="create-form"
          value={createForm}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type EditPortalFormValue = {
  name: string;
  code: string;
  domain: string;
  logoUrl: string;
  themePrimary: string;
  themeMode: PortalThemeMode;
  isDefault: boolean;
  description: string;
  status: "enabled" | "disabled";
};

const EMPTY_CREATE_FORM: EditPortalFormValue = {
  name: "",
  code: "",
  domain: "",
  logoUrl: "",
  themePrimary: "#1677ff",
  themeMode: "light",
  isDefault: false,
  description: "",
  status: "enabled",
};

const EMPTY_EDIT_FORM: EditPortalFormValue = {
  name: "",
  code: "",
  domain: "",
  logoUrl: "",
  themePrimary: "#1677ff",
  themeMode: "light",
  isDefault: false,
  description: "",
  status: "enabled",
};

function EditPortalFields({
  value,
  onChange,
}: {
  value: EditPortalFormValue;
  onChange: (patch: Partial<EditPortalFormValue>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-name">名称</Label>
          <Input
            id="portal-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="显示名（如 主门户）"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-code">编码</Label>
          <Input
            id="portal-code"
            value={value.code}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder="小写字母、数字、短横线（例 main）"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="portal-domain">域名</Label>
          <Input
            id="portal-domain"
            value={value.domain}
            onChange={(e) => onChange({ domain: e.target.value })}
            placeholder="可选，例 portal.example.com"
            maxLength={253}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="portal-logo">Logo URL</Label>
          <div className="flex items-center gap-3">
            <Input
              id="portal-logo"
              value={value.logoUrl}
              onChange={(e) => onChange({ logoUrl: e.target.value })}
              placeholder="可选，远程 Logo 地址"
              maxLength={500}
            />
            {value.logoUrl ? (
              <span className="inline-block size-9 shrink-0 overflow-hidden rounded-[4px] border border-line bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value.logoUrl}
                  alt="logo 预览"
                  className="size-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[4px] border border-line bg-muted px-3 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portal-theme-primary">主题主色</Label>
            <div className="flex items-center gap-2">
              <input
                id="portal-theme-primary"
                type="color"
                value={value.themePrimary || "#1677ff"}
                onChange={(e) => onChange({ themePrimary: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded-[4px] border border-line bg-white p-0.5"
                aria-label="主题主色拾色器"
              />
              <Input
                value={value.themePrimary}
                onChange={(e) => onChange({ themePrimary: e.target.value })}
                placeholder="#1677ff"
                maxLength={7}
                className="font-mono"
              />
            </div>
            <p className="text-[11px] text-text-mute">支持 #RGB 或 #RRGGBB 格式。</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="portal-theme-mode">主题模式</Label>
            <Select
              value={value.themeMode}
              onValueChange={(v) => onChange({ themeMode: v as PortalThemeMode })}
            >
              <SelectTrigger id="portal-theme-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[4px] border border-line bg-muted px-3 py-2.5">
        <Checkbox
          id="portal-default"
          checked={value.isDefault}
          onCheckedChange={(next) => onChange({ isDefault: next === true })}
        />
        <div className="space-y-0.5">
          <Label htmlFor="portal-default" className="text-text-strong">
            设为默认门户
          </Label>
          <p className="text-[11px] text-text-mute">
            系统将以此门户作为默认入口；同一时间只能有一个默认。
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-description">描述</Label>
        <Input
          id="portal-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="可选，备注此门户的用途"
          maxLength={500}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-status">状态</Label>
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
        >
          <SelectTrigger id="portal-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
        {value.status === "disabled" ? (
          <p className="text-[11px] text-text-mute">禁用后将不再作为可访问的门户入口。</p>
        ) : null}
      </div>
    </div>
  );
}
