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
  TEXTAREA_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import {
  DatePicker,
  DateRangePicker,
  MultiSelect,
  Popconfirm,
  ResponsiveFormLayer,
} from "@/components/admin/form";
import { ResourcePage } from "@/components/admin/layout";
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
import { Textarea } from "@/components/ui/textarea";
import { useResourcePermissions } from "~/features/permissions/permissions.queries";
import {
  usePortalArticlesList,
  usePortalCategoryOptions,
} from "~/features/portal-content/portal-content.queries";
import {
  type PortalArticleSortBy,
  portalArticleListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import type { PortalArticleDto } from "~/features/portal-content/portal-content.types";
import {
  useBulkDeletePortalArticles,
  useCreatePortalArticle,
  useDeletePortalArticle,
  usePublishPortalArticle,
  useUpdatePortalArticle,
} from "~/features/portal-content/portal-content.use-mutations";
import { placeholders } from "~/lib/copy";
import { normalizeDateRange } from "~/lib/date-range";

type StatusFilter = "all" | "draft" | "published";

type FilterState = {
  title: string;
  status: StatusFilter;
  categoryId: string;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  title: "",
  status: "all",
  categoryId: "",
  createdFrom: "",
  createdTo: "",
};

type AttributeRow = {
  /** 行内唯一 id：属性行可增删重排，用它做 React key，避免数组下标。 */
  id: string;
  key: string;
  value: string;
};

let attributeRowSeq = 0;

function newAttributeRow(key = "", value = ""): AttributeRow {
  attributeRowSeq += 1;
  return { id: `attribute-${attributeRowSeq}`, key, value };
}

type ArticleFormValue = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImage: string;
  status: "draft" | "published";
  isPinned: boolean;
  publishTime: string;
  tags: string;
  categoryIds: string[];
  attributes: AttributeRow[];
};

const EMPTY_FORM: ArticleFormValue = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  coverImage: "",
  status: "draft",
  isPinned: false,
  publishTime: "",
  tags: "",
  categoryIds: [],
  attributes: [],
};

export const Route = createFileRoute("/admin/portal/articles")({
  component: AdminPortalArticlesPage,
});

function formatDateTime(iso: string | null): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 属性键值对数组 → 记录对象；空键直接丢弃。 */
function attributesToRecord(rows: AttributeRow[]): Record<string, string> | undefined {
  const record: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    record[key] = row.value;
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

/** 记录对象 → 属性键值对数组。 */
function recordToAttributes(record: Record<string, unknown> | null): AttributeRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) =>
    newAttributeRow(key, value === null || value === undefined ? "" : String(value)),
  );
}

