import { ChevronLeft, ChevronRight, Inbox, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "../display/empty-state";

type ColumnAlign = "left" | "center" | "right";
type ResourceTableVariant = "standalone" | "card";

type ResourceColumn<Row> = {
  key: string;
  header: React.ReactNode;
  cell?: (row: Row, index: number) => React.ReactNode;
  width?: string;
  align?: ColumnAlign;
  className?: string;
  /** 冻结列方向，需要与父容器 overflow-x-auto 配合；要求列已设置 width。 */
  sticky?: "left" | "right";
};

type ResourceTableProps<Row> = {
  columns: ResourceColumn<Row>[];
  data: Row[];
  rowKey: (row: Row, index: number) => string;

  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  toolbar?: React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  error?: React.ReactNode;
  onRowClick?: (row: Row) => void;
  rowClassName?: (row: Row, index: number) => string;
  className?: string;
  variant?: ResourceTableVariant;
  rowSelection?: {
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    getKey?: (row: Row, index: number) => string;
    disabled?: (row: Row, index: number) => boolean;
  };
};

type ResourcePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  variant?: ResourceTableVariant;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
const HEAD_ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center justify-center",
  right: "text-right",
};

function getStickyCellProps<Row>(
  col: ResourceColumn<Row>,
  zone: "header" | "body",
): { style: React.CSSProperties; className: string } | null {
  if (!col.sticky) return null;
  const isHeader = zone === "header";
  const style: React.CSSProperties = {
    position: "sticky",
    [col.sticky === "left" ? "left" : "right"]: 0,
    zIndex: isHeader ? 3 : 1,
  };
  const sideBorder = col.sticky === "left" ? "border-r" : "border-l";
  const bg = isHeader ? "bg-table-header-bg" : "bg-white";
  return { style, className: `${bg} ${sideBorder} border-line` };
}

const SKELETON_ROW_COUNT = 5;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
const PAGINATION_ITEM_CLASS =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[4px] px-2 text-[13px] font-normal leading-none transition-colors";
const PAGINATION_NAV_BUTTON_CLASS =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[4px] bg-white px-2 text-[13px] text-text-soft transition-colors hover:bg-[#F5F5F5] hover:text-text-strong disabled:pointer-events-none disabled:text-[#BFBFBF]";

type PageEllipsis = {
  type: "ellipsis";
  key: "left" | "right";
};
type PageItem = number | PageEllipsis;

function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, { type: "ellipsis", key: "right" }, totalPages];
  }

  if (page >= totalPages - 3) {
    return [
      1,
      { type: "ellipsis", key: "left" },
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    { type: "ellipsis", key: "left" },
    page - 1,
    page,
    page + 1,
    { type: "ellipsis", key: "right" },
    totalPages,
  ];
}

