import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import { StatusBadge, type StatusTone } from "@/components/admin/display";
import {
  MenuTree,
  type MenuTreeNode,
  Popconfirm,
  ResponsiveFormLayer,
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
import { useAssignableMenus, useRolesList } from "~/features/roles/roles.queries";
import { type DataScope, roleListQuerySchema } from "~/features/roles/roles.schema";
import type { RoleListItemDto } from "~/features/roles/roles.types";
import { useCreateRole, useDeleteRole, useUpdateRole } from "~/features/roles/roles.use-mutations";
import { placeholders } from "~/lib/copy";

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

const FILTER_CONTROL_CLASS = "h-8 w-full text-[13px]";
const TABLE_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-brand-600 hover:bg-transparent hover:text-brand-700 hover:no-underline disabled:text-text-mute";
const TABLE_DANGER_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-destructive hover:bg-transparent hover:text-destructive hover:no-underline disabled:text-text-mute";
const TEXTAREA_CLASS =
  "border-line flex w-full min-w-0 rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40";

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
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<RoleListItemDto | null>(null);
  const [editForm, setEditForm] = React.useState<EditRoleFormValue>(EMPTY_EDIT_FORM);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateRoleFormValue>(EMPTY_CREATE_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);

  const query = buildListQuery(filters, page, pageSize);
  const list = useRolesList(query);
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();
  const deleteMut = useDeleteRole();
  const assignableMenusQuery = useAssignableMenus();
  const menuTree = assignableMenusQuery.data ?? [];
  const menuTreeOptions: MenuTreeNode[] = React.useMemo(
    () => toMenuTreeNodes(menuTree),
    [menuTree],
  );

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
    draft.name,
    draft.description,
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

  const handleStartEdit = (row: RoleListItemDto) => {
    setEditing(row);
    setEditForm({
      name: row.name ?? "",
      description: row.description ?? "",
      status: row.status,
      dataScope: row.dataScope ?? "1",
      menuIds: [],
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
    async (row: RoleListItemDto) => {
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
    async (row: RoleListItemDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const columns: ResourceColumn<RoleListItemDto>[] = [
    {
      key: "id",
      header: "ID",
      width: "80px",
      align: "right",
      cell: (row) => (
        <span className="font-mono text-[12px] text-text-mute">{row.id.slice(0, 8)}</span>
      ),
    },
    {
      key: "name",
      header: "名称",
      width: "140px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "description",
      header: "描述",
      width: "220px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.description ?? ""}>
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
          <StatusBadge tone="success" label="自定义" variant="soft" />
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
      header: "状态",
      width: "100px",
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
      width: "180px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "updatedAt",
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
                setPopconfirmRowId(row.id);
              }}
              disabled={deleteMut.isPending}
            >
              删除
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className={TABLE_ACTION_CLASS}
                  onClick={(e) => e.stopPropagation()}
                  disabled={isSystem || updateMut.isPending}
                >
                  更多
                  <ChevronDown className="size-3.5" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-32 rounded-[4px]">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    if (isDisabled) {
                      void handleToggleStatus(row);
                    } else {
                      setDisablePopconfirmRowId(row.id);
                    }
                  }}
                  disabled={isSystem}
                >
                  {isDisabled ? "启用" : "禁用"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Popconfirm
              open={popconfirmRowId === row.id}
              onOpenChange={(next) => {
                if (!next && popconfirmRowId === row.id) setPopconfirmRowId(null);
              }}
              title={`删除「${row.name}」？`}
              description="删除后该角色将被停用，已绑定的角色会保留但无法再次使用。"
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
              title="禁用角色"
              description="禁用后，已分配该角色的用户将失去对应权限。"
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
      description: editForm.description,
      status: editForm.status,
      dataScope: editForm.dataScope,
      menuIds: editForm.menuIds,
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
    });
    setCreating(false);
  };

  return (
    <>
      <ResourcePage
        title="角色管理"
        description="维护业务角色与菜单权限。"
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

            <QueryFormItem label="创建时间起" htmlFor="filter-created-from">
              <Input
                id="filter-created-from"
                type="datetime-local"
                className={FILTER_CONTROL_CLASS}
                allowClear
                value={draft.createdFrom}
                onChange={(e) => applyDraftPatch({ createdFrom: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="创建时间止" htmlFor="filter-created-to">
              <Input
                id="filter-created-to"
                type="datetime-local"
                className={FILTER_CONTROL_CLASS}
                allowClear
                value={draft.createdTo}
                onChange={(e) => applyDraftPatch({ createdTo: e.target.value })}
              />
            </QueryFormItem>
          </>
        }
        filterValues={draft}
        onFilterSubmit={handleFilterSubmit}
        onFilterReset={handleResetFilters}
        filterLoading={list.isFetching}
        toolbarTitle="角色列表"
        toolbarActions={
          <Button type="button" size="sm" onClick={handleOpenCreate}>
            <Plus className="size-3.5" aria-hidden />
            新增角色
          </Button>
        }
        tableProps={{
          columns: columns as ResourceColumn<RoleListItemDto>[],
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
          emptyTitle: "暂无角色",
          emptyDescription: list.isError
            ? "加载角色列表失败，请稍后重试或检查后端日志。"
            : "当前筛选条件下没有匹配的角色，试着调整关键词或状态。",
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
        title="新增角色"
        description="填写基础信息并分配菜单权限。"
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
};

type CreateRoleFormValue = EditRoleFormValue;

const EMPTY_EDIT_FORM: EditRoleFormValue = {
  name: "",
  description: "",
  status: "enabled",
  dataScope: "1",
  menuIds: [],
};

const EMPTY_CREATE_FORM: CreateRoleFormValue = {
  name: "",
  description: "",
  status: "enabled",
  dataScope: "1",
  menuIds: [],
};

function buildListQuery(filters: FilterState, page: number, pageSize: number) {
  const trim = (v: string) => v.trim() || undefined;
  const name = trim(filters.name);
  const description = trim(filters.description);
  const status = filters.status === "all" ? undefined : filters.status;
  const createdFrom = trim(filters.createdFrom);
  const createdTo = trim(filters.createdTo);
  const keyword = [name, description].filter(Boolean).join(" ") || undefined;
  return roleListQuerySchema.parse({
    page,
    pageSize,
    keyword,
    status,
    createdFrom,
    createdTo,
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
