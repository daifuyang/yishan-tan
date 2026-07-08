import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
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
  useCreateDepartment,
  useDeleteDepartment,
  useUpdateDepartment,
} from "~/features/departments/departments.use-mutations";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  keyword: string;
  status: StatusFilter;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  status: "all",
};

const FILTER_CONTROL_CLASS = "h-8 w-full text-[13px]";
const TABLE_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-brand-600 hover:bg-transparent hover:text-brand-700 hover:no-underline disabled:text-text-mute";
const TABLE_DANGER_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-destructive hover:bg-transparent hover:text-destructive hover:no-underline disabled:text-text-mute";

type EditDepartmentFormValue = {
  name: string;
  code: string;
  parentId: string | null;
  sort: number;
  status: "enabled" | "disabled";
};

const EMPTY_DEPT_FORM: EditDepartmentFormValue = {
  name: "",
  code: "",
  parentId: null,
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

function matchesFilter(node: DepartmentDto, keyword: string, status: StatusFilter): boolean {
  if (status !== "all" && node.status !== status) return false;
  if (keyword) {
    const k = keyword.toLowerCase();
    if (!node.name.toLowerCase().includes(k) && !node.code.toLowerCase().includes(k)) {
      return false;
    }
  }
  return true;
}

function filterTree(
  nodes: DepartmentNode[],
  keyword: string,
  status: StatusFilter,
): DepartmentNode[] {
  const result: DepartmentNode[] = [];
  for (const node of nodes) {
    const filteredChildren = filterTree(node.children, keyword, status);
    const selfMatch = matchesFilter(node, keyword, status);
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

  // 记录用户手动折叠过的节点 id，避免后续 refetch/过滤切换时被自动展开覆盖
  const userCollapsedIds = React.useRef<Set<string>>(new Set());

  const treeQuery = useDepartmentTree();
  const tree = treeQuery.data ?? [];

  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();
  const deleteMut = useDeleteDepartment();

  // 关键字 / 状态按客户端过滤（树结构天然按层级呈现，过滤命中节点会保留其父链）
  const filteredTree = React.useMemo(
    () => filterTree(tree, filters.keyword.trim(), filters.status),
    [tree, filters.keyword, filters.status],
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

  const applyFilterPatch = React.useCallback((patch: Partial<FilterState>) => {
    setFilters((s) => ({ ...s, ...patch }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅作为 filter 变化的触发器
  React.useEffect(() => {
    setPage(1);
  }, [filters.keyword, filters.status]);

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
      code: row.code,
      parentId: row.parentId ?? null,
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
        // 关闭弹层；错误由下方横幅通过 useMutation 状态显示
        setPopconfirmRowId(null);
      }
    },
    [deleteMut],
  );

  const dismissDeleteError = React.useCallback(() => {
    deleteMut.reset();
  }, [deleteMut]);

  const handleEditSubmit = async () => {
    if (!editing) return;
    await updateMut.mutateAsync({
      id: editing.id,
      name: editForm.name,
      parentId: editForm.parentId,
      sort: editForm.sort,
      status: editForm.status,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    await createMut.mutateAsync({
      name: createForm.name,
      code: createForm.code,
      parentId: createForm.parentId,
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
      header: "名称",
      width: "300px",
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
          <span className="truncate text-[13px] text-text-strong" title={row.name}>
            {row.name}
          </span>
        </div>
      ),
    },
    {
      key: "code",
      header: "编码",
      width: "160px",
      cell: (row) => (
        <span className="truncate font-mono text-[13px] text-text-soft" title={row.code}>
          {row.code}
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
      key: "childCount",
      header: "关联子部门",
      width: "110px",
      align: "center",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">
          {row.childCount > 0 ? `${row.childCount} 个` : "--"}
        </span>
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
      width: "260px",
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
            新增子部门
          </Button>
          <Popconfirm
            open={popconfirmRowId === row.id}
            onOpenChange={(next) => {
              if (!next && popconfirmRowId === row.id) setPopconfirmRowId(null);
            }}
            title={`删除「${row.name}」？`}
            description="删除后该部门将被停用，下属部门需先迁移或删除。"
            confirmLabel="删除"
            tone="danger"
            loading={deleteMut.isPending && popconfirmRowId === row.id}
            onConfirm={() => handleDeleteConfirm(row)}
            side="top"
            align="end"
            sideOffset={6}
          >
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_DANGER_ACTION_CLASS}
              disabled={deleteMut.isPending}
              onClick={(e) => {
                e.stopPropagation();
                setPopconfirmRowId(row.id);
              }}
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
        title="部门管理"
        description="维护组织部门树，支持新增 / 编辑 / 启停 / 删除。"
        filterColumns={2}
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="关键字" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                placeholder="按名称或编码模糊搜索"
                value={filters.keyword}
                onChange={(e) => applyFilterPatch({ keyword: e.target.value })}
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
            keyword: String(next.keyword ?? ""),
            status: (next.status as StatusFilter) ?? "all",
          })
        }
        onFilterReset={handleResetFilters}
        filterLoading={treeQuery.isFetching}
        toolbarTitle="部门树"
        toolbarActions={
          <Button type="button" size="sm" onClick={() => handleOpenCreate(null)}>
            <Plus className="size-3.5" aria-hidden />
            新增顶级部门
          </Button>
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
          emptyTitle: "暂无部门",
          emptyDescription: treeQuery.isError
            ? "加载部门列表失败，请稍后重试或检查后端日志。"
            : "尚未配置任何部门，点击「新增顶级部门」开始搭建组织树。",
          emptyAction: treeQuery.isError ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void treeQuery.refetch()}
            >
              重试
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleOpenCreate(null)}
            >
              <Plus className="size-3.5" aria-hidden />
              新增顶级部门
            </Button>
          ),
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
        title="编辑部门"
        description={editing?.code}
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
        title="新增部门"
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
  onChange,
}: {
  value: EditDepartmentFormValue;
  parentOptions: Array<{ value: string; label: string }>;
  allowClearParent?: boolean;
  onChange: (patch: Partial<EditDepartmentFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dept-name">名称</Label>
          <Input
            id="dept-name"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="部门显示名"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept-code">编码</Label>
          <Input
            id="dept-code"
            value={value.code}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder="小写字母、数字、下划线、点、中划线"
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
