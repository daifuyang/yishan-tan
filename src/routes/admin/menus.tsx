import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import { FILTER_CONTROL_CLASS, TABLE_ACTION_CLASS } from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
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
import type { CreateMenuInput, UpdateMenuInput } from "~/features/menus/menus.schema";
import type { MenuDto, MenuNode } from "~/features/menus/menus.types";
import { useCreateMenu, useDeleteMenu, useUpdateMenu } from "~/features/menus/menus.use-mutations";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";

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

function AdminMenusPage() {
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());
  const [editing, setEditing] = React.useState<{
    mode: "create" | "edit";
    parentId: string | null;
    menu: MenuDto | null;
  } | null>(null);
  const [editForm, setEditForm] = React.useState<EditMenuFormValue>(EMPTY_EDIT_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);

  const treeQuery = useMenuTree();
  const createMut = useCreateMenu();
  const updateMut = useUpdateMenu();
  const deleteMut = useDeleteMenu();

  const tree = treeQuery.data ?? [];

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
    setEditForm({ ...EMPTY_EDIT_FORM, type: "group", parentId: null });
    setEditing({ mode: "create", parentId: null, menu: null });
  };

  const handleStartCreateChild = (parent: MenuNode) => {
    setEditForm({
      ...EMPTY_EDIT_FORM,
      type: "menu",
      parentId: parent.id,
    });
    setEditing({ mode: "create", parentId: parent.id, menu: null });
  };

  const handleStartEdit = (menu: MenuDto) => {
    setEditForm({
      parentId: menu.parentId,
      name: menu.name,
      path: menu.path ?? "",
      component: menu.component ?? "",
      icon: menu.icon ?? "",
      type: menu.type,
      permission: menu.permission ?? "",
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
      const next = row.node.status === "enabled" ? "disabled" : "enabled";
      try {
        await updateMut.mutateAsync({ id: row.node.id, status: next });
      } catch {
        // 错误提示由 useMutation errorMessage 暴露
      }
    },
    [updateMut],
  );

  const handleDeleteConfirm = React.useCallback(
    async (row: MenuRow) => {
      try {
        await deleteMut.mutateAsync(row.node.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleFilterSubmit = () => {
    setFilters(draft);
  };

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleEditSubmit = async () => {
    if (!editing) return;
    const payload = buildPayload(editForm);
    if (editing.mode === "create") {
      await createMut.mutateAsync(payload);
    } else if (editing.menu) {
      const patch: UpdateMenuInput = {};
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
      cell: (row) => {
        const Icon = resolveMenuIcon(row.node.icon);
        const indentPx = row.depth * 24;
        const hasChildren = row.node.children.length > 0;
        const isExpanded = expanded.has(row.node.id);
        return (
          <div
            className="flex items-center gap-2 whitespace-nowrap"
            style={{ paddingLeft: indentPx }}
          >
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
            <span
              className="break-words whitespace-normal text-[13px] text-text-strong"
              title={row.node.name}
            >
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
                disabled={updateMut.isPending}
              >
                启用
              </Button>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className={TABLE_ACTION_CLASS}
                onClick={(e) => {
                  e.stopPropagation();
                  setDisablePopconfirmRowId(row.node.id);
                }}
                disabled={updateMut.isPending}
              >
                禁用
              </Button>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreateChild(row.node);
              }}
            >
              <Plus className="size-3.5" aria-hidden />
              新建子菜单
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
                  disabled={isProtected || deleteMut.isPending}
                  onSelect={(e) => {
                    e.preventDefault();
                    setPopconfirmRowId(row.node.id);
                  }}
                >
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popconfirm
              open={popconfirmRowId === row.node.id}
              onOpenChange={(next) => {
                if (!next && popconfirmRowId === row.node.id) setPopconfirmRowId(null);
              }}
              title={`删除「${row.node.name}」？`}
              description={
                isProtected
                  ? "该菜单是系统核心菜单，无法删除。"
                  : "删除后该菜单将被停用，已绑定的角色权限将丢失该节点。"
              }
              confirmLabel="删除"
              tone="danger"
              loading={deleteMut.isPending && popconfirmRowId === row.node.id}
              onConfirm={() => handleDeleteConfirm(row)}
              side="top"
              align="end"
              sideOffset={6}
            >
              <span aria-hidden className="size-0" />
            </Popconfirm>
            <Popconfirm
              open={disablePopconfirmRowId === row.node.id}
              onOpenChange={(next) => {
                if (!next && disablePopconfirmRowId === row.node.id)
                  setDisablePopconfirmRowId(null);
              }}
              title="禁用菜单"
              description="禁用后该菜单及其子菜单将隐藏，已绑定的角色权限将丢失该节点。"
              confirmLabel="禁用"
              tone="danger"
              loading={updateMut.isPending && disablePopconfirmRowId === row.node.id}
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
        filterLoading={treeQuery.isFetching}
        toolbarTitle="菜单列表"
        toolbarActions={
          <Button type="button" size="sm" onClick={handleStartCreateTop}>
            <Plus className="size-3.5" aria-hidden />
            新建顶级菜单
          </Button>
        }
        tableProps={{
          columns: columns as ResourceColumn<MenuRow>[],
          data: filteredRows,
          rowKey: (row) => row.node.id,
          page: 1,
          pageSize: filteredRows.length || 1,
          total: filteredRows.length,
          onPageChange: () => undefined,
          onPageSizeChange: () => undefined,
          loading: treeQuery.isFetching,
          emptyTitle: "暂无菜单",
          error: treeQuery.isError
            ? treeQuery.error instanceof Error
              ? treeQuery.error.message
              : "加载失败"
            : undefined,
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
          <Label htmlFor="menu-parent">父级</Label>
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
