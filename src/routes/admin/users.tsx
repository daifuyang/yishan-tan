import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ShieldOff, UserPlus } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import { StatusBadge, UserAvatar } from "@/components/admin/display";
import { MultiSelect, Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { ResourcePage } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUser } from "~/features/auth/auth.queries";
import { useAssignableRoles, useUsersList } from "~/features/users/users.queries";
import type { UserListQuery } from "~/features/users/users.schema";
import type { AdminUserDto } from "~/features/users/users.types";
import {
  useBulkUpdateUserStatus,
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
} from "~/features/users/users.use-mutations";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  username: string;
  name: string;
  displayName: string;
  email: string;
  phone: string;
  status: StatusFilter;
};

const DEFAULT_FILTERS: FilterState = {
  username: "",
  name: "",
  displayName: "",
  email: "",
  phone: "",
  status: "all",
};

const FILTER_CONTROL_CLASS = "h-8 w-full text-[13px]";
const TABLE_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-brand-600 hover:bg-transparent hover:text-brand-700 hover:no-underline disabled:text-text-mute";
const TABLE_DANGER_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-destructive hover:bg-transparent hover:text-destructive hover:no-underline disabled:text-text-mute";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

function toQuery(state: FilterState, page: number, pageSize: number): UserListQuery {
  const trim = (v: string) => v.trim() || undefined;
  return {
    page,
    pageSize,
    username: trim(state.username),
    name: trim(state.name),
    displayName: trim(state.displayName),
    email: trim(state.email),
    phone: trim(state.phone),
    status: state.status === "all" ? undefined : state.status,
  };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminUsersPage() {
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<AdminUserDto | null>(null);
  const [editForm, setEditForm] = React.useState<{
    name: string;
    displayName: string;
    phone: string;
    status: "enabled" | "disabled";
    roleIds: string[];
  }>({ name: "", displayName: "", phone: "", status: "enabled", roleIds: [] });
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateUserFormValue>(EMPTY_CREATE_FORM);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);

  const query = toQuery(filters, page, pageSize);
  const { data: currentUser } = useCurrentUser();
  const list = useUsersList(query);
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();
  const bulkUpdateMut = useBulkUpdateUserStatus();
  const createMut = useCreateUser();
  const assignableRolesQuery = useAssignableRoles();
  const assignableRoles = assignableRolesQuery.data?.items ?? [];

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPageOnFilterChange = React.useCallback(() => {
    setPage(1);
  }, []);

  const clearSelectionOnViewChange = React.useCallback(() => {
    // 翻页/筛选/数据刷新时清空选中，避免跨页错选
    setSelectedKeys([]);
    setPopconfirmRowId(null);
  }, []);

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filter fields used only as trigger for reset
  React.useEffect(() => {
    resetPageOnFilterChange();
  }, [
    filters.username,
    filters.name,
    filters.displayName,
    filters.email,
    filters.phone,
    filters.status,
    resetPageOnFilterChange,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: page/size/filter used only as trigger for clearing selection
  React.useEffect(() => {
    clearSelectionOnViewChange();
  }, [
    filters.username,
    filters.name,
    filters.displayName,
    filters.email,
    filters.phone,
    filters.status,
    page,
    pageSize,
    clearSelectionOnViewChange,
  ]);

  const applyFilterPatch = React.useCallback((patch: Partial<FilterState>) => {
    setFilters((s) => ({ ...s, ...patch }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleStartEdit = (row: AdminUserDto) => {
    setEditing(row);
    setEditForm({
      name: row.name ?? "",
      displayName: row.displayName ?? "",
      phone: row.phone ?? "",
      status: row.status,
      roleIds: row.roleIds ?? [],
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleToggleStatus = React.useCallback(
    async (row: AdminUserDto) => {
      const next = row.status === "enabled" ? "disabled" : "enabled";
      try {
        await updateMut.mutateAsync({ id: row.id, data: { status: next } });
      } catch {
        // 错误已通过 useMutation errorMessage 暴露
      }
    },
    [updateMut],
  );

  const handleBulkDisable = React.useCallback(async () => {
    if (selectedKeys.length === 0) return;
    try {
      await bulkUpdateMut.mutateAsync({ ids: selectedKeys, status: "disabled" });
      setSelectedKeys([]);
    } catch {
      // 错误提示由 useMutation errorMessage 暴露
    }
  }, [bulkUpdateMut, selectedKeys]);

  const handleDeleteConfirm = React.useCallback(
    async (row: AdminUserDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setSelectedKeys((prev) => prev.filter((k) => k !== row.id));
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const columns: ResourceColumn<AdminUserDto>[] = [
    {
      key: "username",
      header: "用户名",
      width: "140px",
      cell: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <UserAvatar
            user={{ displayName: row.displayName, username: row.username, email: row.email }}
            size="sm"
            variant="muted"
          />
          <span className="truncate text-[13px] text-text-strong" title={row.username}>
            @{row.username}
          </span>
        </div>
      ),
    },
    {
      key: "name",
      header: "姓名",
      width: "120px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-strong" title={row.name}>
          {row.name || <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "displayName",
      header: "昵称",
      width: "120px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-strong" title={row.displayName ?? ""}>
          {row.displayName ?? <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "email",
      header: "邮箱",
      width: "220px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.email}>
          {row.email}
        </span>
      ),
    },
    {
      key: "phone",
      header: "手机号",
      width: "140px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.phone ?? ""}>
          {row.phone ?? <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "role",
      header: "系统角色",
      width: "100px",
      cell: (row) => (
        <StatusBadge
          tone={row.role === "admin" ? "info" : "neutral"}
          label={row.role === "admin" ? "管理员" : "成员"}
          variant="soft"
        />
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
      key: "lastLoginAt",
      header: "最后登录",
      width: "170px",
      cell: (row) =>
        row.lastLoginAt ? (
          <span className="text-[13px] text-text-soft">{formatDateTime(row.lastLoginAt)}</span>
        ) : (
          <span className="text-[13px] text-text-mute">从未登录</span>
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
        const isSelf = row.id === currentUser?.id;
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
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="cursor-not-allowed opacity-50"
                      >
                        重置密码
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>暂未上线（需后端 resetPassword action）</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSelf || deleteMut.isPending}
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
              title={`删除「${row.displayName ?? row.username}」？`}
              description="删除后该账号将被停用，无法再登录。"
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
      data: {
        name: editForm.name,
        displayName: editForm.displayName,
        phone: editForm.phone || undefined,
        status: editForm.status,
        roleIds: editForm.roleIds,
      },
    });
    setEditing(null);
  };

  const handleOpenCreate = () => {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      email: createForm.email,
      username: createForm.username,
      password: createForm.password,
      name: createForm.name || undefined,
      displayName: createForm.displayName || undefined,
      phone: createForm.phone || undefined,
    });
    setCreating(false);
    setCreateForm(EMPTY_CREATE_FORM);
  };

  return (
    <>
      <ResourcePage
        title="用户管理"
        description="维护后台账号、角色与启停状态。"
        filterColumns={3}
        filterCollapsible
        filter={
          <>
            <QueryFormItem label="用户名" htmlFor="filter-username">
              <Input
                id="filter-username"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.username}
                onChange={(e) => applyFilterPatch({ username: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="姓名" htmlFor="filter-name">
              <Input
                id="filter-name"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.name}
                onChange={(e) => applyFilterPatch({ name: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="昵称" htmlFor="filter-displayName">
              <Input
                id="filter-displayName"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.displayName}
                onChange={(e) => applyFilterPatch({ displayName: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="邮箱" htmlFor="filter-email">
              <Input
                id="filter-email"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.email}
                onChange={(e) => applyFilterPatch({ email: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="手机号" htmlFor="filter-phone">
              <Input
                id="filter-phone"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={filters.phone}
                onChange={(e) => applyFilterPatch({ phone: e.target.value })}
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
          </>
        }
        filterValues={filters}
        onFilterChange={(next) =>
          setFilters({
            username: String(next.username ?? ""),
            name: String(next.name ?? ""),
            displayName: String(next.displayName ?? ""),
            email: String(next.email ?? ""),
            phone: String(next.phone ?? ""),
            status: (next.status as StatusFilter) ?? "all",
          })
        }
        onFilterReset={handleResetFilters}
        filterLoading={list.isFetching}
        toolbarTitle="用户列表"
        toolbarActions={
          <>
            {selectedKeys.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={bulkUpdateMut.isPending}
                onClick={() => void handleBulkDisable()}
              >
                <ShieldOff className="size-3.5" aria-hidden />
                批量停用 ({selectedKeys.length})
              </Button>
            ) : null}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" size="sm" onClick={handleOpenCreate}>
                    <UserPlus className="size-3.5" aria-hidden />
                    新增
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>后台新增用户（仅 admin）</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        }
        tableProps={{
          columns: columns as ResourceColumn<AdminUserDto>[],
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
          emptyTitle: "暂无用户",
          emptyDescription: list.isError
            ? "加载用户列表失败，请稍后重试或检查后端日志。"
            : "当前筛选条件下没有匹配的用户，试着调整关键词或状态。",
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
          rowSelection: {
            selectedKeys,
            onChange: setSelectedKeys,
            disabled: (row) => row.id === currentUser?.id,
          },
        }}
      />

      <ResponsiveFormLayer
        open={editing !== null}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseEdit();
        }}
        title="编辑用户"
        description={editing?.email ?? undefined}
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
          <EditUserFields
            key={editing.id}
            user={editing}
            value={editForm}
            assignableRoles={assignableRoles}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新增用户"
        description="admin 视角下创建账号；账号初始为启用状态，初始密码由 admin 告知用户"
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
        <CreateUserFields
          key="create-form"
          value={createForm}
          assignableRoles={assignableRoles}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type EditUserFormValue = {
  name: string;
  displayName: string;
  phone: string;
  status: "enabled" | "disabled";
  roleIds: string[];
};

type CreateUserFormValue = {
  email: string;
  username: string;
  password: string;
  name: string;
  displayName: string;
  phone: string;
};

const EMPTY_CREATE_FORM: CreateUserFormValue = {
  email: "",
  username: "",
  password: "",
  name: "",
  displayName: "",
  phone: "",
};

type AssignableRoleOption = {
  id: string;
  name: string;
};

function EditUserFields({
  user,
  value,
  assignableRoles,
  onChange,
}: {
  user: AdminUserDto;
  value: EditUserFormValue;
  assignableRoles: AssignableRoleOption[];
  onChange: (patch: Partial<EditUserFormValue>) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-[4px] border border-line bg-muted px-3 py-2.5">
        <UserAvatar
          user={{ displayName: user.displayName, username: user.username, email: user.email }}
          size="sm"
          variant="brand"
        />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-text-strong">{user.username}</p>
          <p className="truncate text-[11px] text-text-mute">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">姓名</Label>
          <Input
            id="edit-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="用户真实姓名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-displayName">昵称</Label>
          <Input
            id="edit-displayName"
            value={value.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="在系统内显示的友好名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="edit-phone">手机号</Label>
          <Input
            id="edit-phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="可选，例：+8613800138000"
            maxLength={20}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-status">账号状态</Label>
        <Select
          value={value.status}
          onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
        >
          <SelectTrigger id="edit-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">禁用</SelectItem>
          </SelectContent>
        </Select>
        {value.status === "disabled" ? (
          <p className="text-[11px] text-text-mute">禁用后该账号将无法登录，相关历史数据保留。</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-roles">业务角色</Label>
        <MultiSelect
          ariaLabel="业务角色"
          value={value.roleIds}
          onChange={(next) => onChange({ roleIds: next })}
          options={assignableRoles.map((r) => ({
            value: r.id,
            label: r.name,
          }))}
          placeholder="选择该用户可承担的业务角色"
          emptyText="暂无可分配的角色"
        />
        <p className="text-[11px] text-text-mute">
          未选择将清空该用户全部业务角色；仅展示启用中的角色。
        </p>
      </div>
    </>
  );
}

function CreateUserFields({
  value,
  // v1.0 admin 创建不接 roleIds；_assignableRoles 参数保留便于 v2 加业务角色多选。
  assignableRoles: _assignableRoles,
  onChange,
}: {
  value: CreateUserFormValue;
  assignableRoles: AssignableRoleOption[];
  onChange: (patch: Partial<CreateUserFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="create-username">
            用户名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-username"
            value={value.username}
            onChange={(e) => onChange({ username: e.target.value })}
            placeholder="3-30 位字母 / 数字 / 下划线 / 短横线"
            maxLength={30}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-email">
            邮箱 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-email"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="user@yishan.com"
            maxLength={128}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="create-password">
            初始密码 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-password"
            type="password"
            value={value.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="8-128 位（admin 告知用户首次登录后建议改密）"
            maxLength={128}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-name">姓名</Label>
          <Input
            id="create-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="可选"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="create-displayName">昵称</Label>
          <Input
            id="create-displayName"
            value={value.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="可选"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="create-phone">手机号</Label>
          <Input
            id="create-phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="可选，例：+8613800138000"
            maxLength={20}
          />
        </div>
      </div>

      <p className="text-[11px] text-text-mute">
        新用户默认从空业务角色起步（auth 注册流程不接 roleIds），保存后可在「编辑」中分配。
      </p>
    </div>
  );
}
