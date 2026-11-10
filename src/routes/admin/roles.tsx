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
import { StatusBadge, type StatusTone } from "@/components/admin/display";
import {
  DateRangePicker,
  MenuTree,
  type MenuTreeNode,
  Popconfirm,
  ResponsiveFormLayer,
} from "@/components/admin/form";
import { PermissionFields } from "@/components/admin/form/permission-fields";
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
import { getRole } from "~/features/roles/roles.actions";
import { useAssignableMenus, useRolesList } from "~/features/roles/roles.queries";
import {
  type DataScope,
  type RoleSortBy,
  roleListQuerySchema,
} from "~/features/roles/roles.schema";
import type { RoleListItemDto } from "~/features/roles/roles.types";
import {
  useBulkDeleteRoles,
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
} from "~/features/roles/roles.use-mutations";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";
import type { PermissionCode } from "~/lib/permission-catalog";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  name: string;
  description: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  name: "",
  description: "",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

const DATA_SCOPE_OPTIONS: Array<{ value: DataScope; label: string }> = [
  { value: "1", label: "全部数据" },
  { value: "2", label: "本部门数据" },
  { value: "3", label: "本部门及子部门数据" },
  { value: "4", label: "仅本人数据" },
  { value: "5", label: "自定义数据" },
];

const DATA_SCOPE_TAG_COLORS: Record<DataScope, { tone: StatusTone; label: string }> = {
  "1": { tone: "info", label: "全部数据" },
  "2": { tone: "success", label: "本部门数据" },
  "3": { tone: "info", label: "本部门及子部门数据" },
  "4": { tone: "warning", label: "仅本人数据" },
  "5": { tone: "neutral", label: "自定义数据" },
};

