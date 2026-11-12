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
  TEXTAREA_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import {
  DateRangePicker,
  Popconfirm,
  ResponsiveFormLayer,
  type TreeNode,
  TreeSelect,
} from "@/components/admin/form";
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
import {
  usePortalCategoriesList,
  usePortalCategoryOptions,
} from "~/features/portal-content/portal-content.queries";
import {
  type PortalCategorySortBy,
  portalCategoryListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import type { PortalCategoryDto } from "~/features/portal-content/portal-content.types";
import {
  useBulkDeletePortalCategories,
  useCreatePortalCategory,
  useDeletePortalCategory,
  useUpdatePortalCategory,
} from "~/features/portal-content/portal-content.use-mutations";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  name: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  name: "",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

type CategoryFormValue = {
  name: string;
  slug: string;
  parentId: string | null;
  status: "enabled" | "disabled";
  sortOrder: string;
  description: string;
};

const EMPTY_FORM: CategoryFormValue = {
  name: "",
  slug: "",
  parentId: null,
  status: "enabled",
  sortOrder: "0",
  description: "",
};

export const Route = createFileRoute("/admin/portal/categories")({
  component: AdminPortalCategoriesPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 把扁平分类列表拼成树，供「上级分类」选择器使用。 */
function buildCategoryTree(items: PortalCategoryDto[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const item of items) {
    nodes.set(item.id, { value: item.id, label: item.name, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const item of items) {
    const node = nodes.get(item.id);
    if (!node) continue;
    const parent = item.parentId ? nodes.get(item.parentId) : undefined;
    if (parent) {
      parent.children = [...(parent.children ?? []), node];
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function AdminPortalCategoriesPage() {
  const listState = useListUrlState({
    filterKeys: ["name", "status", "createdFrom", "createdTo"],
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 10,
    defaultSort: { sortKey: "createdAt", sortOrder: "desc" },
  });
  const filters = listState.filters as FilterState;
  const page = listState.page;
  const pageSize = listState.pageSize;
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [editing, setEditing] = React.useState<PortalCategoryDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<CategoryFormValue>(EMPTY_FORM);
  const [createForm, setCreateForm] = React.useState<CategoryFormValue>(EMPTY_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const permissions = useResourcePermissions("portal-categories");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  const sort = listState.sort as ResourceSortState<PortalCategorySortBy>;
  const query = portalCategoryListQuerySchema.parse(buildListQuery(filters, page, pageSize, sort));
  const list = usePortalCategoriesList(query, canRead);
  const options = usePortalCategoryOptions(canRead);
  const createMut = useCreatePortalCategory();
  const updateMut = useUpdatePortalCategory();
  const deleteMut = useDeletePortalCategory();
  const bulkDeleteMut = useBulkDeletePortalCategories(selectedKeys);

  const items = canRead ? (list.data?.items ?? []) : [];
  const total = canRead ? (list.data?.total ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const treeOptions = React.useMemo(
    () => buildCategoryTree(options.data?.items ?? []),
    [options.data?.items],
  );
  const parentNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of options.data?.items ?? []) map.set(item.id, item.name);
    return map;
  }, [options.data?.items]);

  React.useEffect(() => {
    if (page > totalPages && total > 0) listState.setPage(totalPages);
  }, [page, totalPages, total, listState]);

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

  const handleStartEdit = (row: PortalCategoryDto) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      slug: row.slug ?? "",
      parentId: row.parentId,
      status: row.status,
      sortOrder: String(row.sortOrder),
      description: row.description ?? "",
    });
  };

  const handleToggleStatus = React.useCallback(
    async (row: PortalCategoryDto) => {
      const next = row.status === "enabled" ? "disabled" : "enabled";
      await updateMut.mutateAsync({ id: row.id, status: next });
    },
    [updateMut],
  );

  const handleDisableConfirm = React.useCallback(
    async (row: PortalCategoryDto) => {
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
    async (row: PortalCategoryDto) => {
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
      await bulkDeleteMut.mutateAsync();
      setSelectedKeys([]);
      setBulkDeletePopconfirmOpen(false);
    } catch {
      // 错误由 useMutation 状态显示
    }
  }, [bulkDeleteMut, selectedKeys]);

  const columns: ResourceColumn<PortalCategoryDto>[] = [
    {
      key: "name",
      sortKey: "name",
      header: "名称",
      width: "180px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "slug",
      header: "URL标识",
      width: "160px",
      ellipsis: true,
      cell: (row) => (
        <span className={MONO_CELL} title={row.slug ?? ""}>
          {row.slug ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "parentId",
      header: "上级分类",
      width: "160px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-soft">
          {row.parentId ? (parentNameById.get(row.parentId) ?? "--") : "顶级分类"}
        </span>
      ),
    },
    {
      key: "sortOrder",
      sortKey: "sortOrder",
      header: "排序",
      width: "80px",
      align: "right",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.sortOrder}</span>,
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
      key: "updatedAt",
      sortKey: "updatedAt",
      header: "更新时间",
      width: "170px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.updatedAt)}</span>
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
                disabled={!canUpdate || updateMut.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleToggleStatus(row);
                }}
              >
                启用
              </Button>
            ) : (
              <Popconfirm
                open={disablePopconfirmRowId === row.id}
                onOpenChange={(next) => {
                  if (!next && disablePopconfirmRowId === row.id) setDisablePopconfirmRowId(null);
                }}
                title="禁用分类"
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
                if (next) setDisablePopconfirmRowId(null);
                setMoreMenuRowId(next ? row.id : null);
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
                    setDisablePopconfirmRowId(null);
                  }}
                >
                  更多
                  <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-36 rounded-[4px]">
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

  const toPayload = (form: CategoryFormValue) => ({
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    parentId: form.parentId ?? null,
    status: form.status,
    sortOrder: Number(form.sortOrder) || 0,
    description: form.description.trim() || undefined,
  });

  const handleEditSubmit = async () => {
    if (!editing || !canUpdate) return;
    await updateMut.mutateAsync({ id: editing.id, ...toPayload(editForm) });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    if (!canCreate) return;
    await createMut.mutateAsync(toPayload(createForm));
    setCreating(false);
  };

  return (
    <>
      <ResourcePage
        title="分类管理"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="名称" htmlFor="filter-category-name">
              <Input
                id="filter-category-name"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.name}
                onChange={(e) => applyDraftPatch({ name: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-category-status">
              <Select
                value={draft.status}
                onValueChange={(v) => applyDraftPatch({ status: v as StatusFilter })}
              >
                <SelectTrigger id="filter-category-status" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="创建时间" htmlFor="filter-category-created-range">
              <DateRangePicker
                id="filter-category-created-range"
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
        toolbarTitle="分类列表"
        toolbarActions={
          <Button
            type="button"
            size="sm"
            disabled={!canCreate}
            onClick={() => {
              setCreateForm({ ...EMPTY_FORM });
              setCreating(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden />
            新建
          </Button>
        }
        tableProps={{
          settingsKey: "portal-categories",
          toolbar: {
            selectionActions: (
              <Popconfirm
                open={bulkDeletePopconfirmOpen}
                onOpenChange={(next) => {
                  if (!next && bulkDeletePopconfirmOpen) {
                    setBulkDeletePopconfirmOpen(false);
                    bulkDeleteMut.reset();
                  }
                }}
                title={`批量删除 ${selectedKeys.length} 个分类？`}
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
          columns,
          data: items,
          rowKey: (row) => row.id,
          pagination: {
            current: page,
            pageSize,
            total,
            onChange: (nextPage: number, nextPageSize: number) => {
              setSelectedKeys([]);
              if (nextPageSize !== pageSize) {
                listState.setPageSize(nextPageSize);
                return;
              }
              listState.setPage(nextPage);
            },
            showSizeChanger: true,
          },
          loading: permissions.isPending || list.isFetching,
          sort,
          onSortChange: listState.setSort,
          onRetry: canRead ? () => void list.refetch() : undefined,
          emptyDescription: permissions.error ?? (list.isError ? list.error.message : undefined),
          emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无分类",
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
          if (!next) {
            setEditing(null);
            updateMut.reset();
          }
        }}
        title="编辑分类"
        description={editing?.slug ?? undefined}
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
          <CategoryFields
            key={editing.id}
            value={editForm}
            treeOptions={treeOptions}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) {
            setCreating(false);
            createMut.reset();
          }
        }}
        title="新建分类"
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
        <CategoryFields
          key="create-form"
          value={createForm}
          treeOptions={treeOptions}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

function CategoryFields({
  value,
  treeOptions,
  onChange,
}: {
  value: CategoryFormValue;
  treeOptions: TreeNode[];
  onChange: (patch: Partial<CategoryFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="portal-category-parent">上级分类</Label>
        <TreeSelect
          id="portal-category-parent"
          value={value.parentId}
          onChange={(next) => onChange({ parentId: (next as string | null) ?? null })}
          options={treeOptions}
          placeholder="顶级分类"
          emptyText="暂无可选分类"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-category-name">分类名称</Label>
          <Input
            id="portal-category-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="分类名称"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-category-slug">URL标识</Label>
          <Input
            id="portal-category-slug"
            value={value.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder="URL友好标识"
            maxLength={100}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-category-sort">排序序号</Label>
          <Input
            id="portal-category-sort"
            value={value.sortOrder}
            onChange={(e) => onChange({ sortOrder: e.target.value })}
            inputMode="numeric"
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-category-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="portal-category-status">
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
        <Label htmlFor="portal-category-description">描述</Label>
        <textarea
          id="portal-category-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="分类描述"
          maxLength={255}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>
    </div>
  );
}

function buildListQuery(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<PortalCategorySortBy>,
) {
  const name = filters.name.trim() || undefined;
  const status = filters.status === "all" ? undefined : filters.status;
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  return {
    page,
    pageSize,
    name,
    status,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  };
}
