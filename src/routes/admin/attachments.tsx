import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Download,
  File as FileIcon,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
} from "lucide-react";
import * as React from "react";

import { UploadAttachment } from "@/components/admin/attachments/upload-attachment";
import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import {
  FILTER_CONTROL_CLASS,
  TABLE_ACTION_CLASS,
  TABLE_DANGER_ACTION_CLASS,
} from "@/components/admin/data-table/tokens";
import { StatusBadge, type StatusTone } from "@/components/admin/display";
import { DateRangePicker, Popconfirm } from "@/components/admin/form";
import { ResourcePage } from "@/components/admin/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAttachmentCategories,
  useAttachmentsList,
} from "~/features/attachments/attachments.queries";
import type { AttachmentCategory } from "~/features/attachments/attachments.schema";
import type { AttachmentDto } from "~/features/attachments/attachments.types";
import { useDeleteAttachment } from "~/features/attachments/attachments.use-mutations";
import { MONO_CHIP } from "~/lib/classes";
import { cn } from "~/lib/utils";

type CategoryFilter = "all" | AttachmentCategory;

type FilterState = {
  keyword: string;
  mime: string;
  category: CategoryFilter;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  mime: "",
  category: "all",
  createdFrom: "",
  createdTo: "",
};

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  image: "图片",
  video: "视频",
  document: "文档",
  audio: "音频",
  other: "其它",
};

const CATEGORY_TONE: Record<AttachmentCategory, StatusTone> = {
  image: "info",
  video: "warning",
  document: "neutral",
  audio: "success",
  other: "neutral",
};

const CATEGORY_ICON: Record<AttachmentCategory, React.ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  audio: Music,
  other: FileIcon,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildListQuery(filters: FilterState, page: number, pageSize: number) {
  const trim = (v: string) => v.trim() || undefined;
  return {
    page,
    pageSize,
    keyword: trim(filters.keyword),
    mime: trim(filters.mime),
    category: filters.category === "all" ? undefined : filters.category,
    createdFrom: trim(filters.createdFrom),
    createdTo: trim(filters.createdTo),
  } as const;
}

export const Route = createFileRoute("/admin/attachments")({
  component: AdminAttachmentsPage,
});

function AttachmentThumbnail({ row }: { row: AttachmentDto }) {
  const Icon = CATEGORY_ICON[row.category];
  if (row.category === "image" && row.url) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex size-[50px] items-center justify-center overflow-hidden rounded-[4px] border border-line bg-muted">
          <img
            src={row.url}
            alt={row.name}
            className="size-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <div className="flex size-[50px] items-center justify-center rounded-[4px] border border-line bg-muted text-text-soft">
        <Icon className="size-5" aria-hidden />
      </div>
    </div>
  );
}

function AttachmentCategoryBadge({ category }: { category: AttachmentCategory }) {
  return (
    <StatusBadge tone={CATEGORY_TONE[category]} label={CATEGORY_LABELS[category]} variant="soft" />
  );
}

