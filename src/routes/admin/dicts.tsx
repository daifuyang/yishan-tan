import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Plus, Settings2, Trash2 } from "lucide-react";
import * as React from "react";

import {
  QueryFormItem,
  type ResourceColumn,
  type ResourceSortState,
  useListUrlState,
} from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TABLE_DANGER_ACTION_CLASS,
  TEXTAREA_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { DateRangePicker, Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
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
import { type DictTypeSortBy, dictTypeListQuerySchema } from "~/features/dicts/dicts.schema";
import type { DictTypeListItemDto } from "~/features/dicts/dicts.types";
import {
  useBulkDeleteDictTypes,
  useCreateDictType,
  useDeleteDictType,
  useUpdateDictType,
} from "~/features/dicts/dicts.use-mutations";
import { useResourcePermissions } from "~/features/permissions/permissions.queries";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

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

export const Route = createFileRoute("/admin/dicts")({
  component: AdminDictsRoute,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminDictsRoute() {
  const { pathname } = useLocation();
  return pathname.replace(/\/$/, "") === "/admin/dicts" ? <AdminDictsPage /> : <Outlet />;
}

function AdminDictsPage() {
  const navigate = useNavigate();
  // 列表状态（筛选 / 页码 / 每页条数 / 排序）与地址栏同步：
  // 刷新页面、分享链接都能回到同一份视图。
  const listState = useListUrlState({
    filterKeys: ["name", "code", "description", "status", "createdFrom", "createdTo"],
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 10,
    defaultSort: { sortKey: "createdAt", sortOrder: "asc" },
  });
  const filters = listState.filters as FilterState;
  const page = listState.page;
  const pageSize = listState.pageSize;
  const setPage = listState.setPage;
  const setPageSize = listState.setPageSize;
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [editing, setEditing] = React.useState<DictTypeListItemDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<EditDictTypeFormValue>(EMPTY_TYPE_FORM);
  const [createForm, setCreateForm] = React.useState<CreateDictTypeFormValue>(EMPTY_TYPE_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const permissions = useResourcePermissions("dicts");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  // 排序：表格自带能力，服务端排序；变化后回到第一页。
  const sort = listState.sort as ResourceSortState<DictTypeSortBy>;
  const onSortChange = listState.setSort;
  const query = dictTypeListQuerySchema.parse(buildListQuery(filters, page, pageSize, sort));
  const list = useDictTypesList(query, canRead);
  const createMut = useCreateDictType();
  const updateMut = useUpdateDictType();
  const deleteMut = useDeleteDictType();
  const bulkDeleteMut = useBulkDeleteDictTypes();

  const items = canRead ? (list.data?.items ?? []) : [];
  const total = canRead ? (list.data?.total ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total, setPage]);

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleFilterSubmit = () => {
    listState.setFilters(draft);
    setSelectedKeys([]);
  };

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    listState.resetFilters();
    setSelectedKeys([]);
  }, [listState]);

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

  const closeRowConfirms = React.useCallback(() => {
    setPopconfirmRowId(null);
    setDisablePopconfirmRowId(null);
  }, []);

  const handleDisableConfirm = React.useCallback(
    async (row: DictTypeListItemDto) => {
      try {
        await handleToggleStatus(row);
        setDisablePopconfirmRowId(null);
        return true;
      } catch {
        return false;
      }
    },
    [handleToggleStatus],
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
      sortKey: "name",
      header: "名称",
      width: "160px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "code",
      sortKey: "code",
      header: "编码",
      width: "160px",
      ellipsis: true,
      cell: (row) => (
        <span className={MONO_CELL} title={row.code}>
          {row.code}
        </span>
      ),
    },
    {
      key: "description",
      header: "描述",
      width: "240px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-soft" title={row.description ?? ""}>
          {row.description ?? <span className="text-text-mute">--</span>}
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
      sortKey: "createdAt",
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
              disabled={!canUpdate}
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(row);
              }}
            >
              编辑
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
                disabled={!canUpdate || updateMut.isPending}
              >
                启用
              </Button>
            ) : (
              <Popconfirm
                open={disablePopconfirmRowId === row.id}
                onOpenChange={(next) => {
                  if (!next && disablePopconfirmRowId === row.id) setDisablePopconfirmRowId(null);
                }}
                title="禁用字典类型"
                description="你确认禁用吗？"
                confirmLabel="禁用"
                tone="danger"
                loading={updateMut.isPending && disablePopconfirmRowId === row.id}
                onConfirm={() => {
                  void handleDisableConfirm(row);
                }}
                placement="top"
                sideOffset={8}
                arrow
              >
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={TABLE_DANGER_ACTION_CLASS}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMoreMenuRowId(null);
                    setDisablePopconfirmRowId(row.id);
                  }}
                  disabled={updateMut.isPending}
                >
                  禁用
                </Button>
              </Popconfirm>
            )}
            <DropdownMenu
              open={moreMenuRowId === row.id}
              onOpenChange={(next) => {
                if (next) closeRowConfirms();
                setMoreMenuRowId(next ? row.id : null);
                if (!next && disablePopconfirmRowId === row.id) setDisablePopconfirmRowId(null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={TABLE_ACTION_CLASS}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeRowConfirms();
                  }}
                >
                  更多
                  <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-36 rounded-[4px]">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setMoreMenuRowId(null);
                    handleManageData(row);
                  }}
                >
                  <Settings2 className="size-3.5" aria-hidden />
                  管理字典数据
                </DropdownMenuItem>
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
                  placement="top"
                  sideOffset={8}
                  arrow
                >
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={!canDelete || deleteMut.isPending}
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuRowId(null);
                      setPopconfirmRowId(row.id);
                    }}
                  >
                    删除
                  </DropdownMenuItem>
                </Popconfirm>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const handleEditSubmit = async () => {
    if (!editing || !canUpdate) return;
    await updateMut.mutateAsync({
      id: editing.id,
      name: editForm.name,
      description: editForm.description || undefined,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    if (!canCreate) return;
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
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="名称" htmlFor="filter-name">
              <Input
                id="filter-name"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.name}
                onChange={(e) => applyDraftPatch({ name: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="编码" htmlFor="filter-code">
              <Input
                id="filter-code"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.code}
                onChange={(e) => applyDraftPatch({ code: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="描述" htmlFor="filter-description">
              <Input
                id="filter-description"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.description}
                onChange={(e) => applyDraftPatch({ description: e.target.value })}
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
        toolbarTitle="字典类型"
        toolbarActions={
          <Button type="button" size="sm" disabled={!canCreate} onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新建字典类型
          </Button>
        }
        tableProps={{
          settingsKey: "dicts-types",
          toolbar: {
            // 批量操作放在表格上方的选中态提示条里（对齐 antd ProTable）。
            selectionActions: (
              <Popconfirm
                open={bulkDeletePopconfirmOpen}
                onOpenChange={(next) => {
                  if (!next && bulkDeletePopconfirmOpen) {
                    setBulkDeletePopconfirmOpen(false);
                    bulkDeleteMut.reset();
                  }
                }}
                title={`批量删除 ${selectedKeys.length} 个字典类型？`}
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
                  disabled={!canDelete || bulkDeleteMut.isPending}
                  onClick={() => setBulkDeletePopconfirmOpen(true)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  批量删除
                </Button>
              </Popconfirm>
            ),
          },
          columns: columns as ResourceColumn<DictTypeListItemDto>[],
          data: items,
          rowKey: (row) => row.id,
          pagination: {
            current: page,
            pageSize,
            total,
            onChange: (nextPage: number, nextPageSize: number) => {
              setSelectedKeys([]);
              if (nextPageSize !== pageSize) {
                setPageSize(nextPageSize);
                return;
              }
              setPage(nextPage);
            },
            showSizeChanger: true,
          },
          loading: permissions.isPending || list.isFetching,
          sort: sort,
          onSortChange: onSortChange,
          onRetry: canRead ? () => void list.refetch() : undefined,
          emptyDescription: permissions.error ?? (list.isError ? list.error.message : undefined),
          emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无字典类型",
          error:
            permissions.error ??
            (list.isError
              ? list.error instanceof Error
                ? list.error.message
                : "加载失败"
              : undefined),
          rowSelection: canDelete
            ? {
                selectedKeys,
                onChange: setSelectedKeys,
              }
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
        title="新建字典类型"
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

function buildListQuery(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<DictTypeSortBy>,
) {
  const trim = (v: string) => v.trim() || undefined;
  const name = trim(filters.name);
  const code = trim(filters.code);
  const description = trim(filters.description);
  const status = filters.status === "all" ? undefined : filters.status;
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  return {
    page,
    pageSize,
    name,
    code,
    description,
    status,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
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
