import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, ChevronDown } from "lucide-react";
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
import { useDepartmentsList } from "~/features/departments/departments.queries";
import { usePostsList } from "~/features/posts/posts.queries";
import { postListQuerySchema } from "~/features/posts/posts.schema";
import type { PostDto } from "~/features/posts/posts.types";
import { useCreatePost, useDeletePost, useUpdatePost } from "~/features/posts/posts.use-mutations";

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

const FILTER_CONTROL_CLASS = "h-8 w-full text-[13px]";
const TABLE_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-brand-600 hover:bg-transparent hover:text-brand-700 hover:no-underline disabled:text-text-mute";
const TABLE_DANGER_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-destructive hover:bg-transparent hover:text-destructive hover:no-underline disabled:text-text-mute";

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

const DEPARTMENT_QUERY = { page: 1, pageSize: 100, status: "enabled" as const };

export const Route = createFileRoute("/admin/posts")({
  component: AdminPostsPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminPostsPage() {
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [editing, setEditing] = React.useState<PostDto | null>(null);
  const [editForm, setEditForm] = React.useState<EditPostFormValue>(EMPTY_EDIT_FORM);

  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<EditPostFormValue>(EMPTY_EDIT_FORM);

  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);

  const list = usePostsListPage(filters, page, pageSize);
  const departments = useDepartmentsList(DEPARTMENT_QUERY);
  const departmentItems = departments.data?.items ?? [];

  const createMut = useCreatePost();
  const updateMut = useUpdatePost();
  const deleteMut = useDeletePost();

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // biome-ignore lint/correctness/useExhaustiveDependencies: filter fields used only as reset trigger
  React.useEffect(() => {
    setPage(1);
  }, [
    filters.keyword,
    filters.departmentId,
    filters.sortMin,
    filters.status,
    filters.createdFrom,
    filters.createdTo,
  ]);

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  const applyFilterPatch = React.useCallback((patch: Partial<FilterState>) => {
    setFilters((s) => ({ ...s, ...patch }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

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

  const dismissDeleteError = React.useCallback(() => {
    deleteMut.reset();
  }, [deleteMut]);

  // 编辑时部门选项：排除自身及其子部门（防环）
  const editDepartmentOptions = React.useMemo(() => {
    if (!editing) return [] as Array<{ value: string; label: string }>;
    const blockedIds = collectDescendantIds(departmentItems, editing.departmentId);
    blockedIds.add(editing.departmentId);
    return departmentItems
      .filter((d) => !blockedIds.has(d.id))
      .map((d) => ({ value: d.id, label: d.name }));
  }, [editing, departmentItems]);

  const createDepartmentOptions = React.useMemo(
    () => departmentItems.map((d) => ({ value: d.id, label: d.name })),
    [departmentItems],
  );

  const columns: ResourceColumn<PostDto>[] = [
    {
      key: "name",
      header: "名称",
      width: "180px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "departmentName",
      header: "部门",
      width: "200px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.departmentName}>
          {row.departmentName}
        </span>
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
              <DropdownMenuContent align="end" sideOffset={8} className="w-32 rounded-[4px]">
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
              description="删除后该岗位将被停用，关联用户的岗位绑定会自动解绑。"
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
      departmentId: editForm.departmentId,
      sort: editForm.sort,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
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
        description="维护岗位及其所属部门。"
        filterColumns={3}
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="名称" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                placeholder="按名称模糊搜索"
                value={filters.keyword}
                onChange={(e) => applyFilterPatch({ keyword: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="部门" htmlFor="filter-department">
              <Select
                value={filters.departmentId || "all"}
                onValueChange={(v) => applyFilterPatch({ departmentId: v === "all" ? "" : v })}
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
                placeholder="0"
                value={filters.sortMin}
                onChange={(e) => applyFilterPatch({ sortMin: e.target.value })}
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
            keyword: String(next.keyword ?? ""),
            departmentId: String(next.departmentId ?? ""),
            sortMin: String(next.sortMin ?? ""),
            status: (next.status as StatusFilter) ?? "all",
            createdFrom: String(next.createdFrom ?? ""),
            createdTo: String(next.createdTo ?? ""),
          })
        }
        onFilterReset={handleResetFilters}
        filterLoading={list.isFetching}
        toolbarTitle="岗位列表"
        toolbarActions={
          <Button type="button" size="sm" onClick={handleOpenCreate}>
            <Briefcase className="size-3.5" aria-hidden />
            新增岗位
          </Button>
        }
        tableProps={{
          columns: columns as ResourceColumn<PostDto>[],
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
          emptyTitle: "暂无岗位",
          emptyDescription: list.isError
            ? "加载岗位列表失败，请稍后重试或检查后端日志。"
            : "尚未配置任何岗位，点击「新增岗位」开始搭建岗位体系。",
          emptyAction: list.isError ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void list.refetch()}>
              重试
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handleOpenCreate}>
              新增岗位
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
        title="新增岗位"
        description="填写名称并指定所属部门。"
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

type DepartmentItem = { id: string; parentId: string | null; name: string };

function collectDescendantIds(
  allDepartments: readonly DepartmentItem[],
  rootId: string,
): Set<string> {
  const result = new Set<string>();
  const childMap = new Map<string, string[]>();
  for (const d of allDepartments) {
    if (!d.parentId) continue;
    const list = childMap.get(d.parentId) ?? [];
    list.push(d.id);
    childMap.set(d.parentId, list);
  }
  const queue: string[] = [rootId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || result.has(current)) continue;
    result.add(current);
    const kids = childMap.get(current) ?? [];
    for (const k of kids) queue.push(k);
  }
  return result;
}

function buildListQuery(filters: FilterState, page: number, pageSize: number) {
  const trim = (v: string) => v.trim() || undefined;
  const sortMinNum = filters.sortMin.trim() === "" ? undefined : Number(filters.sortMin);
  return postListQuerySchema.parse({
    page,
    pageSize,
    keyword: trim(filters.keyword),
    departmentId: trim(filters.departmentId),
    sortMin: sortMinNum !== undefined && Number.isFinite(sortMinNum) ? sortMinNum : undefined,
    status: filters.status === "all" ? undefined : filters.status,
    createdFrom: trim(filters.createdFrom),
    createdTo: trim(filters.createdTo),
  });
}

function usePostsListPage(filters: FilterState, page: number, pageSize: number) {
  const query = React.useMemo(
    () => buildListQuery(filters, page, pageSize),
    [filters, page, pageSize],
  );
  return usePostsList(query);
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
