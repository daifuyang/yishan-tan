import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { PermissionFields } from "@/components/admin/form/permission-fields";
import { ResourcePage, resolveMenuIcon } from "@/components/admin/layout";
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
import { useMenuTree } from "~/features/menus/menus.queries";
import type {
  CreateMenuInput,
  MenuSortBy,
  MenuTreeQuery,
  UpdateMenuInput,
} from "~/features/menus/menus.schema";
import type { MenuDto, MenuNode } from "~/features/menus/menus.types";
import {
  useBulkDeleteMenus,
  useCreateMenu,
  useDeleteMenu,
  useUpdateMenu,
} from "~/features/menus/menus.use-mutations";
import { useResourcePermissions } from "~/features/permissions/permissions.queries";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";
import type { PermissionCode } from "~/lib/permission-catalog";

type MenuTypeFilter = "all" | "group" | "menu" | "action";
type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  keyword: string;
  type: MenuTypeFilter;
  status: StatusFilter;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  type: "all",
  status: "all",
};

const PROTECTED_TOP_NAMES = new Set(["工作台", "系统管理"]);

export const Route = createFileRoute("/admin/menus")({
  component: AdminMenusPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function flattenTree(nodes: MenuNode[], depth: number, expanded: Set<string>): MenuRow[] {
  const out: MenuRow[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (expanded.has(node.id) && node.children.length > 0) {
      out.push(...flattenTree(node.children, depth + 1, expanded));
    }
  }
  return out;
}

function menuTypeTone(type: MenuNode["type"]): "info" | "warning" | "neutral" {
  if (type === "group") return "info";
  if (type === "menu") return "warning";
  return "neutral";
}

/** 把表格排序状态转成服务端排序参数。 */
function toQuery(sort: ResourceSortState<MenuSortBy>): MenuTreeQuery {
  return {
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  };
}

function AdminMenusPage() {
  const permissions = useResourcePermissions("menus");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  // 筛选与排序与地址栏同步：刷新页面、分享链接都能回到同一份视图。
  // 菜单是树形表（拉全树 + 前端过滤 + 前端分页），页码不进地址栏。
  const listState = useListUrlState({
    filterKeys: ["keyword", "type", "status"],
    defaultFilters: DEFAULT_FILTERS,
    defaultSort: { sortKey: "sort", sortOrder: "asc" },
    // 树形列表：分页在客户端做，地址栏只保留筛选与排序。
    paginated: false,
  });
  const filters = listState.filters as FilterState;
  // 筛选表单草稿：初值取自地址栏（刷新/分享链接后表单与列表一致）。
  const [draft, setDraft] = React.useState<FilterState>(() => ({
    ...DEFAULT_FILTERS,
    ...(listState.filters as FilterState),
  }));
  // 地址栏里的筛选条件回填到查询表单（前进 / 后退都会走到这里）。
  React.useEffect(() => {
    setDraft({
      keyword: filters.keyword,
      type: filters.type,
      status: filters.status,
    });
  }, [filters.keyword, filters.type, filters.status]);

  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [editing, setEditing] = React.useState<{
    mode: "create" | "edit";
    parentId: string | null;
    menu: MenuDto | null;
  } | null>(null);
  const [editForm, setEditForm] = React.useState<EditMenuFormValue>(EMPTY_EDIT_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  // 排序：服务端排序（菜单树整体按所选列排序），状态同步到地址栏。
  const sort = listState.sort as ResourceSortState<MenuSortBy>;
  const onSortChange = listState.setSort;
  const sortQuery = React.useMemo(() => toQuery(sort), [sort]);

  const treeQuery = useMenuTree(sortQuery, canRead);
  const createMut = useCreateMenu();
  const updateMut = useUpdateMenu();
  const deleteMut = useDeleteMenu();
  const bulkDeleteMut = useBulkDeleteMenus();

  const tree = canRead ? (treeQuery.data ?? []) : [];

  React.useEffect(() => {
    if (expanded.size > 0) return;
    if (tree.length === 0) return;
    setExpanded(new Set(tree.map((n) => n.id)));
  }, [tree, expanded.size]);

  const allRows = React.useMemo(() => {
    return flattenTree(tree, 0, expanded);
  }, [tree, expanded]);

  const filteredRows = React.useMemo(() => {
    const kw = filters.keyword.trim().toLowerCase();
    return allRows.filter((row) => {
      if (filters.type !== "all" && row.node.type !== filters.type) return false;
      if (filters.status !== "all" && row.node.status !== filters.status) return false;
      if (kw) {
        const haystack = [row.node.name, row.node.path, row.node.permission]
          .filter((v): v is string => Boolean(v))
          .join("\n")
          .toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [allRows, filters]);

  const handleToggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartCreateTop = () => {
    if (!canCreate) return;
    setEditForm({ ...EMPTY_EDIT_FORM, type: "group", parentId: null });
    setEditing({ mode: "create", parentId: null, menu: null });
  };

  const handleStartCreateChild = (parent: MenuNode) => {
    if (!canCreate) return;
    setEditForm({
      ...EMPTY_EDIT_FORM,
      type: "menu",
      parentId: parent.id,
    });
    setEditing({ mode: "create", parentId: parent.id, menu: null });
  };

  const handleStartEdit = (menu: MenuDto) => {
    if (!canUpdate) return;
    setEditForm({
      parentId: menu.parentId,
      name: menu.name,
      path: menu.path ?? "",
      component: menu.component ?? "",
      icon: menu.icon ?? "",
      type: menu.type,
      permission: menu.permission ?? "",
      permissionCodes: menu.permissionCodes ?? [],
      sort: menu.sort,
      status: menu.status,
    });
    setEditing({ mode: "edit", parentId: menu.parentId, menu });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    createMut.reset();
    updateMut.reset();
  };

  const handleToggleStatus = React.useCallback(
    async (row: MenuRow) => {
      if (!canUpdate) return;
      const next = row.node.status === "enabled" ? "disabled" : "enabled";
      try {
        await updateMut.mutateAsync({ id: row.node.id, status: next });
      } catch {
        // 错误提示由 useMutation errorMessage 暴露
      }
    },
    [canUpdate, updateMut],
  );

  const closeRowConfirms = React.useCallback(() => {
    setPopconfirmRowId(null);
    setDisablePopconfirmRowId(null);
  }, []);

  const handleDisableConfirm = React.useCallback(
    async (row: MenuRow) => {
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
    async (row: MenuRow) => {
      if (!canDelete) return;
      try {
        await deleteMut.mutateAsync(row.node.id);
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
      // 错误由 useMutation 状态显示
    }
  }, [bulkDeleteMut, canDelete, selectedKeys]);

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleFilterSubmit = () => {
    listState.setFilters(draft);
  };

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    listState.resetFilters();
  }, [listState]);

  const handleEditSubmit = async () => {
    if (!editing) return;
    const payload = buildPayload(editForm);
    if (editing.mode === "create") {
      await createMut.mutateAsync(payload);
    } else if (editing.menu) {
      const patch: UpdateMenuInput = { permissionCodes: payload.permissionCodes };
      if (payload.parentId !== editing.menu.parentId) patch.parentId = payload.parentId ?? null;
      if (payload.name !== editing.menu.name) patch.name = payload.name;
      if ((payload.path ?? null) !== editing.menu.path) patch.path = payload.path;
      if ((payload.component ?? null) !== editing.menu.component)
        patch.component = payload.component;
      if ((payload.icon ?? null) !== editing.menu.icon) patch.icon = payload.icon;
      if (payload.type !== editing.menu.type) patch.type = payload.type;
      if ((payload.permission ?? null) !== editing.menu.permission)
        patch.permission = payload.permission;
      if (payload.sort !== editing.menu.sort) patch.sort = payload.sort;
      if (payload.status !== editing.menu.status) patch.status = payload.status;
      if (Object.keys(patch).length === 0) {
        setEditing(null);
        return;
      }
      await updateMut.mutateAsync({ id: editing.menu.id, ...patch });
    }
    setEditing(null);
  };

  const columns: ResourceColumn<MenuRow>[] = [
    {
      key: "name",
      header: "名称",
      width: "280px",
      sortKey: "name",
      ellipsis: true,
      cell: (row) => {
        const Icon = resolveMenuIcon(row.node.icon);
        const indentPx = row.depth * 24;
        const hasChildren = row.node.children.length > 0;
        const isExpanded = expanded.has(row.node.id);
        return (
          <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: indentPx }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(row.node.id);
                }}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-mute hover:bg-line-soft hover:text-text-strong"
                aria-label={isExpanded ? "折叠子菜单" : "展开子菜单"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="size-3.5" aria-hidden />
                )}
              </button>
            ) : (
              <span aria-hidden className="inline-block h-5 w-5 shrink-0" />
            )}
            <Icon className="size-3.5 shrink-0 text-text-soft" aria-hidden />
            <span className="min-w-0 truncate text-[13px] text-text-strong" title={row.node.name}>
              {row.node.name}
            </span>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "类型",
      width: "90px",
      cell: (row) => (
        <StatusBadge
          tone={menuTypeTone(row.node.type)}
          label={row.node.type === "group" ? "分组" : row.node.type === "menu" ? "菜单" : "动作"}
          variant="soft"
        />
      ),
    },
    {
      key: "path",
      header: "路径",
      width: "220px",
      sortKey: "path",
      ellipsis: true,
      cell: (row) =>
        row.node.path ? (
          <span className={MONO_CELL} title={row.node.path}>
            {row.node.path}
          </span>
        ) : (
          <span className="text-[13px] text-text-mute">--</span>
        ),
    },
    {
      key: "permission",
      header: "权限标识",
      width: "140px",
      ellipsis: true,
      cell: (row) =>
        row.node.type === "group" ? (
          <span className="text-[13px] text-text-mute">--</span>
        ) : row.node.permission ? (
          <span className={MONO_CELL} title={row.node.permission}>
            {row.node.permission}
          </span>
        ) : (
          <span className="text-[13px] text-text-mute">--</span>
        ),
    },
    {
      key: "sort",
      header: "排序",
      width: "70px",
      align: "center",
      sortKey: "sort",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.node.sort}</span>,
    },
    {
      key: "status",
      header: "状态",
      width: "90px",
      cell: (row) => (
        <StatusBadge
          tone={row.node.status === "enabled" ? "success" : "danger"}
          label={row.node.status === "enabled" ? "启用" : "已禁用"}
          variant="soft"
        />
      ),
    },
    {
      key: "createdAt",
      header: "创建时间",
      width: "170px",
      sortKey: "createdAt",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.node.createdAt)}</span>
      ),
    },
    {
      key: "updatedAt",
      header: "更新时间",
      width: "170px",
      sortKey: "updatedAt",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.node.updatedAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      width: "200px",
      sticky: "right",
      cell: (row) => {
        const isProtected = row.node.parentId === null && PROTECTED_TOP_NAMES.has(row.node.name);
        const isDisabled = row.node.status === "disabled";
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
                handleStartEdit(row.node);
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
                open={disablePopconfirmRowId === row.node.id}
                onOpenChange={(next) => {
                  if (!next && disablePopconfirmRowId === row.node.id)
                    setDisablePopconfirmRowId(null);
                }}
                title="禁用菜单"
                description="你确认禁用吗？"
                confirmLabel="禁用"
                tone="danger"
                loading={updateMut.isPending && disablePopconfirmRowId === row.node.id}
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
                    setDisablePopconfirmRowId(row.node.id);
                  }}
                  disabled={!canUpdate || updateMut.isPending}
                >
                  禁用
                </Button>
              </Popconfirm>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              disabled={!canCreate}
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreateChild(row.node);
              }}
            >
              <Plus className="size-3.5" aria-hidden />
              新建子菜单
            </Button>
            <DropdownMenu
              open={moreMenuRowId === row.node.id}
              onOpenChange={(next) => {
                if (next) closeRowConfirms();
                setMoreMenuRowId(next ? row.node.id : null);
                if (!next && disablePopconfirmRowId === row.node.id)
                  setDisablePopconfirmRowId(null);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={TABLE_ACTION_CLASS}
                  disabled={!canDelete}
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
                  open={popconfirmRowId === row.node.id}
                  onOpenChange={(next) => {
                    if (!next && popconfirmRowId === row.node.id) setPopconfirmRowId(null);
                  }}
                  title={`删除「${row.node.name}」？`}
                  description="你确认删除吗？"
                  confirmLabel="删除"
                  tone="danger"
                  loading={deleteMut.isPending && popconfirmRowId === row.node.id}
                  onConfirm={() => handleDeleteConfirm(row)}
                  placement="top"
                  sideOffset={8}
                  arrow
                >
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isProtected || !canDelete || deleteMut.isPending}
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuRowId(null);
                      setPopconfirmRowId(row.node.id);
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

  const isMutating = createMut.isPending || updateMut.isPending;
  const editError =
    (createMut.error ?? updateMut.error)
      ? (createMut.error instanceof Error
          ? createMut.error
          : updateMut.error instanceof Error
            ? updateMut.error
            : new Error("保存失败")
        ).message
      : undefined;

  return (
    <>
      <ResourcePage
        title="菜单管理"
        filterColumns={3}
        filterCollapsible
        filter={
          <>
            <QueryFormItem label="关键字" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.keyword}
                onChange={(e) => applyDraftPatch({ keyword: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="类型" htmlFor="filter-type">
              <Select
                value={draft.type}
                onValueChange={(v) => applyDraftPatch({ type: v as MenuTypeFilter })}
              >
                <SelectTrigger id="filter-type" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="group">分组</SelectItem>
                  <SelectItem value="menu">菜单</SelectItem>
                  <SelectItem value="action">动作</SelectItem>
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
          </>
        }
        filterValues={draft}
        onFilterSubmit={handleFilterSubmit}
        onFilterReset={handleResetFilters}
        filterLoading={permissions.isPending || treeQuery.isFetching}
        toolbarTitle="菜单列表"
        toolbarActions={
          <Button type="button" size="sm" disabled={!canCreate} onClick={handleStartCreateTop}>
            <Plus className="size-3.5" aria-hidden />
            新建
          </Button>
        }
        tableProps={{
          settingsKey: "menus",
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
                title={`批量删除 ${selectedKeys.length} 个菜单？`}
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
          columns: columns as ResourceColumn<MenuRow>[],
          data: filteredRows,
          rowKey: (row) => row.node.id,
          pagination: {
            current: 1,
            pageSize: filteredRows.length || 1,
            total: filteredRows.length,
            onChange: () => undefined,
            showSizeChanger: true,
          },
          loading: permissions.isPending || treeQuery.isFetching,
          emptyTitle: permissions.error || treeQuery.isError ? "无法加载列表" : "暂无菜单",
          emptyDescription:
            permissions.error ??
            (treeQuery.isError
              ? treeQuery.error instanceof Error
                ? treeQuery.error.message
                : "加载失败"
              : undefined),
          rowSelection: {
            selectedKeys,
            onChange: setSelectedKeys,
          },
          sort,
          onSortChange,
        }}
      />

      <ResponsiveFormLayer
        open={editing !== null}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseEdit();
        }}
        title={editing?.mode === "create" ? "新建菜单" : "编辑菜单"}
        description={
          editing?.mode === "create"
            ? "选择类型与父级后填写基础信息"
            : (editing?.menu?.path ?? undefined)
        }
        dialogSize="md"
        sheetSize="md"
        submitLabel={editing?.mode === "create" ? "创建" : "保存"}
        loading={isMutating}
        errorMessage={editError}
        onSubmit={handleEditSubmit}
      >
        {editing ? (
          <EditMenuFields
            key={editing.menu?.id ?? `new-${editing.parentId ?? "root"}`}
            value={editForm}
            tree={tree}
            excludeId={editing.menu?.id ?? null}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>
    </>
  );
}

type MenuRow = { node: MenuNode; depth: number };

type EditMenuFormValue = {
  parentId: string | null;
  name: string;
  path: string;
  component: string;
  icon: string;
  type: "group" | "menu" | "action";
  permission: string;
  permissionCodes: PermissionCode[];
  sort: number;
  status: "enabled" | "disabled";
};

const EMPTY_EDIT_FORM: EditMenuFormValue = {
  parentId: null,
  name: "",
  path: "",
  component: "",
  icon: "",
  type: "menu",
  permission: "",
  permissionCodes: [],
  sort: 0,
  status: "enabled",
};

function buildPayload(form: EditMenuFormValue): CreateMenuInput {
  const trim = (v: string) => {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };
  return {
    parentId: form.parentId,
    name: form.name.trim(),
    type: form.type,
    status: form.status,
    sort: form.sort,
    path: form.type === "group" ? undefined : trim(form.path),
    component: form.type === "group" ? undefined : trim(form.component),
    icon: trim(form.icon),
    permission: form.type === "group" ? undefined : trim(form.permission),
    permissionCodes: form.permissionCodes,
  };
}

function EditMenuFields({
  value,
  tree,
  excludeId,
  onChange,
}: {
  value: EditMenuFormValue;
  tree: MenuNode[];
  excludeId: string | null;
  onChange: (patch: Partial<EditMenuFormValue>) => void;
}) {
  const parentOptions = React.useMemo(() => flattenForParent(tree, excludeId), [tree, excludeId]);

  return (
    <div className="space-y-3">
      <PermissionFields
        description="关联此菜单涉及的操作权限；实际授权需在角色中单独配置。"
        value={value.permissionCodes}
        onChange={(permissionCodes) => onChange({ permissionCodes })}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="menu-name">名称</Label>
          <Input
            id="menu-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="菜单显示名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="menu-type">类型</Label>
          <Select
            value={value.type}
            onValueChange={(v) => onChange({ type: v as EditMenuFormValue["type"] })}
          >
            <SelectTrigger id="menu-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group">分组（容器）</SelectItem>
              <SelectItem value="menu">菜单（页面）</SelectItem>
              <SelectItem value="action">动作（按钮）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {value.type !== "group" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="menu-path">路径</Label>
            <Input
              id="menu-path"
              value={value.path}
              onChange={(e) => onChange({ path: e.target.value })}
              placeholder={value.type === "menu" ? "如 /admin/menus" : "可选"}
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="menu-component">组件</Label>
            <Input
              id="menu-component"
              value={value.component}
              onChange={(e) => onChange({ component: e.target.value })}
              placeholder="可选，前端组件路径"
              maxLength={200}
            />
          </div>
        </div>
      ) : null}

      {value.type === "action" ? (
        <div className="space-y-1.5">
          <Label htmlFor="menu-permission">权限标识</Label>
          <Input
            id="menu-permission"
            value={value.permission}
            onChange={(e) => onChange({ permission: e.target.value })}
            placeholder="如 menus.create"
            maxLength={100}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="menu-icon">图标</Label>
          <IconPicker value={value.icon} onChange={(v) => onChange({ icon: v })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="menu-sort">排序</Label>
          <Input
            id="menu-sort"
            type="number"
            min={0}
            max={9999}
            value={value.sort}
            onChange={(e) => onChange({ sort: Number.parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="menu-parent">上级菜单</Label>
          <ParentSelect
            value={value.parentId}
            options={parentOptions}
            onChange={(v) => onChange({ parentId: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="menu-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as EditMenuFormValue["status"] })}
          >
            <SelectTrigger id="menu-status">
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

function flattenForParent(
  nodes: MenuNode[],
  excludeId: string | null,
): Array<{ id: string; name: string; depth: number }> {
  const out: Array<{ id: string; name: string; depth: number }> = [
    { id: "__ROOT__", name: "（顶级）", depth: 0 },
  ];
  function walk(items: MenuNode[], depth: number) {
    for (const n of items) {
      if (n.id === excludeId) continue;
      out.push({ id: n.id, name: n.name, depth });
      if (n.children.length > 0) walk(n.children, depth + 1);
    }
  }
  walk(nodes, 1);
  return out;
}

function ParentSelect({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: Array<{ id: string; name: string; depth: number }>;
  onChange: (v: string | null) => void;
}) {
  const serialized = value ?? "__ROOT__";
  return (
    <Select value={serialized} onValueChange={(v) => onChange(v === "__ROOT__" ? null : v)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            <span style={{ paddingLeft: `${(opt.depth - 1) * 12}px` }} className="inline-block">
              {opt.depth === 0 ? opt.name : `└ ${opt.name}`}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ICON_OPTIONS = [
  "BookType",
  "Building2",
  "Circle",
  "CircleDollarSign",
  "Cog",
  "Folder",
  "KeyRound",
  "LayoutDashboard",
  "ListTree",
  "ScrollText",
  "Settings",
  "ShieldCheck",
  "UserRound",
  "Users",
] as const;

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = value || "ListTree";
  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ICON_OPTIONS.map((name) => {
          const Icon = resolveMenuIcon(name);
          return (
            <SelectItem key={name} value={name}>
              <span className="inline-flex items-center gap-2">
                <Icon className="size-3.5" aria-hidden />
                {name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
