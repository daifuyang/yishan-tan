import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Download, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TABLE_DANGER_ACTION_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { ResourcePage } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartmentTree } from "~/features/departments/departments.queries";
import type { DepartmentDto, DepartmentNode } from "~/features/departments/departments.types";
import {
  useBulkDeleteDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  useExportDepartments,
  useUpdateDepartment,
} from "~/features/departments/departments.use-mutations";
import { useUsersList } from "~/features/users/users.queries";
import { downloadCsv } from "~/lib/download-csv";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  name: string;
  status: StatusFilter;
};

const DEFAULT_FILTERS: FilterState = {
  name: "",
  status: "all",
};

type EditDepartmentFormValue = {
  name: string;
  parentId: string | null;
  leaderId: string | null;
  sort: number;
  status: "enabled" | "disabled";
};

const EMPTY_DEPT_FORM: EditDepartmentFormValue = {
  name: "",
  parentId: null,
  leaderId: null,
  sort: 0,
  status: "enabled",
};

type FlatDepartmentRow = DepartmentDto & {
  depth: number;
  childCount: number;
  hasChildren: boolean;
};

export const Route = createFileRoute("/admin/departments")({
  component: AdminDepartmentsPage,
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function matchesFilter(node: DepartmentDto, name: string, status: StatusFilter): boolean {
  if (status !== "all" && node.status !== status) return false;
  if (name) {
    const k = name.toLowerCase();
    if (!node.name.toLowerCase().includes(k)) {
      return false;
    }
  }
  return true;
}

function filterTree(nodes: DepartmentNode[], name: string, status: StatusFilter): DepartmentNode[] {
  const result: DepartmentNode[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, name, status);
    const selfMatch = matchesFilter(node, name, status);
    if (selfMatch || filteredChildren.length > 0) {
      result.push({ ...node, children: filteredChildren });
    }
  }
  return result;
}

function flattenTreeForTable(
  nodes: DepartmentNode[],
  expanded: Set<string>,
  depth = 0,
): FlatDepartmentRow[] {
  const rows: FlatDepartmentRow[] = [];
  for (const node of nodes) {
    const hasChildren = node.children.length > 0;
    rows.push({
      ...node,
      depth,
      childCount: node.children.length,
      hasChildren,
    });
    if (hasChildren && expanded.has(node.id)) {
      rows.push(...flattenTreeForTable(node.children, expanded, depth + 1));
    }
  }
  return rows;
}

function collectIds(node: DepartmentNode): string[] {
  return [node.id, ...node.children.flatMap(collectIds)];
}

function collectFlatten(node: DepartmentNode): DepartmentNode[] {
  return node.children.flatMap((c) => [c, ...collectFlatten(c)]);
}

function findNodeInTree(nodes: DepartmentNode[], id: string): DepartmentNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInTree(node.children, id);
    if (found) return found;
  }
  return null;
}

