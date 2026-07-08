import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Plus, ShieldOff } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TABLE_DANGER_ACTION_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import {
  DatePicker,
  Popconfirm,
  ResponsiveFormLayer,
  SearchMultiSelect,
  SearchSelect,
  type TreeNode,
  TreeSelect,
} from "@/components/admin/form";
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
import { useDepartmentTree } from "~/features/departments/departments.queries";
import type { DepartmentNode } from "~/features/departments/departments.types";
import { usePostsList } from "~/features/posts/posts.queries";
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

const USER_FILTER_PLACEHOLDERS = {
  username: "请输入",
  name: "请输入",
  displayName: "请输入",
  email: "请输入",
  phone: "请输入",
} as const;

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
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminUsersPage() {
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [editing, setEditing] = React.useState<AdminUserDto | null>(null);
  const [editForm, setEditForm] = React.useState<EditUserFormValue>(EMPTY_EDIT_FORM);
  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateUserFormValue>(EMPTY_CREATE_FORM);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);

  const query = toQuery(filters, page, pageSize);
  const { data: currentUser } = useCurrentUser();
  const list = useUsersList(query);
  const updateMut = useUpdateUser();
  const deleteMut = useDeleteUser();
  const bulkUpdateMut = useBulkUpdateUserStatus();
  const createMut = useCreateUser();
  const assignableRolesQuery = useAssignableRoles();
  const assignableRoles = assignableRolesQuery.data?.items ?? [];
  const departmentTreeQuery = useDepartmentTree();
  const departmentTree = departmentTreeQuery.data ?? [];
  const postsQuery = usePostsList({
    page: 1,
    pageSize: 100,
    status: "enabled",
  });
  const posts = postsQuery.data?.items ?? [];

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
    setDisablePopconfirmRowId(null);
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

  const handleStartEdit = (row: AdminUserDto) => {
    setEditing(row);
    setEditForm({
      name: row.name ?? "",
      displayName: row.displayName ?? "",
      phone: row.phone ?? "",
      status: row.status,
      deptId: row.deptId ?? null,
      postIds: row.postIds ?? [],
      gender: row.gender ?? null,
      birthDate: row.birthDate ?? "",
      remark: row.remark ?? "",
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
        <span
          className="break-words whitespace-normal text-[13px] text-text-strong"
          title={row.username}
        >
          {row.username}
        </span>
      ),
    },
    {
      key: "name",
      header: "姓名",
      width: "120px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-strong"
          title={row.name}
        >
          {row.name || <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "displayName",
      header: "昵称",
      width: "120px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-strong"
          title={row.displayName ?? ""}
        >
          {row.displayName ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "email",
      header: "邮箱",
      width: "220px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.email}
        >
          {row.email}
        </span>
      ),
    },
    {
      key: "phone",
      header: "手机号",
      width: "140px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.phone ?? ""}
        >
          {row.phone ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "状态",
      width: "90px",
      cell: (row) => (
        <StatusBadge
          tone="info"
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
                if (isDisabled) {
                  void handleToggleStatus(row);
                } else {
                  setDisablePopconfirmRowId(row.id);
                }
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
            <Popconfirm
              open={disablePopconfirmRowId === row.id}
              onOpenChange={(next) => {
                if (!next && disablePopconfirmRowId === row.id) setDisablePopconfirmRowId(null);
              }}
              title="禁用账号"
              description="你确认禁用此账号吗？"
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
      data: {
        name: editForm.name,
        displayName: editForm.displayName,
        phone: editForm.phone || undefined,
        status: editForm.status,
        deptId: editForm.deptId,
        postIds: editForm.postIds,
        gender: editForm.gender,
        birthDate: editForm.birthDate || null,
        remark: editForm.remark || null,
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
      status: createForm.status,
      deptId: createForm.deptId,
      postIds: createForm.postIds,
      gender: createForm.gender,
      birthDate: createForm.birthDate || null,
      remark: createForm.remark || null,
      roleIds: createForm.roleIds,
    });
    setCreating(false);
    setCreateForm(EMPTY_CREATE_FORM);
  };

  return (
    <>
      <ResourcePage
        title="用户管理"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="用户名" htmlFor="filter-username">
              <Input
                id="filter-username"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={USER_FILTER_PLACEHOLDERS.username}
                value={draft.username}
                onChange={(e) => applyDraftPatch({ username: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="姓名" htmlFor="filter-name">
              <Input
                id="filter-name"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={USER_FILTER_PLACEHOLDERS.name}
                value={draft.name}
                onChange={(e) => applyDraftPatch({ name: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="昵称" htmlFor="filter-displayName">
              <Input
                id="filter-displayName"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={USER_FILTER_PLACEHOLDERS.displayName}
                value={draft.displayName}
                onChange={(e) => applyDraftPatch({ displayName: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="邮箱" htmlFor="filter-email">
              <Input
                id="filter-email"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={USER_FILTER_PLACEHOLDERS.email}
                value={draft.email}
                onChange={(e) => applyDraftPatch({ email: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="手机号" htmlFor="filter-phone">
              <Input
                id="filter-phone"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={USER_FILTER_PLACEHOLDERS.phone}
                value={draft.phone}
                onChange={(e) => applyDraftPatch({ phone: e.target.value })}
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
          </>
        }
        filterValues={draft}
        onFilterSubmit={handleFilterSubmit}
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
                    <Plus className="size-3.5" aria-hidden />
                    新建
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>后台新建用户（仅 admin）</p>
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
          emptyTitle: "暂无数据",
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
        dialogSize="full"
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
            departmentTree={departmentTree}
            posts={posts}
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新建用户"
        dialogSize="full"
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
          departmentTree={departmentTree}
          posts={posts}
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
  deptId: string | null;
  postIds: string[];
  gender: "male" | "female" | "other" | null;
  birthDate: string;
  remark: string;
  roleIds: string[];
};

type CreateUserFormValue = {
  email: string;
  username: string;
  password: string;
  name: string;
  displayName: string;
  phone: string;
  status: "enabled" | "disabled";
  deptId: string | null;
  postIds: string[];
  gender: "male" | "female" | "other" | null;
  birthDate: string;
  remark: string;
  roleIds: string[];
};

const EMPTY_CREATE_FORM: CreateUserFormValue = {
  email: "",
  username: "",
  password: "",
  name: "",
  displayName: "",
  phone: "",
  status: "enabled",
  deptId: null,
  postIds: [],
  gender: null,
  birthDate: "",
  remark: "",
  roleIds: [],
};

const EMPTY_EDIT_FORM: EditUserFormValue = {
  name: "",
  displayName: "",
  phone: "",
  status: "enabled",
  deptId: null,
  postIds: [],
  gender: null,
  birthDate: "",
  remark: "",
  roleIds: [],
};

type AssignableRoleOption = {
  id: string;
  name: string;
};

function toDeptTreeNode(d: DepartmentNode): TreeNode {
  return {
    value: d.id,
    label: d.name,
    children: d.children?.map(toDeptTreeNode),
  };
}

function toPostOption(p: {
  id: string;
  name: string;
  departmentName: string;
  status: "enabled" | "disabled";
}): { value: string; label: string; disabled?: boolean } {
  return {
    value: p.id,
    label: `${p.departmentName} / ${p.name}`,
    disabled: p.status !== "enabled",
  };
}

function DepartmentField({
  id,
  value,
  departmentTree,
  onChange,
}: {
  id: string;
  value: string | null;
  departmentTree: DepartmentNode[];
  onChange: (next: string | null) => void;
}) {
  const deptTreeOptions = React.useMemo(() => departmentTree.map(toDeptTreeNode), [departmentTree]);

  return (
    <div className="min-w-0 space-y-2.5">
      <Label htmlFor={id}>归属部门</Label>
      <TreeSelect
        id={id}
        mode="single"
        value={value}
        onChange={(next) => onChange((next as string | null) ?? null)}
        options={deptTreeOptions}
        placeholder="请选择归属部门"
        searchPlaceholder="搜索部门"
        emptyText="暂无可选部门"
        noMatchText="未找到匹配部门"
        maxHeight={320}
      />
    </div>
  );
}

function PostField({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string[];
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="min-w-0 space-y-2.5">
      <Label htmlFor={id}>岗位</Label>
      <SearchSelect
        id={id}
        aria-label="岗位"
        value={value[0] ?? null}
        onChange={(next) => onChange(next ? [next] : [])}
        options={options}
        placeholder="请选择岗位"
        searchPlaceholder="搜索岗位"
        emptyText="暂无可分配的岗位"
        noMatchText="未找到匹配岗位"
        maxHeight={320}
      />
    </div>
  );
}

function RoleField({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string[];
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="min-w-0 space-y-2.5">
      <Label htmlFor={id}>业务角色</Label>
      <SearchMultiSelect
        id={id}
        aria-label="业务角色"
        value={value}
        onChange={onChange}
        options={options}
        placeholder="选择该用户可承担的业务角色"
        searchPlaceholder="搜索角色"
        emptyText="暂无可分配的角色"
        noMatchText="未找到匹配角色"
        maxHeight={320}
      />
    </div>
  );
}

function EditUserFields({
  user,
  value,
  assignableRoles,
  departmentTree,
  posts,
  onChange,
}: {
  user: AdminUserDto;
  value: EditUserFormValue;
  assignableRoles: AssignableRoleOption[];
  departmentTree: DepartmentNode[];
  posts: Array<{
    id: string;
    name: string;
    departmentId: string;
    departmentName: string;
    status: "enabled" | "disabled";
  }>;
  onChange: (patch: Partial<EditUserFormValue>) => void;
}) {
  const postOptions = React.useMemo(() => posts.map(toPostOption), [posts]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2.5">
          <Label htmlFor="edit-username">登录名称</Label>
          <Input id="edit-username" value={user.username} disabled />
        </div>
        <DepartmentField
          id="edit-deptId"
          value={value.deptId}
          departmentTree={departmentTree}
          onChange={(next) => onChange({ deptId: next })}
        />
        <div className="space-y-2.5">
          <Label htmlFor="edit-phone">手机号码</Label>
          <Input
            id="edit-phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="请输入手机号"
            maxLength={20}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="edit-email">邮箱</Label>
          <Input id="edit-email" type="email" value={user.email} disabled />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="edit-name">真实姓名</Label>
          <Input
            id="edit-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="请输入真实姓名"
            maxLength={50}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="edit-displayName">用户昵称</Label>
          <Input
            id="edit-displayName"
            value={value.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="请输入用户昵称"
            maxLength={50}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="edit-password">用户密码</Label>
          <Input
            id="edit-password"
            type="password"
            value="********"
            disabled
            title="密码通过重置密码操作修改"
          />
        </div>
        <div className="space-y-2.5">
          <Label>用户性别</Label>
          <div className="flex h-8 items-center gap-5 rounded-[4px] border border-transparent px-0.5 text-[13px]">
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="edit-gender"
                checked={value.gender === null}
                onChange={() => onChange({ gender: null })}
                className="size-4"
              />
              <span>保密</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="edit-gender"
                checked={value.gender === "male"}
                onChange={() => onChange({ gender: "male" })}
                className="size-4"
              />
              <span>男</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="edit-gender"
                checked={value.gender === "female"}
                onChange={() => onChange({ gender: "female" })}
                className="size-4"
              />
              <span>女</span>
            </label>
          </div>
        </div>
        <div className="space-y-2.5">
          <Label>状态</Label>
          <div className="flex h-8 items-center gap-5 rounded-[4px] border border-transparent px-0.5 text-[13px]">
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="edit-status"
                checked={value.status === "disabled"}
                onChange={() => onChange({ status: "disabled" })}
                className="size-4"
              />
              <span>禁用</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="edit-status"
                checked={value.status === "enabled"}
                onChange={() => onChange({ status: "enabled" })}
                className="size-4"
              />
              <span>启用</span>
            </label>
          </div>
        </div>
        <PostField
          id="edit-posts"
          value={value.postIds}
          options={postOptions}
          onChange={(next) => onChange({ postIds: next })}
        />
        <RoleField
          id="edit-roles"
          value={value.roleIds}
          options={assignableRoles.map((r) => ({
            value: r.id,
            label: r.name,
          }))}
          onChange={(next) => onChange({ roleIds: next })}
        />
        <div className="space-y-2.5">
          <Label htmlFor="edit-birthDate">出生日期</Label>
          <DatePicker
            id="edit-birthDate"
            value={value.birthDate || null}
            onChange={(next) => onChange({ birthDate: next ?? "" })}
          />
        </div>
        <div className="space-y-2.5 sm:col-span-2">
          <Label htmlFor="edit-remark">备注</Label>
          <Input
            id="edit-remark"
            value={value.remark}
            onChange={(e) => onChange({ remark: e.target.value })}
            placeholder="请输入"
            maxLength={500}
          />
        </div>
      </div>
    </div>
  );
}

function CreateUserFields({
  value,
  assignableRoles,
  departmentTree,
  posts,
  onChange,
}: {
  value: CreateUserFormValue;
  assignableRoles: AssignableRoleOption[];
  departmentTree: DepartmentNode[];
  posts: Array<{
    id: string;
    name: string;
    departmentId: string;
    departmentName: string;
    status: "enabled" | "disabled";
  }>;
  onChange: (patch: Partial<CreateUserFormValue>) => void;
}) {
  const postOptions = React.useMemo(() => posts.map(toPostOption), [posts]);
  const roleOptions = React.useMemo(
    () =>
      assignableRoles.map((r) => ({
        value: r.id,
        label: r.name,
      })),
    [assignableRoles],
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <div className="space-y-2.5">
          <Label htmlFor="create-username">
            登录名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-username"
            value={value.username}
            onChange={(e) => onChange({ username: e.target.value })}
            placeholder="请输入登录名称"
            maxLength={30}
            autoFocus
          />
        </div>
        <DepartmentField
          id="create-deptId"
          value={value.deptId}
          departmentTree={departmentTree}
          onChange={(next) => onChange({ deptId: next })}
        />
        <div className="space-y-2.5">
          <Label htmlFor="create-phone">
            手机号码 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-phone"
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="请输入手机号"
            maxLength={20}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="create-email">
            邮箱 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-email"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="example@email.com"
            maxLength={128}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="create-name">真实姓名</Label>
          <Input
            id="create-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="请输入真实姓名"
            maxLength={50}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="create-displayName">用户昵称</Label>
          <Input
            id="create-displayName"
            value={value.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="请输入用户昵称"
            maxLength={50}
          />
        </div>
        <div className="space-y-2.5">
          <Label htmlFor="create-password">
            用户密码 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="create-password"
            type="password"
            value={value.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="请输入密码"
            maxLength={128}
          />
        </div>
        <div className="space-y-2.5">
          <Label>用户性别</Label>
          <div className="flex h-8 items-center gap-5 rounded-[4px] border border-transparent px-0.5 text-[13px]">
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="create-gender"
                checked={value.gender === null}
                onChange={() => onChange({ gender: null })}
                className="size-4"
              />
              <span>保密</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="create-gender"
                checked={value.gender === "male"}
                onChange={() => onChange({ gender: "male" })}
                className="size-4"
              />
              <span>男</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="create-gender"
                checked={value.gender === "female"}
                onChange={() => onChange({ gender: "female" })}
                className="size-4"
              />
              <span>女</span>
            </label>
          </div>
        </div>
        <div className="space-y-2.5">
          <Label>状态</Label>
          <div className="flex h-8 items-center gap-5 rounded-[4px] border border-transparent px-0.5 text-[13px]">
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="create-status"
                checked={value.status === "disabled"}
                onChange={() => onChange({ status: "disabled" })}
                className="size-4"
              />
              <span>禁用</span>
            </label>
            <label className="inline-flex items-center gap-2 text-text-strong">
              <input
                type="radio"
                name="create-status"
                checked={value.status === "enabled"}
                onChange={() => onChange({ status: "enabled" })}
                className="size-4"
              />
              <span>启用</span>
            </label>
          </div>
        </div>
        <PostField
          id="create-posts"
          value={value.postIds}
          options={postOptions}
          onChange={(next) => onChange({ postIds: next })}
        />
        <RoleField
          id="create-roles"
          value={value.roleIds}
          options={roleOptions}
          onChange={(next) => onChange({ roleIds: next })}
        />
        <div className="space-y-2.5">
          <Label htmlFor="create-birthDate">出生日期</Label>
          <DatePicker
            id="create-birthDate"
            value={value.birthDate || null}
            onChange={(next) => onChange({ birthDate: next ?? "" })}
          />
        </div>
        <div className="space-y-2.5 sm:col-span-2">
          <Label htmlFor="create-remark">备注</Label>
          <textarea
            id="create-remark"
            value={value.remark}
            onChange={(e) => onChange({ remark: e.target.value })}
            placeholder="请输入内容"
            maxLength={500}
            rows={4}
            className="border-line placeholder:text-text-mute focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px] flex min-h-[92px] w-full resize-none rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.6] text-text-strong outline-none"
          />
        </div>
      </div>
    </div>
  );
}
