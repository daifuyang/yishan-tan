import { ChevronDown, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import {
  QueryFormItem,
  type ResourceColumn,
  type ResourceSortState,
  type ResourceTableProps,
  useListUrlState,
} from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TEXTAREA_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { DateRangePicker, Popconfirm, ResponsiveFormLayer } from "@/components/admin/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { usePortalTemplatesList } from "~/features/portal-content/portal-content.queries";
import {
  type PortalTemplateSortBy,
  portalTemplateListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import type { PortalTemplateDto } from "~/features/portal-content/portal-content.types";
import {
  useBulkDeletePortalTemplates,
  useCreatePortalTemplate,
  useDeletePortalTemplate,
  useUpdatePortalTemplate,
} from "~/features/portal-content/portal-content.use-mutations";
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

type TemplateFormValue = {
  name: string;
  description: string;
  status: "enabled" | "disabled";
  isSystemDefault: boolean;
};

const EMPTY_FORM: TemplateFormValue = {
  name: "",
  description: "",
  status: "enabled",
  isSystemDefault: false,
};

export type PortalTemplateListConfig = {
  /** 模板类型：文章模板 / 页面模板。 */
  type: "article";
  /** 页面标题，如「文章模板管理」。 */
  title: string;
  /** 列表标题，如「文章模板列表」。 */
  toolbarTitle: string;
  /** 表格列设置维度。 */
  settingsKey: string;
};

export type PortalTemplateListView = {
  title: string;
  toolbarTitle: string;
  filter: React.ReactNode;
  filterValues: FilterState;
  filterLoading: boolean;
  onFilterSubmit: () => void;
  onFilterReset: () => void;
  toolbarActions: React.ReactNode;
  tableProps: Omit<ResourceTableProps<PortalTemplateDto>, "variant">;
  /** 编辑 / 新建弹层（含表单）。 */
  dialogs: React.ReactNode;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 门户模板列表视图（文章模板 / 页面模板共用）。
 *
 * 两种模板落在同一张表，用 type 区分：列表固定按 type 过滤，
 * 表单不暴露 type 字段，避免用户把模板建到错误的类型下。
 *
 * 这里只产出 ResourcePage 需要的 props，页面装配（ResourcePage 本体）留在
 * 各路由文件里，便于按 admin 列表规范逐页自查。
 */
export function usePortalTemplateListView({
  type,
  title,
  toolbarTitle,
  settingsKey,
}: PortalTemplateListConfig): PortalTemplateListView {
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
  const [editing, setEditing] = React.useState<PortalTemplateDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<TemplateFormValue>(EMPTY_FORM);
  const [createForm, setCreateForm] = React.useState<TemplateFormValue>(EMPTY_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const permissions = useResourcePermissions("portal-templates");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  const sort = listState.sort as ResourceSortState<PortalTemplateSortBy>;
  const query = portalTemplateListQuerySchema.parse(
    buildListQuery(filters, page, pageSize, sort, type),
  );
  const list = usePortalTemplatesList(query, canRead);
  const createMut = useCreatePortalTemplate();
  const updateMut = useUpdatePortalTemplate();
  const deleteMut = useDeletePortalTemplate();
  const bulkDeleteMut = useBulkDeletePortalTemplates(selectedKeys);

  const items = canRead ? (list.data?.items ?? []) : [];
  const total = canRead ? (list.data?.total ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

  const handleStartEdit = (row: PortalTemplateDto) => {
    setEditing(row);
    setEditForm({
      name: row.name,
      description: row.description ?? "",
      status: row.status,
      isSystemDefault: row.isSystemDefault,
    });
  };

  const handleDeleteConfirm = React.useCallback(
    async (row: PortalTemplateDto) => {
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

  const columns: ResourceColumn<PortalTemplateDto>[] = [
    {
      key: "name",
      sortKey: "name",
      header: "模板名称",
      width: "200px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-strong" title={row.name}>
          {row.name}
        </span>
      ),
    },
    {
      key: "description",
      header: "描述",
      width: "260px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-soft" title={row.description ?? ""}>
          {row.description ?? <span className="text-text-mute">--</span>}
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
      key: "isSystemDefault",
      header: "系统默认",
      width: "90px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{row.isSystemDefault ? "是" : "否"}</span>
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
      width: "240px",
      sticky: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
          <Button
            type="button"
            variant="link"
            size="sm"
            className={TABLE_ACTION_CLASS}
            disabled={!canUpdate}
            onClick={(e) => {
              e.stopPropagation();
              // 设计页是全屏工具：新开标签页，列表状态留在原页面。
              window.open(`/admin/portal/templates/${row.id}`, "_blank", "noopener,noreferrer");
            }}
          >
            设计
          </Button>
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
          <DropdownMenu
            open={moreMenuRowId === row.id}
            onOpenChange={(next) => setMoreMenuRowId(next ? row.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="link"
                size="sm"
                className={TABLE_ACTION_CLASS}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                更多
                <ChevronDown className="size-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-36 rounded-[4px]">
              {row.isSystemDefault ? (
                <DropdownMenuItem disabled>系统默认模板不可删除</DropdownMenuItem>
              ) : (
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
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const handleEditSubmit = async () => {
    if (!editing || !canUpdate) return;
    await updateMut.mutateAsync({
      id: editing.id,
      name: editForm.name.trim(),
      description: editForm.description.trim() || undefined,
      status: editForm.status,
      isSystemDefault: editForm.isSystemDefault,
    });
    setEditing(null);
  };

  const handleCreateSubmit = async () => {
    if (!canCreate) return;
    await createMut.mutateAsync({
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      type,
      status: createForm.status,
      isSystemDefault: createForm.isSystemDefault,
    });
    setCreating(false);
  };

  const filter = (
    <>
      <QueryFormItem label="模板名称" htmlFor={`filter-${type}-template-name`}>
        <Input
          id={`filter-${type}-template-name`}
          className={FILTER_CONTROL_CLASS}
          allowClear
          placeholder={placeholders.input}
          value={draft.name}
          onChange={(e) => applyDraftPatch({ name: e.target.value })}
        />
      </QueryFormItem>

      <QueryFormItem label="状态" htmlFor={`filter-${type}-template-status`}>
        <Select
          value={draft.status}
          onValueChange={(v) => applyDraftPatch({ status: v as StatusFilter })}
        >
          <SelectTrigger id={`filter-${type}-template-status`} className={FILTER_CONTROL_CLASS}>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="enabled">启用</SelectItem>
            <SelectItem value="disabled">已禁用</SelectItem>
          </SelectContent>
        </Select>
      </QueryFormItem>

      <QueryFormItem label="创建时间" htmlFor={`filter-${type}-template-created-range`}>
        <DateRangePicker
          id={`filter-${type}-template-created-range`}
          value={{ start: draft.createdFrom || null, end: draft.createdTo || null }}
          onChange={(r) => applyDraftPatch({ createdFrom: r.start ?? "", createdTo: r.end ?? "" })}
        />
      </QueryFormItem>
    </>
  );

  const toolbarActions = (
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
  );

  const tableProps = {
    settingsKey,
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
          title={`批量删除 ${selectedKeys.length} 个模板？`}
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
    rowKey: (row: PortalTemplateDto) => row.id,
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
    emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无模板",
    error:
      permissions.error ??
      (list.isError ? (list.error instanceof Error ? list.error.message : "加载失败") : undefined),
    rowSelection: canDelete ? { selectedKeys, onChange: setSelectedKeys } : undefined,
  };

  const dialogs = (
    <>
      <ResponsiveFormLayer
        open={editing !== null}
        onOpenChange={(next: boolean) => {
          if (!next) {
            setEditing(null);
            updateMut.reset();
          }
        }}
        title={"编辑文章模板"}
        description={editing?.name}
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
          <TemplateFields
            key={editing.id}
            value={editForm}
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
        title={"新建文章模板"}
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
        <TemplateFields
          key="create-form"
          value={createForm}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );

  return {
    title,
    toolbarTitle,
    filter,
    filterValues: draft,
    filterLoading: list.isFetching,
    onFilterSubmit: handleFilterSubmit,
    onFilterReset: handleResetFilters,
    toolbarActions,
    tableProps,
    dialogs,
  };
}

function TemplateFields({
  value,
  onChange,
}: {
  value: TemplateFormValue;
  onChange: (patch: Partial<TemplateFormValue>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="portal-template-name">模板名称</Label>
        <Input
          id="portal-template-name"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="模板名称"
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-template-description">描述</Label>
        <textarea
          id="portal-template-description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="模板描述"
          maxLength={255}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-template-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="portal-template-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-template-default">系统默认</Label>
          <div className="flex h-8 items-center gap-2">
            <Checkbox
              id="portal-template-default"
              checked={value.isSystemDefault}
              onCheckedChange={(checked) => onChange({ isSystemDefault: checked === true })}
            />
            <span className="text-[13px] text-text-soft">系统默认模板不可删除</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildListQuery(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<PortalTemplateSortBy>,
  type: "article",
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
    type,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  };
}