function AdminDepartmentsPage() {
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const [editing, setEditing] = React.useState<DepartmentDto | null>(null);
  const [editForm, setEditForm] = React.useState<EditDepartmentFormValue>(EMPTY_DEPT_FORM);

  const [creating, setCreating] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<EditDepartmentFormValue>({
    ...EMPTY_DEPT_FORM,
    parentId: null,
  });
  const [createParentName, setCreateParentName] = React.useState<string | null>(null);

  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  // 记录用户手动折叠过的节点 id，避免后续 refetch/过滤切换时被自动展开覆盖
  const userCollapsedIds = React.useRef<Set<string>>(new Set());

  const treeQuery = useDepartmentTree();
  const tree = treeQuery.data ?? [];
  const usersListQuery = useUsersList({ page: 1, pageSize: 200, status: "enabled" });
  const leaderOptions = React.useMemo(
    () =>
      (usersListQuery.data?.items ?? []).map((u) => ({
        value: u.id,
        label: u.displayName || u.username,
      })),
    [usersListQuery.data],
  );

  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();
  const deleteMut = useDeleteDepartment();
  const bulkDeleteMut = useBulkDeleteDepartments();
  const exportMut = useExportDepartments();

  // 名称 / 状态按客户端过滤（树结构天然按层级呈现，过滤命中节点会保留其父链）。
  // 客户端过滤使用提交后的 filters，确保与 ResourcePage 的「查询」按钮语义一致。
  const filteredTree = React.useMemo(
    () => filterTree(tree, filters.name.trim(), filters.status),
    [tree, filters.name, filters.status],
  );

  const flatRows = React.useMemo(
    () => flattenTreeForTable(filteredTree, expanded),
    [filteredTree, expanded],
  );

  // 默认全部展开，但尊重用户手动折叠过的节点（不被 refetch/过滤切换覆盖）
  React.useEffect(() => {
    if (filteredTree.length === 0) return;
    setExpanded(() => {
      const allIds = filteredTree.flatMap((n) => collectIds(n));
      const collapsed = userCollapsedIds.current;
      const next = new Set<string>();
      for (const id of allIds) {
        if (!collapsed.has(id)) next.add(id);
      }
      return next;
    });
  }, [filteredTree]);

  const total = flatRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const handleFilterSubmit = React.useCallback(() => {
    setFilters(draft);
  }, [draft]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅作为 filter 变化的触发器
  React.useEffect(() => {
    setPage(1);
  }, [draft.name, draft.status]);

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  const handleToggleExpand = React.useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        userCollapsedIds.current.add(id);
      } else {
        next.add(id);
        userCollapsedIds.current.delete(id);
      }
      return next;
    });
  }, []);

  const handleStartEdit = (row: DepartmentDto) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      parentId: row.parentId ?? null,
      leaderId: row.leaderId ?? null,
      sort: row.sort,
      status: row.status,
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    updateMut.reset();
  };

  const handleOpenCreate = (parent: { id: string | null; name: string | null } | null = null) => {
    setCreateForm({
      ...EMPTY_DEPT_FORM,
      parentId: parent?.id ?? null,
    });
    setCreateParentName(parent?.name ?? null);
    setCreating(true);
  };

  const handleCloseCreate = () => {
    setCreating(false);
    createMut.reset();
  };

  const handleDeleteConfirm = React.useCallback(
    async (row: DepartmentDto) => {
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
      // 错误由 useMutation 状态显示；保留弹层让用户看到错误
    }
  }, [bulkDeleteMut, selectedKeys]);

  const handleExport = React.useCallback(async () => {
    try {
      const csv = await exportMut.mutateAsync({
        name: filters.name.trim() || undefined,
        status: filters.status === "all" ? undefined : filters.status,
      });
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadCsv(`departments-${stamp}.csv`, csv);
    } catch {
      // 错误提示由 useMutation errorMessage 暴露
    }
  }, [exportMut, filters.name, filters.status]);

  const handleEditSubmit = async () => {
    if (!editing) return;
    await updateMut.mutateAsync({
      id: editing.id,
      name: editForm.name,
      parentId: editForm.parentId,
      leaderId: editForm.leaderId,
      sort: editForm.sort,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      name: createForm.name,
      parentId: createForm.parentId,
      leaderId: createForm.leaderId,
      sort: createForm.sort,
      status: createForm.status,
    });
    setCreating(false);
  };

  // 编辑时父部门选项：排除自身和所有下级，避免形成环
  const editParentOptions = React.useMemo(() => {
    if (!editing) return [] as Array<{ value: string; label: string }>;
    const blocked = new Set<string>([editing.id]);
    const editingNode = findNodeInTree(tree, editing.id);
    if (editingNode) {
      for (const id of collectIds(editingNode)) blocked.add(id);
    }
    return tree
      .flatMap((n) => [n, ...collectFlatten(n)])
      .filter((r) => !blocked.has(r.id))
      .map((r) => ({ value: r.id, label: r.name }));
  }, [editing, tree]);

  const createParentOptions = React.useMemo(
    () =>
      tree.flatMap((n) => [n, ...collectFlatten(n)]).map((r) => ({ value: r.id, label: r.name })),
    [tree],
  );

  const columns: ResourceColumn<FlatDepartmentRow>[] = [
    {
      key: "name",
      header: "部门名称",
      width: "260px",
      cell: (row) => (
        <div
          className="flex items-center gap-1 whitespace-nowrap"
          style={{ paddingLeft: row.depth * 16 }}
        >
          {row.hasChildren ? (
            <button
              type="button"
              aria-label={expanded.has(row.id) ? "收起" : "展开"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(row.id);
              }}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-text-soft transition-colors hover:bg-line-soft hover:text-text-strong"
            >
              {expanded.has(row.id) ? (
                <ChevronDown className="size-3.5" aria-hidden />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden />
              )}
            </button>
          ) : (
            <span aria-hidden className="inline-block size-5 shrink-0" />
          )}
          <span
            className="break-words whitespace-normal text-[13px] text-text-strong"
            title={row.name}
          >
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: "parentName",
      header: "上级部门",
      width: "160px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.parentName ?? ""}
        >
          {row.parentName ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "leaderName",
      header: "负责人",
      width: "120px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.leaderName ?? ""}
        >
          {row.leaderName ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "sort",
      header: "排序",
      width: "80px",
      align: "center",
      cell: (row) => <span className="text-[13px] text-text-soft">{row.sort}</span>,
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
      key: "updatedAt",
      header: "更新时间",
      width: "170px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.updatedAt)}</span>
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
      key: "actions",
      header: "操作",
      align: "right",
      width: "220px",
      sticky: "right",
      cell: (row) => (
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
            className={TABLE_ACTION_CLASS}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreate({ id: row.id, name: row.name });
            }}
          >
            <Plus className="size-3.5" aria-hidden />
            新建子部门
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
              className={TABLE_DANGER_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setPopconfirmRowId(row.id);
              }}
              disabled={deleteMut.isPending}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <ResourcePage
        title="部门管理"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="部门名称" htmlFor="filter-name">
              <Input
                id="filter-name"
                className={FILTER_CONTROL_CLASS}
                placeholder="请输入"
                value={draft.name}
                onChange={(e) => applyDraftPatch({ name: e.target.value })}
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
        onFilterReset={handleResetFilters}
        onFilterSubmit={handleFilterSubmit}
        filterLoading={treeQuery.isFetching}
        toolbarTitle="部门树"
        toolbarActions={
          <>
            {selectedKeys.length > 0 ? (
              <Popconfirm
                open={bulkDeletePopconfirmOpen}
                onOpenChange={(next) => {
                  if (!next && bulkDeletePopconfirmOpen) {
                    setBulkDeletePopconfirmOpen(false);
                    bulkDeleteMut.reset();
                  }
                }}
                title={`批量删除 ${selectedKeys.length} 个部门？`}
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
                  disabled={bulkDeleteMut.isPending}
                  onClick={() => setBulkDeletePopconfirmOpen(true)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  批量删除 ({selectedKeys.length})
                </Button>
              </Popconfirm>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exportMut.isPending}
              onClick={() => void handleExport()}
            >
              <Download className="size-3.5" aria-hidden />
              {exportMut.isPending ? "导出中…" : "导出"}
            </Button>
            <Button type="button" size="sm" onClick={() => handleOpenCreate(null)}>
              <Plus className="size-3.5" aria-hidden />
              新建
            </Button>
          </>
        }
        tableProps={{
          columns: columns as ResourceColumn<FlatDepartmentRow>[],
          data: flatRows,
          rowKey: (row) => row.id,
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
          loading: treeQuery.isFetching,
          // 区分两种 empty：①真空（无任何部门）→ 大图标 + 新建引导；②过滤空（有数据但被过滤掉）→ dashed 横幅 + 清空筛选
          emptyTitle: treeQuery.isError
            ? "加载失败"
            : tree.length === 0
              ? "暂无部门"
              : "未找到匹配的部门",
          error: treeQuery.isError
            ? treeQuery.error instanceof Error
              ? treeQuery.error.message
              : "加载失败"
            : undefined,
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
        title="编辑部门"
        description={editing?.parentName ? `上级部门：${editing.parentName}` : "顶级部门"}
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
          <EditDepartmentFields
            key={editing.id}
            value={editForm}
            parentOptions={editParentOptions}
            leaderOptions={leaderOptions}
            allowClearParent
            onChange={(patch) => setEditForm((s) => ({ ...s, ...patch }))}
          />
        ) : null}
      </ResponsiveFormLayer>

      <ResponsiveFormLayer
        open={creating}
        onOpenChange={(next: boolean) => {
          if (!next) handleCloseCreate();
        }}
        title="新建部门"
        description={createParentName ? `所属上级：${createParentName}` : "顶级部门"}
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
        <EditDepartmentFields
          key="create-form"
          value={createForm}
          parentOptions={createParentOptions}
          leaderOptions={leaderOptions}
          allowClearParent
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

function EditDepartmentFields({
  value,
  parentOptions,
  allowClearParent,
  leaderOptions,
  onChange,
}: {
  value: EditDepartmentFormValue;
  parentOptions: Array<{ value: string; label: string }>;
  allowClearParent?: boolean;
  leaderOptions: Array<{ value: string; label: string }>;
  onChange: (patch: Partial<EditDepartmentFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dept-name">部门名称</Label>
          <Input
            id="dept-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="部门显示名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept-parent">上级部门</Label>
          <Select
            value={value.parentId ?? (allowClearParent ? "__root__" : "")}
            onValueChange={(v) => onChange({ parentId: v === "__root__" ? null : v })}
          >
            <SelectTrigger id="dept-parent">
              <SelectValue placeholder="选择上级部门（不选则为顶级）" />
            </SelectTrigger>
            <SelectContent>
              {allowClearParent ? <SelectItem value="__root__">顶级部门</SelectItem> : null}
              {parentOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept-sort">排序</Label>
          <Input
            id="dept-sort"
            type="number"
            min={0}
            max={9999}
            value={value.sort}
            onChange={(e) => {
              const next = Number(e.target.value);
              onChange({ sort: Number.isFinite(next) && next >= 0 ? Math.min(next, 9999) : 0 });
            }}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dept-leader">负责人</Label>
          <Select
            value={value.leaderId ?? "__none__"}
            onValueChange={(v) => onChange({ leaderId: v === "__none__" ? null : v })}
          >
            <SelectTrigger id="dept-leader">
              <SelectValue placeholder="不指定" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">不指定</SelectItem>
              {leaderOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dept-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="dept-status">
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