export function ResourcePagination({
  page,
  pageSize,
  total,
  loading,
  variant = "standalone",
  onPageChange,
  onPageSizeChange,
}: ResourcePaginationProps) {
  const [interactionLoading, setInteractionLoading] = React.useState(false);
  const releaseTimerRef = React.useRef<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(safePage * pageSize, total);
  const isBusy = Boolean(loading || interactionLoading);
  const canPrev = safePage > 1 && !isBusy;
  const canNext = safePage < totalPages && !isBusy;
  const pageItems = React.useMemo(() => getPageItems(safePage, totalPages), [safePage, totalPages]);

  React.useEffect(() => {
    if (loading || !interactionLoading) return;

    releaseTimerRef.current = window.setTimeout(() => {
      setInteractionLoading(false);
      releaseTimerRef.current = null;
    }, 180);

    return () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
        releaseTimerRef.current = null;
      }
    };
  }, [loading, interactionLoading]);

  const startPaginationLoading = React.useCallback(() => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    setInteractionLoading(true);
  }, []);

  const handlePageChange = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(1, nextPage), totalPages);
    if (boundedPage === safePage || isBusy) return;
    startPaginationLoading();
    onPageChange(boundedPage);
  };

  const handlePageSizeChange = (value: string) => {
    const nextPageSize = Number(value);
    if (!Number.isFinite(nextPageSize) || isBusy) return;
    startPaginationLoading();
    onPageSizeChange?.(nextPageSize);
    onPageChange(1);
  };

  return (
    <div
      className={cn(
        "flex min-h-14 items-center justify-end gap-3 py-3 text-[13px] text-text-soft",
        variant === "card" ? "px-0" : "border-t border-line bg-white px-4",
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-2">
        <span className="whitespace-nowrap text-text-strong">
          第 {rangeStart}-{rangeEnd} 条 / 总共 {total} 条
        </span>
        {isBusy ? (
          <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap text-text-mute">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            加载中
          </span>
        ) : null}

        <nav
          className={cn("flex items-center gap-1 rounded-[4px]", isBusy && "cursor-wait")}
          aria-label="分页"
          aria-busy={isBusy}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(safePage - 1)}
            disabled={!canPrev}
            className={PAGINATION_NAV_BUTTON_CLASS}
            aria-label="上一页"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          {pageItems.map((item) =>
            typeof item !== "number" ? (
              <span
                key={`ellipsis-${item.key}`}
                className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-[13px] text-text-mute"
              >
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => handlePageChange(item)}
                disabled={isBusy || item === safePage}
                aria-current={item === safePage ? "page" : undefined}
                className={cn(
                  PAGINATION_ITEM_CLASS,
                  item === safePage
                    ? "bg-brand-500 font-medium text-white shadow-[0_1px_2px_rgba(22,119,255,0.24)]"
                    : "bg-white text-text-strong hover:bg-row-hover disabled:opacity-40",
                  isBusy && item !== safePage && "cursor-not-allowed opacity-40",
                )}
              >
                {item}
              </button>
            ),
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(safePage + 1)}
            disabled={!canNext}
            className={PAGINATION_NAV_BUTTON_CLASS}
            aria-label="下一页"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </nav>

        <Select
          value={String(pageSize)}
          onValueChange={handlePageSizeChange}
          disabled={!onPageSizeChange || isBusy}
        >
          <SelectTrigger className="h-8 w-[92px] rounded-[4px] border-line px-2 text-[13px] text-text-strong hover:border-brand-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / 页
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function ResourceTable<Row>({
  columns,
  data,
  rowKey,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  toolbar,
  loading,
  empty,
  emptyTitle = "暂无数据",
  emptyDescription = "当前条件下没有匹配的数据，调整筛选条件或新增一条试试。",
  emptyAction,
  error,
  onRowClick,
  rowClassName,
  className,
  variant = "standalone",
  rowSelection,
}: ResourceTableProps<Row>) {
  const selectionEnabled = rowSelection !== undefined;
  const resolveSelectionKey = React.useCallback(
    (row: Row, index: number): string | null => {
      if (!rowSelection) return null;
      const fn = rowSelection.getKey ?? rowKey;
      return fn(row, index);
    },
    [rowKey, rowSelection],
  );

  const selectableItems = React.useMemo(() => {
    if (!rowSelection) return [] as Array<{ row: Row; index: number; key: string }>;
    return data
      .map((row, index) => {
        const key = resolveSelectionKey(row, index);
        if (!key) return null;
        if (rowSelection.disabled?.(row, index)) return null;
        return { row, index, key };
      })
      .filter((x): x is { row: Row; index: number; key: string } => x !== null);
  }, [data, resolveSelectionKey, rowSelection]);

  const selectableKeys = React.useMemo(() => selectableItems.map((i) => i.key), [selectableItems]);

  const allSelectableSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((k) => rowSelection?.selectedKeys.includes(k));
  const someSelectableSelected =
    !allSelectableSelected && selectableKeys.some((k) => rowSelection?.selectedKeys.includes(k));

  const handleToggleAll = (checked: boolean) => {
    if (!rowSelection) return;
    if (checked) {
      const merged = Array.from(new Set([...rowSelection.selectedKeys, ...selectableKeys]));
      rowSelection.onChange(merged);
    } else {
      const remaining = rowSelection.selectedKeys.filter((k) => !selectableKeys.includes(k));
      rowSelection.onChange(remaining);
    }
  };

  const handleToggleRow = (key: string, checked: boolean) => {
    if (!rowSelection) return;
    if (checked) {
      if (rowSelection.selectedKeys.includes(key)) return;
      rowSelection.onChange([...rowSelection.selectedKeys, key]);
    } else {
      rowSelection.onChange(rowSelection.selectedKeys.filter((k) => k !== key));
    }
  };

  const selectionHeaderCell = selectionEnabled ? (
    <TableHead
      key="__selection"
      style={{ width: "40px" }}
      className={HEAD_ALIGN_CLASS.center}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        checked={allSelectableSelected}
        {...(someSelectableSelected ? { "data-state": "indeterminate" } : {})}
        ref={(el) => {
          if (el)
            (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate =
              someSelectableSelected;
        }}
        onCheckedChange={(value) => handleToggleAll(value === true)}
        aria-label="全选当前页"
        disabled={selectableItems.length === 0}
      />
    </TableHead>
  ) : null;

  const renderSelectionCell = (row: Row, index: number) => {
    if (!selectionEnabled || !rowSelection) {
      return null;
    }
    const key = resolveSelectionKey(row, index);
    if (!key) return null;
    const disabled = rowSelection.disabled?.(row, index) ?? false;
    const checked = rowSelection.selectedKeys.includes(key);
    return (
      <TableCell
        key="__selection"
        className={ALIGN_CLASS.center}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => handleToggleRow(key, value === true)}
          disabled={disabled}
          aria-label="选择此行"
        />
      </TableCell>
    );
  };

  const renderEmpty = () => {
    if (empty) return empty;
    return (
      <div className="p-4">
        <EmptyState
          icon={Inbox}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          variant="dashed"
        />
      </div>
    );
  };

  return (
    <div
      data-slot="resource-table"
      className={cn(variant === "card" ? "flex flex-col" : "space-y-3", className)}
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">{toolbar}</div>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-x-auto overflow-y-hidden",
          variant === "card" ? "rounded-[4px]" : "border-b border-line bg-white",
        )}
      >
        {error && data.length > 0 ? (
          <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        ) : null}

        {loading && data.length === 0 ? (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                {selectionHeaderCell}
                {columns.map((col) => {
                  const sticky = getStickyCellProps(col, "header");
                  return (
                    <TableHead
                      key={col.key}
                      style={{
                        ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                        ...(sticky?.style ?? {}),
                      }}
                      className={cn(
                        HEAD_ALIGN_CLASS[col.align ?? "left"],
                        sticky?.className,
                        col.className,
                      )}
                    >
                      {col.header}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i).map((i) => (
                <TableRow key={`skeleton-row-${columns.length}-${i}`}>
                  {selectionEnabled ? <TableCell className={ALIGN_CLASS.center} /> : null}
                  {columns.map((col) => {
                    const sticky = getStickyCellProps(col, "body");
                    return (
                      <TableCell
                        key={col.key}
                        style={{
                          ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                          ...(sticky?.style ?? {}),
                        }}
                        className={cn(sticky?.className, col.className)}
                      >
                        <div className="h-4 w-full max-w-[180px] animate-pulse rounded bg-line-soft" />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : data.length === 0 ? (
          renderEmpty()
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                {selectionHeaderCell}
                {columns.map((col) => {
                  const sticky = getStickyCellProps(col, "header");
                  return (
                    <TableHead
                      key={col.key}
                      style={{
                        ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                        ...(sticky?.style ?? {}),
                      }}
                      className={cn(
                        HEAD_ALIGN_CLASS[col.align ?? "left"],
                        sticky?.className,
                        col.className,
                      )}
                    >
                      {col.header}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  key={rowKey(row, index)}
                  className={cn(
                    "group/row",
                    onRowClick && "cursor-pointer",
                    rowClassName?.(row, index),
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {renderSelectionCell(row, index)}
                  {columns.map((col) => {
                    const sticky = getStickyCellProps(col, "body");
                    return (
                      <TableCell
                        key={col.key}
                        style={{
                          ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                          ...(sticky?.style ?? {}),
                        }}
                        className={cn(
                          ALIGN_CLASS[col.align ?? "left"],
                          sticky?.className,
                          col.className,
                        )}
                      >
                        {col.cell
                          ? col.cell(row, index)
                          : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ResourcePagination
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        variant={variant}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

export type { ResourceColumn, ResourcePaginationProps, ResourceTableProps };