function AdminAttachmentsPage() {
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [popconfirmRowId, setPopconfirmRowId] = React.useState<string | null>(null);
  const [copyRowId, setCopyRowId] = React.useState<string | null>(null);

  const query = buildListQuery(filters, page, pageSize);
  const list = useAttachmentsList(query);
  const categoriesQuery = useAttachmentCategories();
  const deleteMut = useDeleteAttachment();

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPageOnFilterChange = React.useCallback(() => {
    setPage(1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft fields used only as trigger for reset
  React.useEffect(() => {
    resetPageOnFilterChange();
  }, [
    draft.keyword,
    draft.mime,
    draft.category,
    draft.createdFrom,
    draft.createdTo,
    resetPageOnFilterChange,
  ]);

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

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

  const handleDeleteConfirm = React.useCallback(
    async (row: AttachmentDto) => {
      try {
        await deleteMut.mutateAsync(row.id);
        setPopconfirmRowId(null);
      } catch {
        // 保留弹层让用户看到错误
      }
    },
    [deleteMut],
  );

  const handleCopyLink = React.useCallback(async (row: AttachmentDto) => {
    const url = row.url;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyRowId(row.id);
      window.setTimeout(() => {
        setCopyRowId((current) => (current === row.id ? null : current));
      }, 1500);
    } catch {
      // eslint-disable-next-line no-alert
      window.alert(`复制失败，请手动复制：${url}`);
    }
  }, []);

  const handleDownload = React.useCallback((row: AttachmentDto) => {
    const a = document.createElement("a");
    a.href = row.url;
    a.download = row.name;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const columns: ResourceColumn<AttachmentDto>[] = [
    {
      key: "thumbnail",
      header: "缩略图",
      width: "80px",
      cell: (row) => <AttachmentThumbnail row={row} />,
    },
    {
      key: "name",
      header: "文件名",
      width: "240px",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="break-words whitespace-normal text-[13px] text-text-strong"
            title={row.name}
          >
            {row.name}
          </span>
          <Badge variant="neutral" className={cn("shrink-0 px-1.5", MONO_CHIP)} title={row.mime}>
            {row.mime.split("/")[1]?.toUpperCase() ?? row.mime}
          </Badge>
        </div>
      ),
    },
    {
      key: "category",
      header: "分类",
      width: "100px",
      cell: (row) => <AttachmentCategoryBadge category={row.category} />,
    },
    {
      key: "size",
      header: "大小",
      width: "100px",
      align: "right",
      cell: (row) => (
        <span className="text-[13px] tabular-nums text-text-soft">{formatBytes(row.size)}</span>
      ),
    },
    {
      key: "storage",
      header: "存储驱动",
      width: "120px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.storageName ?? "--"}
        >
          {row.storageName ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "uploader",
      header: "上传者",
      width: "100px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.uploaderName ?? "--"}
        >
          {row.uploaderName ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "上传时间",
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
        const isCopying = copyRowId === row.id;
        return (
          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                void handleCopyLink(row);
              }}
            >
              <Copy className="mr-1 size-3.5" aria-hidden />
              {isCopying ? "已复制" : "复制链接"}
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className={TABLE_ACTION_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(row);
              }}
            >
              <Download className="mr-1 size-3.5" aria-hidden />
              下载
            </Button>
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
              <Trash2 className="mr-1 size-3.5" aria-hidden />
              删除
            </Button>
            <Popconfirm
              open={popconfirmRowId === row.id}
              onOpenChange={(next) => {
                if (!next && popconfirmRowId === row.id) setPopconfirmRowId(null);
              }}
              title={`删除「${row.name}」？`}
              description="将同时尝试清理默认存储上的对象。无法清理时仅删除数据库记录。"
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

  const categoryOptions = (categoriesQuery.data ?? []) as AttachmentCategory[];

  return (
    <ResourcePage
      title="媒体库"
      filterColumns={3}
      filterCollapsible
      filterDefaultCollapsed
      filter={
        <>
          <QueryFormItem label="文件名" htmlFor="filter-keyword">
            <Input
              id="filter-keyword"
              className={FILTER_CONTROL_CLASS}
              allowClear
              placeholder="搜索附件名"
              value={draft.keyword}
              onChange={(e) => applyDraftPatch({ keyword: e.target.value })}
            />
          </QueryFormItem>

          <QueryFormItem label="MIME 类型" htmlFor="filter-mime">
            <Input
              id="filter-mime"
              className={FILTER_CONTROL_CLASS}
              allowClear
              placeholder="例如 image、application/pdf"
              value={draft.mime}
              onChange={(e) => applyDraftPatch({ mime: e.target.value })}
            />
          </QueryFormItem>

          <QueryFormItem label="分类" htmlFor="filter-category">
            <Select
              value={draft.category}
              onValueChange={(v) => applyDraftPatch({ category: v as CategoryFilter })}
            >
              <SelectTrigger id="filter-category" className={FILTER_CONTROL_CLASS}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </QueryFormItem>

          <QueryFormItem label="上传时间" htmlFor="filter-created-range">
            <DateRangePicker
              id="filter-created-range"
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
      toolbarTitle="媒体列表"
      toolbarActions={
        <UploadAttachment
          onUploaded={() => {
            void list.refetch();
          }}
        />
      }
      tableProps={{
        columns: columns as ResourceColumn<AttachmentDto>[],
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
        emptyTitle: "暂无附件",
        emptyDescription: list.isError
          ? "加载附件列表失败，请稍后重试或检查后端日志。"
          : "当前筛选条件下没有匹配附件，点上方「上传」试试。",
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
  );
}