/** 逗号分隔的标签文本 → 标签数组。 */
function parseTags(text: string): string[] | undefined {
  const tags = text
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

function AdminPortalArticlesPage() {
  const listState = useListUrlState({
    filterKeys: ["title", "status", "categoryId", "createdFrom", "createdTo"],
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 10,
    defaultSort: { sortKey: "createdAt", sortOrder: "desc" },
  });
  const filters = listState.filters as FilterState;
  const page = listState.page;
  const pageSize = listState.pageSize;
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [editing, setEditing] = React.useState<PortalArticleDto | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<ArticleFormValue>(EMPTY_FORM);
  const [createForm, setCreateForm] = React.useState<ArticleFormValue>(EMPTY_FORM);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [moreMenuRowId, setMoreMenuRowId] = React.useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [bulkDeletePopconfirmOpen, setBulkDeletePopconfirmOpen] = React.useState(false);

  const permissions = useResourcePermissions("portal-articles");
  const { canRead, canCreate, canUpdate, canDelete } = permissions;
  const sort = listState.sort as ResourceSortState<PortalArticleSortBy>;
  const query = portalArticleListQuerySchema.parse(buildListQuery(filters, page, pageSize, sort));
  const list = usePortalArticlesList(query, canRead);
  const categories = usePortalCategoryOptions(canRead);
  const createMut = useCreatePortalArticle();
  const updateMut = useUpdatePortalArticle();
  const publishMut = usePublishPortalArticle();
  const deleteMut = useDeletePortalArticle();
  const bulkDeleteMut = useBulkDeletePortalArticles(selectedKeys);

  const items = canRead ? (list.data?.items ?? []) : [];
  const total = canRead ? (list.data?.total ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const categoryOptions = React.useMemo(
    () =>
      (categories.data?.items ?? []).map((item) => ({
        value: item.id,
        label: item.name,
      })),
    [categories.data?.items],
  );
  const categoryNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const item of categories.data?.items ?? []) map.set(item.id, item.name);
    return map;
  }, [categories.data?.items]);

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

  const handleStartEdit = (row: PortalArticleDto) => {
    setEditing(row);
    setEditForm({
      title: row.title,
      slug: row.slug ?? "",
      summary: row.summary ?? "",
      content: row.content,
      coverImage: row.coverImage ?? "",
      status: row.status,
      isPinned: row.isPinned,
      publishTime: row.publishTime ? row.publishTime.slice(0, 16) : "",
      tags: (row.tags ?? []).join(", "),
      categoryIds: row.categoryIds,
      attributes: recordToAttributes(row.attributes),
    });
  };

  const handlePublishToggle = React.useCallback(
    async (row: PortalArticleDto) => {
      if (row.status === "published") {
        await updateMut.mutateAsync({ id: row.id, status: "draft" });
        return;
      }
      await publishMut.mutateAsync(row.id);
    },
    [publishMut, updateMut],
  );

  const handleDeleteConfirm = React.useCallback(
    async (row: PortalArticleDto) => {
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

  const columns: ResourceColumn<PortalArticleDto>[] = [
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
      key: "status",
      header: "状态",
      width: "90px",
      cell: (row) => (
        <StatusBadge
          tone={row.status === "published" ? "success" : "neutral"}
          label={row.status === "published" ? "已发布" : "草稿"}
          variant="soft"
        />
      ),
    },
    {
      key: "isPinned",
      header: "置顶",
      width: "80px",
      cell: (row) =>
        row.isPinned ? (
          <StatusBadge tone="warning" label="置顶" variant="soft" />
        ) : (
          <span className="text-[13px] text-text-mute">--</span>
        ),
    },
    {
      key: "categoryIds",
      header: "分类",
      width: "180px",
      ellipsis: true,
      cell: (row) => {
        const names = row.categoryIds
          .map((id) => categoryNameById.get(id))
          .filter((name): name is string => Boolean(name));
        return (
          <span className="text-[13px] text-text-soft" title={names.join("、")}>
            {names.length > 0 ? names.join("、") : <span className="text-text-mute">--</span>}
          </span>
        );
      },
    },
    {
      key: "publishTime",
      sortKey: "publishTime",
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
        const published = row.status === "published";
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
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              disabled={!canUpdate || publishMut.isPending || updateMut.isPending}
              onClick={(e) => {
                e.stopPropagation();
                void handlePublishToggle(row);
              }}
            >
              {published ? "下线" : "发布"}
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

  const toPayload = (form: ArticleFormValue) => ({
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    summary: form.summary.trim() || undefined,
    content: form.content,
    coverImage: form.coverImage.trim() || undefined,
    status: form.status,
    isPinned: form.isPinned,
    publishTime: form.publishTime ? new Date(form.publishTime).toISOString() : undefined,
    attributes: attributesToRecord(form.attributes),
    tags: parseTags(form.tags),
    categoryIds: form.categoryIds,
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
        title="文章管理"
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="标题" htmlFor="filter-article-title">
              <Input
                id="filter-article-title"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder={placeholders.input}
                value={draft.title}
                onChange={(e) => applyDraftPatch({ title: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-article-status">
              <Select
                value={draft.status}
                onValueChange={(v) => applyDraftPatch({ status: v as StatusFilter })}
              >
                <SelectTrigger id="filter-article-status" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="所属分类" htmlFor="filter-article-category">
              <Select
                value={draft.categoryId || undefined}
                onValueChange={(v) => applyDraftPatch({ categoryId: v })}
              >
                <SelectTrigger id="filter-article-category" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="创建时间" htmlFor="filter-article-created-range">
              <DateRangePicker
                id="filter-article-created-range"
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
        toolbarTitle="文章列表"
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
          settingsKey: "portal-articles",
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
                title={`批量删除 ${selectedKeys.length} 篇文章？`}
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
          emptyTitle: permissions.error || list.isError ? "无法加载列表" : "暂无文章",
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
        title="编辑文章"
        description={editing?.slug ?? undefined}
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
          <ArticleFields
            key={editing.id}
            value={editForm}
            categoryOptions={categoryOptions}
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
        title="新建文章"
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
        <ArticleFields
          key="create-form"
          value={createForm}
          categoryOptions={categoryOptions}
          onChange={(patch) => setCreateForm((s) => ({ ...s, ...patch }))}
        />
      </ResponsiveFormLayer>
    </>
  );
}

type ArticleFieldProps = {
  value: ArticleFormValue;
  categoryOptions: { value: string; label: string }[];
  onChange: (patch: Partial<ArticleFormValue>) => void;
};

function ArticleFields({ value, categoryOptions, onChange }: ArticleFieldProps) {
  const setAttribute = (index: number, patch: Partial<AttributeRow>) => {
    onChange({
      attributes: value.attributes.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-article-title">标题</Label>
          <Input
            id="portal-article-title"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="文章标题"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-article-slug">URL标识</Label>
          <Input
            id="portal-article-slug"
            value={value.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder="URL友好标识，留空自动生成"
            maxLength={200}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-article-cover">封面图</Label>
          <Input
            id="portal-article-cover"
            value={value.coverImage}
            onChange={(e) => onChange({ coverImage: e.target.value })}
            placeholder="封面图片URL"
            maxLength={500}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-article-status">状态</Label>
          <Select
            value={value.status}
            onValueChange={(v) => onChange({ status: v as "draft" | "published" })}
          >
            <SelectTrigger id="portal-article-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="portal-article-publish-time">发布时间</Label>
          <DatePicker
            id="portal-article-publish-time"
            mode="datetime"
            value={value.publishTime || null}
            onChange={(next) => onChange({ publishTime: next ?? "" })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-article-pinned">置顶</Label>
          <div className="flex h-8 items-center gap-2">
            <Checkbox
              id="portal-article-pinned"
              checked={value.isPinned}
              onCheckedChange={(checked) => onChange({ isPinned: checked === true })}
            />
            <span className="text-[13px] text-text-soft">在列表中置顶展示</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>所属分类</Label>
        <MultiSelect
          options={categoryOptions}
          value={value.categoryIds}
          onChange={(next) => onChange({ categoryIds: next })}
          placeholder={placeholders.multiSelect}
          emptyText="暂无可选分类"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-article-tags">标签</Label>
        <Input
          id="portal-article-tags"
          value={value.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          placeholder="多个标签用逗号分隔"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-article-summary">摘要</Label>
        <textarea
          id="portal-article-summary"
          value={value.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          placeholder="文章摘要"
          maxLength={500}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="portal-article-content">正文</Label>
        <Textarea
          id="portal-article-content"
          value={value.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="正文内容"
          rows={10}
          className="min-h-[240px]"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="portal-article-attribute-0">自定义属性</Label>
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
                  id={`portal-article-${row.id}`}
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
  sort: ResourceSortState<PortalArticleSortBy>,
) {
  const title = filters.title.trim() || undefined;
  const status = filters.status === "all" ? undefined : filters.status;
  const categoryId = filters.categoryId || undefined;
  const { createdFrom, createdTo } = normalizeDateRange({
    start: filters.createdFrom || null,
    end: filters.createdTo || null,
  });
  return {
    page,
    pageSize,
    title,
    status,
    categoryId,
    createdFrom,
    createdTo,
    sortBy: sort.sortKey,
    sortOrder: sort.sortOrder,
  };
}
