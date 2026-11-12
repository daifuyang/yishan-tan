import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
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
import { useResourcePermissions } from "~/features/permissions/permissions.queries";
import { usePostDepartmentOptions, usePostsList } from "~/features/posts/posts.queries";
import { type PostSortBy, postListQuerySchema } from "~/features/posts/posts.schema";
import type { PostDto } from "~/features/posts/posts.types";
import {
  useBulkDeletePosts,
  useCreatePost,
  useDeletePost,
  useUpdatePost,
} from "~/features/posts/posts.use-mutations";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  keyword: string;
  departmentId: string;
  sortMin: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  departmentId: "",
  sortMin: "",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

type EditPostFormValue = {
  name: string;
  departmentId: string;
  sort: number;
  status: "enabled" | "disabled";
};

const EMPTY_EDIT_FORM: EditPostFormValue = {
  name: "",
  departmentId: "",
  sort: 0,
  status: "enabled",
};

export const Route = createFileRoute("/admin/position")({
  component: AdminPostsPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminPostsPage() {
  // 列表状态（筛选 / 页码 / 每页条数 / 排序）与地址栏同步：
  // 刷新页面、分享链接都能回到同一份视图。
  const listState = useListUrlState({
    filterKeys: ["keyword", "departmentId", "sortMin", "status", "createdFrom", "createdTo"],
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 10,
    defaultSort: { sortKey: "sort", sortOrder: "asc" },
  });
  const filters = listState.filters as FilterState;
  const page = listState.page;
  const pageSize = listState.pageSize;
  const setPage = listState.setPage;
  const setPageSize = listState.setPageSize;
  // 筛选表单草稿：初值取自地址栏（刷新/分享链接后表单与列表一致）。
  const [draft, setDraft] = React.useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    ...listState.filters,
  }));

  const [editing, setEditing] = React.useState<PostDto | null>(null);
  const [editForm, setEditForm] = React.useState<EditPostFormValue>(EMPTY_EDIT_FORM);

  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<EditPostFormValue>(EMPTY_EDIT_FORM);

  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const permissions = useResourcePermissions("posts");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  // 排序：表格自带能力，服务端排序；变化后回到第一页。默认沿用列表原语义（排序值升序）。
  const sort = listState.sort as ResourceSortState<PostSortBy>;
  const onSortChange = listState.setSort;
  const list = usePostsListPage(filters, page, pageSize, sort, canRead);
  const departments = usePostDepartmentOptions(canRead);
  const departmentItems = departments.data ?? [];

  const createMut = useCreatePost();
  const updateMut = useUpdatePost();
  const deleteMut = useDeletePost();
  const bulkDeleteMut = useBulkDeletePosts();

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

  const handleStartEdit = (row: PostDto) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      departmentId: row.departmentId,
      sort: row.sort,
      status: row.status,
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleOpenCreate = () => {
    setCreateForm({
      ...EMPTY_EDIT_FORM,
      departmentId: departmentItems[0]?.id ?? "",
    });
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const handleToggleStatus = React.useCallback(
    async (row: PostDto) => {
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
    async (row: PostDto) => {
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
    async (row: PostDto) => {
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

  const dismissDeleteError = React.useCallback(() => {
    deleteMut.reset();
  }, [deleteMut]);

  const editDepartmentOptions = departmentItems.map((d) => ({ value: d.id, label: d.name }));
  const createDepartmentOptions = departmentItems
    .filter((d) => d.status === "enabled")
    .map((d) => ({ value: d.id, label: d.name }));

  const columns: ResourceColumn<PostDto>[] = [
    {
      key: "name",
      sortKey: "name",
      header: "名称",
      width: "180px",
      ellipsis: true,
      cell: (row) => <span className="text-[13px] text-text-strong">{row.name}</span>,
    },
    {
      key: "departmentName",
      header: "部门",
      width: "200px",
      ellipsis: true,
      cell: (row) => <span className="text-[13px] text-text-soft">{row.departmentName}</span>,
    },
    {
      key: "sort",
      sortKey: "sort",
      header: "排序",
      width: "70px",
      align: "center",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.sort}</span>,
    },
    {
      key: "userCount",
      header: "关联用户",
      width: "90px",
      align: "center",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.userCount} 人</span>,
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
                title="禁用岗位"
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
              <DropdownMenuContent align="end" sideOffset={8} className="w-32 rounded-[4px]">
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
      departmentId: editForm.departmentId,
      sort: editForm.sort,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    if (!canCreate) return;
    await createMut.mutateAsync({
      name: createForm.name,
      departmentId: createForm.departmentId,
      sort: createForm.sort,
      status: createForm.status,
    });
    setCreating(false);
  };

  return (
    <>
      {deleteMut.isError ? (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive"
        >
          <span>
            删除失败：
            {deleteMut.error instanceof Error ? deleteMut.error.message : "未知错误"}
          </span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 py-0 text-[13px] font-normal text-destructive hover:no-underline"
            onClick={dismissDeleteError}
          >
            知道了
          </Button>
        </div>
      ) : null}
      <ResourcePage
        title="岗位管理"
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

            <QueryFormItem label="部门" htmlFor="filter-department">
              <Select
                value={draft.departmentId || "all"}
                onValueChange={(v) => applyDraftPatch({ departmentId: v === "all" ? "" : v })}
              >
                <SelectTrigger id="filter-department" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {departmentItems.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="排序起" htmlFor="filter-sort-min">
              <Input
                id="filter-sort-min"
                type="number"
                min={0}
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="0"
                value={draft.sortMin}
                onChange={(e) => applyDraftPatch({ sortMin: e.target.value })}
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
        toolbarTitle="岗位列表"
        toolbarActions={
          <Button type="button" size="sm" disabled={!canCreate} onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新建
          </Button>
        }
        tableProps={{
          settingsKey: "position",
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
                title={`批量删除 ${selectedKeys.length} 个岗位？`}
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
          columns: columns as ResourceColumn<PostDto>[],
          data: items,
          rowKey: (row) => row.id,
          pagination: {
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextPageSize) => {
              if (nextPageSize !== pageSize) {
                setPageSize(nextPageSize);
                setSelectedKeys([]);
                return;
              }
              setPage(nextPage);
              setSelectedKeys([]);
            },
            showSizeChanger: true,
          },
          loading: permissions.isPending || list.isFetching,
          sort: sort,
          onSortChange: onSortChange,
          onRetry: canRead ? () => void list.refetch() : undefined,
          emptyDescription: permissions.error ?? (list.isError ? list.error.message : undefined),
          emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无岗位",
          error:
            permissions.error ??
            (departments.isError
              ? "无法加载部门选项，请重试"
              : list.isError
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
        title="编辑岗位"
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
          <EditPostFields
            key={editing.id}
            value={editForm}
            departmentOptions={editDepartmentOptions}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新建岗位"
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
        <EditPostFields
          key="create-form"
          value={createForm}
          departmentOptions={createDepartmentOptions}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

function buildListQuery(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<PostSortBy>,
) {
  const trim = (v: string) => v.trim() || undefined;
  const sortMinNum = filters.sortMin.trim() === "" ? undefined : Number(filters.sortMin);
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  return postListQuerySchema.parse({
    page,
    pageSize,
    keyword: trim(filters.keyword),
    departmentId: trim(filters.departmentId),
    sortMin: sortMinNum !== undefined && Number.isFinite(sortMinNum) ? sortMinNum : undefined,
    status: filters.status === "all" ? undefined : filters.status,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  });
}

function usePostsListPage(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<PostSortBy>,
  enabled: boolean,
) {
  const query = React.useMemo(
    () => buildListQuery(filters, page, pageSize, sort),
    [filters, page, pageSize, sort],
  );
  return usePostsList(query, enabled);
}

function EditPostFields({
  value,
  departmentOptions,
  onChange,
}: {
  value: EditPostFormValue;
  departmentOptions: Array<{ value: string; label: string }>;
  onChange: (patch: Partial<EditPostFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="post-name">名称</Label>
          <Input
            id="post-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="岗位显示名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-department">所属部门</Label>
          <Select value={value.departmentId} onValueChange={(v) => onChange({ departmentId: v })}>
            <SelectTrigger id="post-department">
              <SelectValue placeholder="请选择部门" />
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.length === 0 ? (
                <SelectItem value="__empty__" disabled>
                  暂无可选部门
                </SelectItem>
              ) : null}
              {departmentOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-sort">排序</Label>
          <Input
            id="post-sort"
            type="number"
            min={0}
            max={9999}
            value={value.sort}
            onChange={(e) => {
              const next = Number(e.target.value);
              onChange({
                sort: Number.isFinite(next) && next >= 0 ? Math.min(next, 9999) : 0,
              });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="post-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
