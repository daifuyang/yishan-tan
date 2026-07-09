import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TABLE_DANGER_ACTION_CLASS,
  TEXTAREA_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { DateRangePicker, Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { PageHeader, ResourcePage } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictDataByCode, useDictDataList } from "~/features/dicts/dicts.queries";
import { dictDataListQuerySchema } from "~/features/dicts/dicts.schema";
import type { DictDataDto } from "~/features/dicts/dicts.types";
import {
  useBulkDeleteDictDatas,
  useCreateDictData,
  useDeleteDictData,
  useUpdateDictData,
} from "~/features/dicts/dicts.use-mutations";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  label: string;
  value: string;
  extra: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  label: "",
  value: "",
  extra: "",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

export const Route = createFileRoute("/admin/dicts/$typeCode")({
  component: AdminDictDataPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminDictDataPage() {
  const navigate = useNavigate();
  const { typeCode } = Route.useParams();
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<DictDataDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<EditDictDataFormValue>(EMPTY_DATA_FORM);
  const [createForm, setCreateForm] = React.useState<CreateDictDataFormValue>(EMPTY_DATA_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const query = dictDataListQuerySchema.parse(buildListQuery(typeCode, filters, page, pageSize));
  const list = useDictDataList(query);
  // 同步触发 dictDataByCode 的 invalidation（创建/更新/删除 dictData 后会清理）
  // 该查询的缓存被 use-mutations 的 dictsQueryKey.datas() invalidate 触发刷新，
  // 这里调用以让 cache 在挂载时被填充，便于跨页面共享。
  useDictDataByCode(typeCode);
  const createMut = useCreateDictData();
  const updateMut = useUpdateDictData();
  const deleteMut = useDeleteDictData();
  const bulkDeleteMut = useBulkDeleteDictDatas();

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
    draft.label,
    draft.value,
    draft.extra,
    draft.status,
    draft.createdFrom,
    draft.createdTo,
    resetPageOnFilterChange,
  ]);

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleFilterSubmit = React.useCallback(() => {
    setFilters(draft);
  }, [draft]);

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleBack = React.useCallback(() => {
    void navigate({ to: "/admin/dicts" });
  }, [navigate]);

  const handleStartEdit = (row: DictDataDto) => {
    setEditing(row);
    setEditForm({
      label: row.label,
      value: row.value,
      sort: row.sort,
      status: row.status,
      extra: row.extra ?? "",
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleOpenCreate = () => {
    setCreateForm({ ...EMPTY_DATA_FORM });
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const handleToggleStatus = React.useCallback(
    async (row: DictDataDto) => {
      const next = row.status === "enabled" ? "disabled" : "enabled";
      try {
        await updateMut.mutateAsync({ id: row.id, status: next });
      } catch {
        // 错误已通过 useMutation errorMessage 暴露
      }
    },
    [updateMut],
  );

  const handleDeleteConfirm = React.useCallback(
    async (row: DictDataDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedKeys.length === 0) return;
    try {
      await bulkDeleteMut.mutateAsync(selectedKeys);
      setSelectedKeys([]);
      setBulkDeletePopconfirmOpen(false);
    } catch {
      // 错误由 useMutation 状态显示
    }
  }, [bulkDeleteMut, selectedKeys]);

  const columns: ResourceColumn<DictDataDto>[] = [
    {
      key: "label",
      header: "标签",
      width: "160px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-strong"
          title={row.label}
        >
          {row.label}
        </span>
      ),
    },
    {
      key: "value",
      header: "值",
      width: "160px",
      cell: (row) => (
        <code className="break-words whitespace-normal rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-text-soft">
          {row.value}
        </code>
      ),
    },
    {
      key: "sort",
      header: "排序",
      width: "70px",
      align: "center",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.sort}</span>,
    },
    {
      key: "extra",
      header: "描述",
      width: "240px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.extra ?? ""}
        >
          {row.extra ?? <span className="text-text-mute">--</span>}
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
      width: "200px",
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
              className={isDisabled ? TABLE_ACTION_CLASS : TABLE_DANGER_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                void handleToggleStatus(row);
              }}
              disabled={updateMut.isPending}
            >
              {isDisabled ? "启用" : "禁用"}
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_DANGER_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setPopconfirmRowId(row.id);
              }}
              disabled={deleteMut.isPending}
            >
              删除
            </Button>
            <Popconfirm
              open={popconfirmRowId === row.id}
              onOpenChange={(next) => {
                if (!next && popconfirmRowId === row.id) setPopconfirmRowId(null);
              }}
              title={`删除「${row.label}」？`}
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
          </div>
        );
      },
    },
  ];

  const handleEditSubmit = async () => {
    if (!editing) return;
    await updateMut.mutateAsync({
      id: editing.id,
      label: editForm.label,
      value: editForm.value,
      sort: editForm.sort,
      status: editForm.status,
      extra: editForm.extra || undefined,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      typeCode,
      label: createForm.label,
      value: createForm.value,
      sort: createForm.sort,
      status: createForm.status,
      extra: createForm.extra || undefined,
    });
    setCreating(false);
  };

  return (
    <>
      <PageHeader
        title="字典数据"
        description={`字典类型 ${typeCode}`}
        actions={
          <Button type="button" size="sm" variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-3.5" aria-hidden />
            返回字典类型
          </Button>
        }
        className="border-b-0 pb-0"
      />

      <ResourcePage<DictDataDto>
        title=""
        filterColumns={3}
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="标签" htmlFor="filter-label">
              <Input
                id="filter-label"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="如:启用"
                value={draft.label}
                onChange={(e) => applyDraftPatch({ label: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="值" htmlFor="filter-value">
              <Input
                id="filter-value"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="如:active"
                value={draft.value}
                onChange={(e) => applyDraftPatch({ value: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="描述" htmlFor="filter-extra">
              <Input
                id="filter-extra"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="如:补充说明"
                value={draft.extra}
                onChange={(e) => applyDraftPatch({ extra: e.target.value })}
              />
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
        toolbarTitle="字典数据列表"
        toolbarActions={
          <>
            {selectedKeys.length > 0 ? (
              <Popconfirm
                open={bulkDeletePopconfirmOpen}
                onOpenChange={(next) => {
                  if (!next && bulkDeletePopconfirmOpen) {
                    setBulkDeletePopconfirmOpen(false);
                    bulkDeleteMut.reset();
                  }
                }}
                title={`批量删除 ${selectedKeys.length} 个字典数据？`}
                description="你确认批量删除吗？"
                confirmLabel="删除"
                tone="danger"
                loading={bulkDeleteMut.isPending}
                onConfirm={() => void handleBulkDelete()}
                side="bottom"
                align="end"
                sideOffset={6}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={bulkDeleteMut.isPending}
                  onClick={() => setBulkDeletePopconfirmOpen(true)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  批量删除 ({selectedKeys.length})
                </Button>
              </Popconfirm>
            ) : null}
            <Button type="button" size="sm" onClick={handleOpenCreate}>
              <Plus className="size-3.5" aria-hidden />
              新建字典数据
            </Button>
          </>
        }
        tableProps={{
          columns: columns as ResourceColumn<DictDataDto>[],
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
          emptyTitle: "暂无字典数据",
          error: list.isError
            ? list.error instanceof Error
              ? list.error.message
              : "加载失败"
            : undefined,
          rowSelection: {
            selectedKeys,
            onChange: setSelectedKeys,
          },
        }}
      />

      <ResponsiveFormLayer
        open={editing !== null}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseEdit();
        }}
        title="编辑字典数据"
        description={editing?.typeCode}
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
          <EditDictDataFields
            key={editing.id}
            value={editForm}
            typeCode={typeCode}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新建字典数据"
        description={`归属字典类型 ${typeCode}`}
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
        <CreateDictDataFields
          key="create-form"
          value={createForm}
          typeCode={typeCode}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type EditDictDataFormValue = {
  label: string;
  value: string;
  sort: number;
  status: "enabled" | "disabled";
  extra: string;
};

type CreateDictDataFormValue = EditDictDataFormValue;

const EMPTY_DATA_FORM: CreateDictDataFormValue = {
  label: "",
  value: "",
  sort: 0,
  status: "enabled",
  extra: "",
};

function buildListQuery(typeCode: string, filters: FilterState, page: number, pageSize: number) {
  const trim = (v: string) => v.trim() || undefined;
  const label = trim(filters.label);
  const value = trim(filters.value);
  const extra = trim(filters.extra);
  const status = filters.status === "all" ? undefined : filters.status;
  const createdFrom = trim(filters.createdFrom);
  const createdTo = trim(filters.createdTo);
  const keyword = [label, value, extra].filter(Boolean).join(" ") || undefined;
  return {
    page,
    pageSize,
    typeCode,
    keyword,
    status,
    createdFrom,
    createdTo,
  };
}

function EditDictDataFields({
  value,
  typeCode,
  onChange,
}: {
  value: EditDictDataFormValue;
  typeCode: string;
  onChange: (patch: Partial<EditDictDataFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[4px] border border-line bg-muted px-3 py-2 text-[13px] text-text-soft">
        <span className="text-text-mute">类型编码</span>
        <code className="font-mono text-text-strong">{typeCode}</code>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-label">标签</Label>
          <Input
            id="dict-data-label"
            value={value.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="显示文本"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-value">值</Label>
          <Input
            id="dict-data-value"
            value={value.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="实际存储值"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-sort">排序</Label>
          <Input
            id="dict-data-sort"
            type="number"
            min={0}
            max={9999}
            value={value.sort}
            onChange={(e) => onChange({ sort: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="dict-data-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dict-data-extra">描述</Label>
        <textarea
          id="dict-data-extra"
          value={value.extra}
          onChange={(e) => onChange({ extra: e.target.value })}
          placeholder="可选，附加说明或 JSON 字符串"
          maxLength={500}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>
    </div>
  );
}

function CreateDictDataFields({
  value,
  typeCode,
  onChange,
}: {
  value: CreateDictDataFormValue;
  typeCode: string;
  onChange: (patch: Partial<CreateDictDataFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[4px] border border-line bg-muted px-3 py-2 text-[13px] text-text-soft">
        <span className="text-text-mute">类型编码</span>
        <code className="font-mono text-text-strong">{typeCode}</code>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-create-label">标签</Label>
          <Input
            id="dict-data-create-label"
            value={value.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="显示文本"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-create-value">值</Label>
          <Input
            id="dict-data-create-value"
            value={value.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="实际存储值"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-create-sort">排序</Label>
          <Input
            id="dict-data-create-sort"
            type="number"
            min={0}
            max={9999}
            value={value.sort}
            onChange={(e) => onChange({ sort: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-data-create-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="dict-data-create-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dict-data-create-extra">描述</Label>
        <textarea
          id="dict-data-create-extra"
          value={value.extra}
          onChange={(e) => onChange({ extra: e.target.value })}
          placeholder="可选，附加说明或 JSON 字符串"
          maxLength={500}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>
    </div>
  );
}
