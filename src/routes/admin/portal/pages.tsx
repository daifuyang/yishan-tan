import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
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
import {
  DatePicker,
  DateRangePicker,
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
import { Textarea } from "@/components/ui/textarea";
import { useResourcePermissions } from "~/features/permissions/permissions.queries";
import { usePortalPagesList } from "~/features/portal-content/portal-content.queries";
import {
  type PortalPageSortBy,
  portalPageListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import type { PortalPageDto } from "~/features/portal-content/portal-content.types";
import {
  useBulkDeletePortalPages,
  useCreatePortalPage,
  useDeletePortalPage,
  useUpdatePortalPage,
} from "~/features/portal-content/portal-content.use-mutations";
import { MONO_CELL } from "~/lib/classes";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

type StatusFilter = "all" | "enabled" | "disabled";

type FilterState = {
  title: string;
  path: string;
  status: StatusFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  title: "",
  path: "",
  status: "all",
  createdFrom: "",
  createdTo: "",
};

type AttributeRow = {
  /** 行内唯一 id：属性行可增删重排，用它做 React key，避免数组下标。 */
  id: string;
  key: string;
  value: string;
};

type PageFormValue = {
  title: string;
  path: string;
  content: string;
  status: "enabled" | "disabled";
  publishTime: string;
  attributes: AttributeRow[];
};

const EMPTY_FORM: PageFormValue = {
  title: "",
  path: "",
  content: "",
  status: "enabled",
  publishTime: "",
  attributes: [],
};

export const Route = createFileRoute("/admin/portal/pages")({
  component: AdminPortalPagesPage,
});

function formatDateTime(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let attributeRowSeq = 0;

function newAttributeRow(key = "", value = ""): AttributeRow {
  attributeRowSeq += 1;
  return { id: `attribute-${attributeRowSeq}`, key, value };
}

function attributesToRecord(rows: AttributeRow[]): Record<string, string> | undefined {
  const record: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    record[key] = row.value;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function recordToAttributes(record: Record<string, unknown> | null): AttributeRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) =>
    newAttributeRow(key, value === null || value === undefined ? "" : String(value)),
  );
}

function AdminPortalPagesPage() {
  const listState = useListUrlState({
    filterKeys: ["title", "path", "status", "createdFrom", "createdTo"],
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 10,
    defaultSort: { sortKey: "createdAt", sortOrder: "desc" },
  });
  const filters = listState.filters as FilterState;
  const page = listState.page;
  const pageSize = listState.pageSize;
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [editing, setEditing] = React.useState<PortalPageDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<PageFormValue>(EMPTY_FORM);
  const [createForm, setCreateForm] = React.useState<PageFormValue>(EMPTY_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [disablePopconfirmRowId, setDisablePopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const permissions = useResourcePermissions("portal-pages");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  const sort = listState.sort as ResourceSortState<PortalPageSortBy>;
  const query = portalPageListQuerySchema.parse(buildListQuery(filters, page, pageSize, sort));
  const list = usePortalPagesList(query, canRead);
  const createMut = useCreatePortalPage();
  const updateMut = useUpdatePortalPage();
  const deleteMut = useDeletePortalPage();
  const bulkDeleteMut = useBulkDeletePortalPages(selectedKeys);

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

  const handleStartEdit = (row: PortalPageDto) => {
    setEditing(row);
    setEditForm({
      title: row.title,
      path: row.path,
      content: row.content,
      status: row.status,
      publishTime: row.publishTime ? row.publishTime.slice(0, 16) : "",
      attributes: recordToAttributes(row.attributes),
    });
  };

  const handleToggleStatus = React.useCallback(
    async (row: PortalPageDto) => {
      const next = row.status === "enabled" ? "disabled" : "enabled";
      await updateMut.mutateAsync({ id: row.id, status: next });
    },
    [updateMut],
  );

  const handleDisableConfirm = React.useCallback(
    async (row: PortalPageDto) => {
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
    async (row: PortalPageDto) => {
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

  const columns: ResourceColumn<PortalPageDto>[] = [
    {
      key: "title",
      sortKey: "title",
      header: "标题",
      width: "220px",
      ellipsis: true,
      cell: (row) => (
        <span className="text-[13px] text-text-strong" title={row.title}>
          {row.title}
        </span>
      ),
    },
    {
      key: "path",
      sortKey: "path",
      header: "URL路径",
      width: "220px",
      ellipsis: true,
      cell: (row) => (
        <span className={MONO_CELL} title={row.path}>
          {row.path}
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
      key: "publishTime",
      header: "发布时间",
      width: "170px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.publishTime)}</span>
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
                title="禁用页面"
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
                  title={`删除「${row.title}」？`}
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

  const toPayload = (form: PageFormValue) => ({
    title: form.title.trim(),
    path: form.path.trim(),
    content: form.content,
    status: form.status,
    publishTime: form.publishTime ? new Date(form.publishTime).toISOString() : undefined,
    attributes: attributesToRecord(form.attributes),
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
        title="页面管理"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="标题" htmlFor="filter-page-title">
              <Input
                id="filter-page-title"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.title}
                onChange={(e) => applyDraftPatch({ title: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="路径" htmlFor="filter-page-path">
              <Input
                id="filter-page-path"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="如 /about"
                value={draft.path}
                onChange={(e) => applyDraftPatch({ path: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-page-status">
              <Select
                value={draft.status}
                onValueChange={(v) => applyDraftPatch({ status: v as StatusFilter })}
              >
                <SelectTrigger id="filter-page-status" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="创建时间" htmlFor="filter-page-created-range">
              <DateRangePicker
                id="filter-page-created-range"
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
        toolbarTitle="页面列表"
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
          settingsKey: "portal-pages",
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
                title={`批量删除 ${selectedKeys.length} 个页面？`}
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
          emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无页面",
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
        title="编辑页面"
        description={editing?.path}
        dialogSize="lg"
        sheetSize="lg"
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
          <PageFields
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
        title="新建页面"
        dialogSize="lg"
        sheetSize="lg"
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
        <PageFields
          key="create-form"
          value={createForm}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

function PageFields({
  value,
  onChange,
}: {
  value: PageFormValue;
  onChange: (patch: Partial<PageFormValue>) => void;
}) {
  const setAttribute = (index: number, patch: Partial<AttributeRow>) => {
    onChange({
      attributes: value.attributes.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-page-title">页面标题</Label>
          <Input
            id="portal-page-title"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="页面标题"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-page-path">页面路径</Label>
          <Input
            id="portal-page-path"
            value={value.path}
            onChange={(e) => onChange({ path: e.target.value })}
            placeholder="如 /about"
            maxLength={255}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-page-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "enabled" | "disabled" })}
          >
            <SelectTrigger id="portal-page-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="enabled">启用</SelectItem>
              <SelectItem value="disabled">禁用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-page-publish-time">发布时间</Label>
          <DatePicker
            id="portal-page-publish-time"
            mode="datetime"
            value={value.publishTime || null}
            onChange={(next) => onChange({ publishTime: next ?? "" })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-page-content">正文</Label>
        <Textarea
          id="portal-page-content"
          value={value.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="正文内容"
          rows={10}
          className="min-h-[240px]"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>自定义属性</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ attributes: [...value.attributes, newAttributeRow()] })}
          >
            <Plus className="size-3.5" aria-hidden />
            新增属性
          </Button>
        </div>
        {value.attributes.length === 0 ? (
          <p className="text-[12px] text-text-mute">暂无自定义属性</p>
        ) : (
          <div className="space-y-2">
            {value.attributes.map((row, index) => (
              <div key={row.id} className="flex items-center gap-2">
                <Input
                  value={row.key}
                  onChange={(e) => setAttribute(index, { key: e.target.value })}
                  placeholder="键"
                  aria-label="属性键"
                />
                <Input
                  value={row.value}
                  onChange={(e) => setAttribute(index, { value: e.target.value })}
                  placeholder="值"
                  aria-label="属性值"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="删除属性"
                  onClick={() =>
                    onChange({
                      attributes: value.attributes.filter((_, i) => i !== index),
                    })
                  }
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildListQuery(
  filters: FilterState,
  page: number,
  pageSize: number,
  sort: ResourceSortState<PortalPageSortBy>,
) {
  const title = filters.title.trim() || undefined;
  const path = filters.path.trim() || undefined;
  const status = filters.status === "all" ? undefined : filters.status;
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  return {
    page,
    pageSize,
    title,
    path,
    status,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  };
}
