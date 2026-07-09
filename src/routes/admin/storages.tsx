import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Cloud, Plus, Star } from "lucide-react";
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
import { useStoragesList } from "~/features/storages/storages.queries";
import {
  type StorageDriver,
  storageDriverSchema,
  storageListQuerySchema,
} from "~/features/storages/storages.schema";
import type { StorageConfig, StorageDto } from "~/features/storages/storages.types";
import {
  useCreateStorage,
  useDeleteStorage,
  useSetDefaultStorage,
  useUpdateStorage,
} from "~/features/storages/storages.use-mutations";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

type StatusFilter = "all" | "enabled" | "disabled";
type DefaultFilter = "all" | "default" | "non-default";
type DriverFilter = "all" | StorageDriver;

type FilterState = {
  keyword: string;
  driver: DriverFilter;
  isDefault: DefaultFilter;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  driver: "all",
  isDefault: "all",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

const DRIVER_LABELS: Record<StorageDriver, string> = {
  local: "本地",
  "aliyun-oss": "阿里云 OSS",
  "tencent-cos": "腾讯云 COS",
  "aws-s3": "AWS S3",
  qiniu: "七牛云",
  minio: "MinIO",
};

export const Route = createFileRoute("/admin/storages")({
  component: AdminStoragesPage,
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
  return storageListQuerySchema.parse({
    page,
    pageSize,
    keyword: trim(filters.keyword),
    driver: filters.driver === "all" ? undefined : filters.driver,
    isDefault: filters.isDefault === "all" ? undefined : filters.isDefault === "default",
    status: filters.status === "all" ? undefined : filters.status,
    createdFrom,
    createdTo,
  });
}

function AdminStoragesPage() {
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<StorageDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<EditStorageFormValue>(EMPTY_CREATE_FORM);
  const [editForm, setEditForm] = React.useState<EditStorageFormValue>(EMPTY_EDIT_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);

  const query = buildListQuery(filters, page, pageSize);
  const list = useStoragesList(query);
  const createMut = useCreateStorage();
  const updateMut = useUpdateStorage();
  const deleteMut = useDeleteStorage();
  const setDefaultMut = useSetDefaultStorage();

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPageOnFilterChange = React.useCallback(() => {
    setPage(1);
  }, []);

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft fields used only as trigger for reset
  React.useEffect(() => {
    resetPageOnFilterChange();
  }, [
    draft.keyword,
    draft.driver,
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

  const handleStartEdit = (row: StorageDto) => {
    setEditing(row);
    setEditForm({
      name: row.name ?? "",
      driver: row.driver,
      isDefault: row.isDefault,
      description: row.description ?? "",
      status: row.status,
      config: { ...row.configSummary },
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
    async (row: StorageDto) => {
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
    async (row: StorageDto) => {
      try {
        await setDefaultMut.mutateAsync(row.id);
      } catch {
        // 错误已通过 useMutation errorMessage 暴露
      }
    },
    [setDefaultMut],
  );

  const handleDeleteConfirm = React.useCallback(
    async (row: StorageDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const columns: ResourceColumn<StorageDto>[] = [
    {
      key: "name",
      header: "名称",
      width: "180px",
      cell: (row) => (
        <div className="flex items-center gap-2 truncate">
          <Cloud className="size-3.5 shrink-0 text-text-mute" aria-hidden />
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
      key: "driver",
      header: "驱动",
      width: "140px",
      cell: (row) => (
        <span className={MONO_CELL} title={row.driver}>
          {DRIVER_LABELS[row.driver] ?? row.driver}
        </span>
      ),
    },
    {
      key: "isDefault",
      header: "是否默认",
      width: "100px",
      cell: (row) => (
        <StatusBadge
          tone={row.isDefault ? "warning" : "neutral"}
          label={row.isDefault ? "默认" : "备用"}
          variant="soft"
        />
      ),
    },
    {
      key: "description",
      header: "描述",
      width: "240px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.description ?? ""}
        >
          {row.description ?? <span className="text-text-mute">--</span>}
        </span>
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
              title="禁用存储驱动"
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
      driver: editForm.driver,
      isDefault: editForm.isDefault,
      description: editForm.description || undefined,
      status: editForm.status,
      config: editForm.config,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      name: createForm.name,
      driver: createForm.driver,
      isDefault: createForm.isDefault,
      description: createForm.description || undefined,
      status: createForm.status,
      config: createForm.config,
    });
    setCreating(false);
  };

  return (
    <>
      <ResourcePage
        title="云存储"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="名称" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.keyword}
                onChange={(e) => applyDraftPatch({ keyword: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="驱动" htmlFor="filter-driver">
              <Select
                value={draft.driver}
                onValueChange={(v) => applyDraftPatch({ driver: v as DriverFilter })}
              >
                <SelectTrigger id="filter-driver" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {storageDriverSchema.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {DRIVER_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        toolbarTitle="存储列表"
        toolbarActions={
          <Button type="button" size="sm" onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新建存储
          </Button>
        }
        tableProps={{
          columns: columns as ResourceColumn<StorageDto>[],
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
          emptyTitle: "暂无存储",
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
        title="编辑存储"
        dialogSize="md"
        sheetSize="md"
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
          <EditStorageFields
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
        title="新建存储"
        dialogSize="md"
        sheetSize="md"
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
        <EditStorageFields
          key="create-form"
          value={createForm}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type EditStorageFormValue = {
  name: string;
  driver: StorageDriver;
  isDefault: boolean;
  description: string;
  status: "enabled" | "disabled";
  config: StorageConfig;
};

const EMPTY_CREATE_FORM: EditStorageFormValue = {
  name: "",
  driver: "local",
  isDefault: false,
  description: "",
  status: "enabled",
  config: {},
};

const EMPTY_EDIT_FORM: EditStorageFormValue = {
  name: "",
  driver: "local",
  isDefault: false,
  description: "",
  status: "enabled",
  config: {},
};

function EditStorageFields({
  value,
  onChange,
}: {
  value: EditStorageFormValue;
  onChange: (patch: Partial<EditStorageFormValue>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="storage-name">名称</Label>
          <Input
            id="storage-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="显示名（如 主站 OSS）"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="storage-driver">驱动</Label>
          <Select
            value={value.driver}
            onValueChange={(v) => onChange({ driver: v as StorageDriver, config: {} })}
          >
            <SelectTrigger id="storage-driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {storageDriverSchema.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {DRIVER_LABELS[opt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-[4px] border border-line bg-muted px-3 py-2.5">
        <Checkbox
          id="storage-default"
          checked={value.isDefault}
          onCheckedChange={(next) => onChange({ isDefault: next === true })}
        />
        <div className="space-y-0.5">
          <Label htmlFor="storage-default" className="text-text-strong">
            设为默认驱动
          </Label>
          <p className="text-[11px] text-text-mute">
            系统上传会走默认驱动；同一时间只能有一个默认。
          </p>
        </div>
      </div>

      <DriverConfigFields
        driver={value.driver}
        value={value.config}
        onChange={(patch) => onChange({ config: { ...value.config, ...patch } })}
      />

      <div className="space-y-1.5">
        <Label htmlFor="storage-description">描述</Label>
        <Input
          id="storage-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="可选，备注此存储的用途"
          maxLength={500}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="storage-status">状态</Label>
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
        >
          <SelectTrigger id="storage-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
        {value.status === "disabled" ? (
          <p className="text-[11px] text-text-mute">
            禁用后将不再被选为新上传目标；已上传文件不受影响。
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DriverConfigFields({
  driver,
  value,
  onChange,
}: {
  driver: StorageDriver;
  value: StorageConfig;
  onChange: (patch: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3 rounded-[4px] border border-line bg-muted px-3 py-3">
      <div className="flex items-center justify-between">
        <Label className="text-[13px] font-medium text-text-strong">驱动配置</Label>
        <span className="text-[11px] text-text-mute">{DRIVER_LABELS[driver]} · 敏感字段已隐藏</span>
      </div>
      {driver === "local" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField
            id="cfg-dir"
            label="本地目录"
            placeholder="public/uploads"
            value={value.dir}
            onChange={(v) => onChange({ dir: v })}
            hint="相对于项目根目录，会自动创建"
          />
          <ConfigField
            id="cfg-prefix"
            label="路径前缀"
            placeholder="files"
            value={value.prefix}
            onChange={(v) => onChange({ prefix: v })}
          />
          <ConfigField
            id="cfg-public-base"
            label="公网 URL"
            placeholder="https://cdn.example.com"
            value={value.publicBaseUrl}
            onChange={(v) => onChange({ publicBaseUrl: v })}
            className="sm:col-span-2"
            hint="留空则走 /uploads/<key>"
          />
        </div>
      ) : null}
      {driver === "aliyun-oss" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField
            id="cfg-region"
            label="Region"
            value={value.region}
            onChange={(v) => onChange({ region: v })}
            placeholder="oss-cn-hangzhou"
          />
          <ConfigField
            id="cfg-bucket"
            label="Bucket"
            value={value.bucket}
            onChange={(v) => onChange({ bucket: v })}
          />
          <ConfigField
            id="cfg-access-key-id"
            label="AccessKeyId"
            value={value.accessKeyId}
            onChange={(v) => onChange({ accessKeyId: v })}
          />
          <ConfigSecretField
            id="cfg-access-key-secret"
            label="AccessKeySecret"
            value={value.accessKeySecret}
            onChange={(v) => onChange({ accessKeySecret: v })}
            currentRedacted={value.accessKeySecret === "******"}
          />
          <ConfigField
            id="cfg-endpoint"
            label="Endpoint"
            value={value.endpoint}
            onChange={(v) => onChange({ endpoint: v })}
          />
          <ConfigField
            id="cfg-cdn"
            label="CDN 域名"
            value={value.cdnDomain}
            onChange={(v) => onChange({ cdnDomain: v })}
          />
          <ConfigField
            id="cfg-prefix"
            label="路径前缀"
            value={value.prefix}
            onChange={(v) => onChange({ prefix: v })}
            className="sm:col-span-2"
          />
        </div>
      ) : null}
      {driver === "tencent-cos" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField
            id="cfg-region"
            label="Region"
            value={value.region}
            onChange={(v) => onChange({ region: v })}
            placeholder="ap-guangzhou"
          />
          <ConfigField
            id="cfg-bucket"
            label="Bucket"
            value={value.bucket}
            onChange={(v) => onChange({ bucket: v })}
          />
          <ConfigField
            id="cfg-app-id"
            label="AppId"
            value={value.appId}
            onChange={(v) => onChange({ appId: v })}
          />
          <ConfigField
            id="cfg-secret-id"
            label="SecretId"
            value={value.secretId}
            onChange={(v) => onChange({ secretId: v })}
          />
          <ConfigSecretField
            id="cfg-secret-key"
            label="SecretKey"
            value={value.secretKey}
            onChange={(v) => onChange({ secretKey: v })}
            currentRedacted={value.secretKey === "******"}
            className="sm:col-span-2"
          />
          <ConfigField
            id="cfg-endpoint"
            label="Endpoint"
            value={value.endpoint}
            onChange={(v) => onChange({ endpoint: v })}
          />
          <ConfigField
            id="cfg-cdn"
            label="CDN 域名"
            value={value.cdnDomain}
            onChange={(v) => onChange({ cdnDomain: v })}
          />
        </div>
      ) : null}
      {driver === "aws-s3" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField
            id="cfg-region"
            label="Region"
            value={value.region}
            onChange={(v) => onChange({ region: v })}
            placeholder="us-east-1"
          />
          <ConfigField
            id="cfg-bucket"
            label="Bucket"
            value={value.bucket}
            onChange={(v) => onChange({ bucket: v })}
          />
          <ConfigField
            id="cfg-access-key-id"
            label="AccessKeyId"
            value={value.accessKeyId}
            onChange={(v) => onChange({ accessKeyId: v })}
          />
          <ConfigSecretField
            id="cfg-secret-access-key"
            label="SecretAccessKey"
            value={value.secretAccessKey}
            onChange={(v) => onChange({ secretAccessKey: v })}
            currentRedacted={value.secretAccessKey === "******"}
          />
          <ConfigField
            id="cfg-endpoint"
            label="Endpoint"
            value={value.endpoint}
            onChange={(v) => onChange({ endpoint: v })}
          />
          <ConfigField
            id="cfg-cdn"
            label="CDN 域名"
            value={value.cdnDomain}
            onChange={(v) => onChange({ cdnDomain: v })}
          />
          <ConfigField
            id="cfg-prefix"
            label="路径前缀"
            value={value.prefix}
            onChange={(v) => onChange({ prefix: v })}
            className="sm:col-span-2"
          />
        </div>
      ) : null}
      {driver === "qiniu" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField
            id="cfg-bucket"
            label="Bucket"
            value={value.bucket}
            onChange={(v) => onChange({ bucket: v })}
            className="sm:col-span-2"
          />
          <ConfigField
            id="cfg-access-key"
            label="AccessKey"
            value={value.accessKey}
            onChange={(v) => onChange({ accessKey: v })}
          />
          <ConfigSecretField
            id="cfg-secret-key"
            label="SecretKey"
            value={value.secretKey}
            onChange={(v) => onChange({ secretKey: v })}
            currentRedacted={value.secretKey === "******"}
          />
          <ConfigField
            id="cfg-endpoint"
            label="上传域名"
            value={value.endpoint}
            onChange={(v) => onChange({ endpoint: v })}
            className="sm:col-span-2"
          />
          <ConfigField
            id="cfg-cdn"
            label="CDN 域名"
            value={value.cdnDomain}
            onChange={(v) => onChange({ cdnDomain: v })}
            className="sm:col-span-2"
          />
        </div>
      ) : null}
      {driver === "minio" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConfigField
            id="cfg-region"
            label="Region"
            value={value.region}
            onChange={(v) => onChange({ region: v })}
            placeholder="us-east-1"
          />
          <ConfigField
            id="cfg-bucket"
            label="Bucket"
            value={value.bucket}
            onChange={(v) => onChange({ bucket: v })}
          />
          <ConfigField
            id="cfg-endpoint"
            label="Endpoint"
            value={value.endpoint}
            onChange={(v) => onChange({ endpoint: v })}
            placeholder="https://minio.example.com"
            className="sm:col-span-2"
          />
          <ConfigField
            id="cfg-access-key"
            label="AccessKey"
            value={value.accessKey}
            onChange={(v) => onChange({ accessKey: v })}
          />
          <ConfigSecretField
            id="cfg-secret-access-key"
            label="SecretAccessKey"
            value={value.secretAccessKey}
            onChange={(v) => onChange({ secretAccessKey: v })}
            currentRedacted={value.secretAccessKey === "******"}
          />
          <ConfigField
            id="cfg-public-base"
            label="公网 URL"
            value={value.publicBaseUrl}
            onChange={(v) => onChange({ publicBaseUrl: v })}
            placeholder="https://cdn.example.com"
            className="sm:col-span-2"
          />
        </div>
      ) : null}
    </div>
  );
}

function ConfigField({
  id,
  label,
  value,
  onChange,
  placeholder,
  className,
  hint,
}: {
  id: string;
  label: string;
  value: string | number | boolean | null | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint ? <p className="text-[11px] text-text-mute">{hint}</p> : null}
    </div>
  );
}

function ConfigSecretField({
  id,
  label,
  value,
  onChange,
  currentRedacted,
  className,
}: {
  id: string;
  label: string;
  value: string | number | boolean | null | undefined;
  onChange: (v: string) => void;
  currentRedacted?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete="off"
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={currentRedacted ? "已隐藏，重新输入以覆盖" : "如:sk-xxxxxx"}
      />
      <p className="text-[11px] text-text-mute">
        当前以 <span className="font-mono">******</span> 形式回显；保存后会再次隐藏。
      </p>
    </div>
  );
}
