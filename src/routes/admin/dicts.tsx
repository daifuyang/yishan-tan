import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Plus, Settings2 } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/display";
import { Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { ResourcePage } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
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
import { useDictTypesList } from "~/features/dicts/dicts.queries";
import { dictTypeListQuerySchema } from "~/features/dicts/dicts.schema";
import type { DictTypeListItemDto } from "~/features/dicts/dicts.types";
import {
  useCreateDictType,
  useDeleteDictType,
  useUpdateDictType,
} from "~/features/dicts/dicts.use-mutations";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  name: string;
  code: string;
  description: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  name: "",
  code: "",
  description: "",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

const FILTER_CONTROL_CLASS = "h-8 w-full text-[13px]";
const TABLE_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-brand-600 hover:bg-transparent hover:text-brand-700 hover:no-underline disabled:text-text-mute";
const TABLE_DANGER_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-destructive hover:bg-transparent hover:text-destructive hover:no-underline disabled:text-text-mute";
const TEXTAREA_CLASS =
  "border-line flex w-full min-w-0 rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40";

export const Route = createFileRoute("/admin/dicts")({
  component: AdminDictsPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminDictsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<DictTypeListItemDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<EditDictTypeFormValue>(EMPTY_TYPE_FORM);
  const [createForm, setCreateForm] = React.useState<CreateDictTypeFormValue>(EMPTY_TYPE_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);

  const query = dictTypeListQuerySchema.parse(buildListQuery(filters, page, pageSize));
  const list = useDictTypesList(query);
  const createMut = useCreateDictType();
  const updateMut = useUpdateDictType();
  const deleteMut = useDeleteDictType();

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
    filters.name,
    filters.code,
    filters.description,
    filters.status,
    filters.createdFrom,
    filters.createdTo,
    resetPageOnFilterChange,
  ]);

  const applyFilterPatch = React.useCallback((patch: Partial<FilterState>) => {
    setFilters((s) => ({ ...s, ...patch }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleStartEdit = (row: DictTypeListItemDto) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      description: row.description ?? "",
      status: row.status,
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleOpenCreate = () => {
    setCreateForm({ ...EMPTY_TYPE_FORM });
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const handleToggleStatus = React.useCallback(
    async (row: DictTypeListItemDto) => {
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
    async (row: DictTypeListItemDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const handleManageData = React.useCallback(
    (row: DictTypeListItemDto) => {
      void navigate({
        to: "/admin/dicts/$typeCode",
        params: { typeCode: row.code },
      });
    },
    [navigate],
  );

  const columns: ResourceColumn<DictTypeListItemDto>[] = [
    {
      key: "name",
      header: "名称",
      width: "160px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "编码",
      width: "160px",
      cell: (row) => (
        <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-text-soft">
          {row.code}
        </code>
      ),
    },
    {
      key: "description",
      header: "描述",
      width: "240px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.description ?? ""}>
          {row.description ?? <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "dataCount",
      header: "字典数据",
      width: "100px",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.dataCount} 项</span>,
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
              <DropdownMenuContent align="end" sideOffset={8} className="w-36 rounded-[4px]">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    handleManageData(row);
                  }}
                >
                  <Settings2 className="size-3.5" aria-hidden />
                  管理字典数据
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  disabled={deleteMut.isPending}
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
              description="删除后该字典类型将被停用，已有的字典数据保留但无法再次使用。"
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
      name: editForm.name,
      description: editForm.description || undefined,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      name: createForm.name,
      code: createForm.code,
      description: createForm.description || undefined,
      status: createForm.status,
    });
    setCreating(false);
  };

  return (
    <>
      <ResourcePage
        title="字典管理"
        description="维护字典类型与字典数据。"
        filterColumns={3}
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="名称" htmlFor="filter-name">
              <Input
                id="filter-name"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.name}
                onChange={(e) => applyFilterPatch({ name: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="编码" htmlFor="filter-code">
              <Input
                id="filter-code"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.code}
                onChange={(e) => applyFilterPatch({ code: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="描述" htmlFor="filter-description">
              <Input
                id="filter-description"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.description}
                onChange={(e) => applyFilterPatch({ description: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-status">
              <Select
                value={filters.status}
                onValueChange={(v) => applyFilterPatch({ status: v as StatusFilter })}
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

            <QueryFormItem label="创建时间起" htmlFor="filter-created-from">
              <Input
                id="filter-created-from"
                type="datetime-local"
                className={FILTER_CONTROL_CLASS}
                value={filters.createdFrom}
                onChange={(e) => applyFilterPatch({ createdFrom: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="创建时间止" htmlFor="filter-created-to">
              <Input
                id="filter-created-to"
                type="datetime-local"
                className={FILTER_CONTROL_CLASS}
                value={filters.createdTo}
                onChange={(e) => applyFilterPatch({ createdTo: e.target.value })}
              />
            </QueryFormItem>
          </>
        }
        filterValues={filters}
        onFilterChange={(next) =>
          setFilters({
            name: String(next.name ?? ""),
            code: String(next.code ?? ""),
            description: String(next.description ?? ""),
            status: (next.status as StatusFilter) ?? "all",
            createdFrom: String(next.createdFrom ?? ""),
            createdTo: String(next.createdTo ?? ""),
          })
        }
        onFilterReset={handleResetFilters}
        filterLoading={list.isFetching}
        toolbarTitle="字典类型"
        toolbarActions={
          <Button type="button" size="sm" onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新增字典类型
          </Button>
        }
        tableProps={{
          columns: columns as ResourceColumn<DictTypeListItemDto>[],
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
          emptyTitle: "暂无字典类型",
          emptyDescription: list.isError
            ? "加载字典类型失败，请稍后重试或检查后端日志。"
            : "当前筛选条件下没有匹配的字典类型，试着调整关键词或状态。",
          emptyAction: list.isError ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void list.refetch()}>
              重试
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handleResetFilters}>
              清空筛选
            </Button>
          ),
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
        title="编辑字典类型"
        description={editing?.code}
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
          <EditDictTypeFields
            key={editing.id}
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
        title="新增字典类型"
        description="填写基础信息创建字典类型。"
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
        <CreateDictTypeFields
          key="create-form"
          value={createForm}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type EditDictTypeFormValue = {
  name: string;
  description: string;
  status: "enabled" | "disabled";
};

type CreateDictTypeFormValue = EditDictTypeFormValue & {
  code: string;
};

const EMPTY_TYPE_FORM: CreateDictTypeFormValue = {
  name: "",
  code: "",
  description: "",
  status: "enabled",
};

function buildListQuery(filters: FilterState, page: number, pageSize: number) {
  const trim = (v: string) => v.trim() || undefined;
  const name = trim(filters.name);
  const code = trim(filters.code);
  const description = trim(filters.description);
  const status = filters.status === "all" ? undefined : filters.status;
  const createdFrom = trim(filters.createdFrom);
  const createdTo = trim(filters.createdTo);
  const keyword = [name, code, description].filter(Boolean).join(" ") || undefined;
  return {
    page,
    pageSize,
    keyword,
    status,
    createdFrom,
    createdTo,
  };
}

function EditDictTypeFields({
  value,
  onChange,
}: {
  value: EditDictTypeFormValue;
  onChange: (patch: Partial<EditDictTypeFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="dict-type-name">名称</Label>
        <Input
          id="dict-type-name"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="字典类型显示名"
          maxLength={50}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dict-type-description">描述</Label>
        <textarea
          id="dict-type-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="可选，简要说明该字典的用途"
          maxLength={200}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dict-type-status">状态</Label>
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
        >
          <SelectTrigger id="dict-type-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CreateDictTypeFields({
  value,
  onChange,
}: {
  value: CreateDictTypeFormValue;
  onChange: (patch: Partial<CreateDictTypeFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dict-type-create-name">名称</Label>
          <Input
            id="dict-type-create-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="字典类型显示名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dict-type-create-code">编码</Label>
          <Input
            id="dict-type-create-code"
            value={value.code}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder="小写字母、数字、_ . -"
            maxLength={50}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dict-type-create-description">描述</Label>
        <textarea
          id="dict-type-create-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="可选，简要说明该字典的用途"
          maxLength={200}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dict-type-create-status">状态</Label>
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
        >
          <SelectTrigger id="dict-type-create-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