export const Route = createFileRoute("/admin/roles")({
  component: AdminRolesPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminRolesPage() {
  const permissions = useResourcePermissions("roles");
  const menuPermissions = useResourcePermissions("menus");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  // 列表状态（筛选 / 页码 / 每页条数 / 排序）与地址栏同步：
  // 刷新页面、分享链接都能回到同一份视图。
  const listState = useListUrlState({
    filterKeys: ["name", "description", "status", "createdFrom", "createdTo"],
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 10,
    defaultSort: { sortKey: "createdAt", sortOrder: "desc" },
  });
  const filters = listState.filters as FilterState;
  const page = listState.page;
  const pageSize = listState.pageSize;
  const setPage = listState.setPage;
  const setPageSize = listState.setPageSize;
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [editing, setEditing] = React.useState<RoleListItemDto | null>(null);
  const [editForm, setEditForm] = React.useState<EditRoleFormValue>(EMPTY_EDIT_FORM);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateRoleFormValue>(EMPTY_CREATE_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  // 排序：表格自带能力，服务端排序；变化后回到第一页。
  const sort = listState.sort as ResourceSortState<RoleSortBy>;
  const onSortChange = listState.setSort;
  const query = buildListQuery(filters, page, pageSize, sort);
  const list = useRolesList(query, canRead);
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();
  const deleteMut = useDeleteRole();
  const bulkDeleteMut = useBulkDeleteRoles();
  const assignableMenusQuery = useAssignableMenus(menuPermissions.canRead);
  const menuTree = assignableMenusQuery.data ?? [];
  const menuTreeOptions: MenuTreeNode[] = React.useMemo(
    () => toMenuTreeNodes(menuTree),
    [menuTree],
  );

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
  }, [listState]);

  const handleStartEdit = async (row: RoleListItemDto) => {
    if (!canUpdate) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await getRole({ data: { id: row.id } });
      setEditing(row);
      setEditForm({
        name: row.name ?? "",
        description: row.description ?? "",
        status: row.status,
        dataScope: row.dataScope ?? "1",
        menuIds: detail.menuIds,
        permissionCodes: detail.permissionCodes,
      });
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "加载角色权限失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleOpenCreate = () => {
    if (!canCreate) return;
    setCreateForm(EMPTY_CREATE_FORM);
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const closeRowConfirms = React.useCallback(() => {
    setPopconfirmRowId(null);
    setDisablePopconfirmRowId(null);
  }, []);

  const handleToggleStatus = React.useCallback(
    async (row: RoleListItemDto) => {
      if (!canUpdate) return false;
      const next = row.status === "enabled" ? "disabled" : "enabled";
      try {
        await updateMut.mutateAsync({ id: row.id, status: next });
        return true;
      } catch {
        // 错误已通过 useMutation errorMessage 暴露
        return false;
      }
    },
    [canUpdate, updateMut],
  );

  const handleDisableConfirm = React.useCallback(
    async (row: RoleListItemDto) => {
      const ok = await handleToggleStatus(row);
      if (ok) {
        setDisablePopconfirmRowId(null);
        setMoreMenuRowId(null);
      }
      // 失败时保留弹层和菜单让用户看到错误
    },
    [handleToggleStatus],
  );

  const handleDeleteConfirm = React.useCallback(
    async (row: RoleListItemDto) => {
      if (!canDelete) return;
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [canDelete, deleteMut],
  );

  const handleBulkDelete = React.useCallback(async () => {
    if (!canDelete) return;
    if (selectedKeys.length === 0) return;
    try {
      await bulkDeleteMut.mutateAsync(selectedKeys);
      setSelectedKeys([]);
      setBulkDeletePopconfirmOpen(false);
    } catch {
      // 错误由 useMutation 状态显示；保留弹层让用户看到错误
    }
  }, [bulkDeleteMut, canDelete, selectedKeys]);

  const columns: ResourceColumn<RoleListItemDto>[] = [
    {
      key: "name",
      sortKey: "name",
      header: "角色名称",
      width: "140px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "description",
      header: "角色描述",
      width: "220px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-soft" title={row.description ?? ""}>
          {row.description ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "isSystemDefault",
      header: "系统角色",
      width: "120px",
      cell: (row) =>
        row.isSystemDefault ? (
          <StatusBadge tone="info" label="系统" variant="soft" />
        ) : (
          <StatusBadge tone="neutral" label="自定义" variant="soft" />
        ),
    },
    {
      key: "dataScope",
      header: "数据权限",
      width: "170px",
      cell: (row) => {
        const meta = DATA_SCOPE_TAG_COLORS[row.dataScope] ?? DATA_SCOPE_TAG_COLORS["1"];
        return <StatusBadge tone={meta.tone} label={meta.label} variant="soft" />;
      },
    },
    {
      key: "status",
      sortKey: "status",
      header: "状态",
      width: "100px",
      cell: (row) => (
        <StatusBadge
          tone="info"
          label={row.status === "enabled" ? "启用" : "已禁用"}
          variant="soft"
        />
      ),
    },
    {
      key: "createdAt",
      sortKey: "createdAt",
      header: "创建时间",
      width: "180px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "updatedAt",
      sortKey: "updatedAt",
      header: "更新时间",
      width: "180px",
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
        const isSystem = row.isSystemDefault;
        const isDisabled = row.status === "disabled";
        return (
          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              disabled={!canUpdate || detailLoading}
              onClick={(e) => {
                e.stopPropagation();
                closeRowConfirms();
                setMoreMenuRowId(null);
                void handleStartEdit(row);
              }}
            >
              编辑
            </Button>
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
              <Button
                type="button"
                variant="link"
                size="sm"
                className={isDisabled ? TABLE_ACTION_CLASS : TABLE_DANGER_ACTION_CLASS}
                onClick={(e) => {
                  e.stopPropagation();
                  setMoreMenuRowId(null);
                  setDisablePopconfirmRowId(null);
                  setPopconfirmRowId(row.id);
                }}
                disabled={!canDelete || deleteMut.isPending}
              >
                删除
              </Button>
            </Popconfirm>
            <DropdownMenu
              open={moreMenuRowId === row.id}
              onOpenChange={(next) => {
                if (next) {
                  setPopconfirmRowId(null);
                }
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
                  disabled={isSystem || !canUpdate || updateMut.isPending}
                >
                  更多
                  <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-32 rounded-[4px]">
                {isDisabled ? (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleToggleStatus(row).then((ok) => {
                        if (ok) setMoreMenuRowId(null);
                      });
                    }}
                    disabled={isSystem || !canUpdate}
                  >
                    启用
                  </DropdownMenuItem>
                ) : (
                  <Popconfirm
                    open={disablePopconfirmRowId === row.id}
                    onOpenChange={(next) => {
                      if (!next && disablePopconfirmRowId === row.id) {
                        setDisablePopconfirmRowId(null);
                      }
                    }}
                    title="禁用角色"
                    description="你确认禁用吗？"
                    confirmLabel="禁用"
                    tone="danger"
                    loading={updateMut.isPending && disablePopconfirmRowId === row.id}
                    onConfirm={() => handleDisableConfirm(row)}
                    placement="top"
                    sideOffset={8}
                    arrow
                  >
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setPopconfirmRowId(null);
                        setDisablePopconfirmRowId(row.id);
                      }}
                      disabled={isSystem || !canUpdate}
                    >
                      禁用
                    </DropdownMenuItem>
                  </Popconfirm>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
      description: editForm.description,
      status: editForm.status,
      dataScope: editForm.dataScope,
      menuIds: editForm.menuIds,
      permissionCodes: editForm.permissionCodes,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      name: createForm.name,
      description: createForm.description || undefined,
      status: createForm.status,
      dataScope: createForm.dataScope,
      menuIds: createForm.menuIds,
      permissionCodes: createForm.permissionCodes,
    });
    setCreating(false);
  };

  return (
    <>
      {detailError ? (
        <p role="alert" className="text-body text-destructive">
          {detailError}
        </p>
      ) : null}
      <ResourcePage
        title="角色管理"
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
        filterLoading={permissions.isPending || list.isFetching}
        toolbarTitle="角色列表"
        toolbarActions={
          <Button type="button" size="sm" disabled={!canCreate} onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新建
          </Button>
        }
        tableProps={{
          settingsKey: "roles",
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
                title={`批量删除 ${selectedKeys.length} 个角色？`}
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
          columns: columns as ResourceColumn<RoleListItemDto>[],
          data: items,
          rowKey: (row) => row.id,
          pagination: {
            current: page,
            pageSize,
            total,
            onChange: (nextPage: number, nextPageSize: number) => {
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
          emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无角色",
          emptyDescription:
            permissions.error ??
            (list.isError
              ? list.error instanceof Error
                ? list.error.message
                : "加载失败"
              : undefined),
          error: undefined,
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
        title="编辑角色"
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
          <RoleFields
            key={`edit-${editing.id}`}
            role={editing}
            value={editForm}
            menuTree={menuTreeOptions}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新建角色"
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
        <RoleFields
          key="create-form"
          value={createForm}
          menuTree={menuTreeOptions}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type EditRoleFormValue = {
  name: string;
  description: string;
  status: "enabled" | "disabled";
  dataScope: DataScope;
  menuIds: string[];
  permissionCodes: PermissionCode[];
};

type CreateRoleFormValue = EditRoleFormValue;

const EMPTY_EDIT_FORM: EditRoleFormValue = {
  name: "",
  description: "",
  status: "enabled",
  dataScope: "1",
  menuIds: [],
  permissionCodes: [],
};

const EMPTY_CREATE_FORM: CreateRoleFormValue = {
  name: "",
  description: "",
  status: "enabled",
  dataScope: "1",
  menuIds: [],
  permissionCodes: [],
};

function buildListQuery(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<RoleSortBy>,
) {
  const trim = (v: string) => v.trim() || undefined;
  const name = trim(filters.name);
  const description = trim(filters.description);
  const status = filters.status === "all" ? undefined : filters.status;
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  const keyword = [name, description].filter(Boolean).join(" ") || undefined;
  return roleListQuerySchema.parse({
    page,
    pageSize,
    keyword,
    status,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  });
}

type MenuApiTreeNode = {
  id: string;
  name: string;
  children?: MenuApiTreeNode[];
};

function toMenuTreeNodes(nodes: MenuApiTreeNode[]): MenuTreeNode[] {
  if (!nodes?.length) return [];
  return nodes.map((n) => ({
    value: n.id,
    label: n.name,
    children: n.children?.length ? toMenuTreeNodes(n.children) : undefined,
  }));
}

function RoleFields({
  role,
  value,
  menuTree,
  onChange,
}: {
  role?: RoleListItemDto;
  value: EditRoleFormValue | CreateRoleFormValue;
  menuTree: MenuTreeNode[];
  onChange: (patch: Partial<EditRoleFormValue>) => void;
}) {
  const isSystem = role?.isSystemDefault ?? false;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="role-name">
            名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="role-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="角色显示名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label>状态</Label>
          <div className="flex h-8 items-center gap-5 rounded-[4px] border border-transparent px-0.5 text-[13px]">
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="role-status"
                checked={value.status === "enabled"}
                onChange={() => onChange({ status: "enabled" })}
                disabled={isSystem}
                className="size-4"
              />
              <span>启用</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="role-status"
                checked={value.status === "disabled"}
                onChange={() => onChange({ status: "disabled" })}
                disabled={isSystem}
                className="size-4"
              />
              <span>禁用</span>
            </label>
          </div>
          {isSystem ? <p className="text-[11px] text-text-mute">系统默认角色不可禁用</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-data-scope">数据权限</Label>
          <Select
            value={value.dataScope}
            onValueChange={(v) => onChange({ dataScope: v as DataScope })}
          >
            <SelectTrigger id="role-data-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATA_SCOPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role-description">描述</Label>
        <textarea
          id="role-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="可选，简要说明该角色的职责"
          maxLength={200}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>

      <PermissionFields
        value={value.permissionCodes}
        onChange={(permissionCodes) => onChange({ permissionCodes })}
      />
      <div className="space-y-1.5">
        <Label>菜单权限</Label>
        <MenuTree
          value={value.menuIds}
          onChange={(next) => onChange({ menuIds: next })}
          options={menuTree}
        />
        <p className="text-[11px] text-text-mute">
          未选择将清空该角色全部菜单权限；仅展示启用中的菜单。
        </p>
      </div>
    </div>
  );
}
