import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * 后台统一分页条（Ant Design Pro 风格）。
 *
 * 视觉标准（全局唯一实现，页面不要再自己画分页）：
 *   * 左侧汇总文案、右侧页码控件；
 *   * 当前页品牌蓝底白字，其余为白底浅灰描边；
 *   * 不画上边框 —— 表格末行分隔线与分页区之间只留一段留白，
 *     避免出现"双横线"；
 *   * 不使用卡片容器。
 */

export type ResourcePaginationProps = {
  /** 当前页码，从 1 开始。 */
  current: number;
  pageSize: number;
  total: number;
  /** 翻页 / 改每页条数统一回调；改每页条数时 current 会被重置为 1。 */
  onChange: (page: number, pageSize: number) => void;
  loading?: boolean;
  /** 是否展示"每页条数"下拉；需要页面自身处理 pageSize 时开启。 */
  showSizeChanger?: boolean;
  /**
   * 汇总文案：
   * - true（默认）：`共 N 条，第 x/y 页`；
   * - false：不展示；
   * - 函数：自定义渲染，如 `(total) => \`共 ${total} 条\``。
   */
  showTotal?: boolean | ((total: number) => React.ReactNode);
  /** 自定义汇总文案，优先级高于 showTotal 的默认文案。 */
  summary?: React.ReactNode;
  /**
   * 布局：
   * - "inline"（默认）：整条分页右对齐（汇总文字 + 每页条数 + 页码）；
   * - "split"：左侧汇总、右侧「每页条数 + 页码」。
   */
  layout?: "inline" | "split";
  pageSizeOptions?: readonly number[];
  /**
   * 快速跳页（对齐 antd 的 showQuickJumper）。
   *
   * 默认开启，但只有一页时不会渲染（没有跳转的必要）。
   */
  showQuickJumper?: boolean;
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const PAGINATION_ITEM_CLASS =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[4px] px-2 text-[13px] font-normal leading-none transition-colors";
const PAGINATION_NAV_BUTTON_CLASS =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[4px] bg-white px-2 text-[13px] text-text-soft transition-colors hover:bg-line-soft hover:text-text-strong disabled:pointer-events-none disabled:text-text-disabled";

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
  current,
  pageSize,
  total,
  onChange,
  loading,
  showSizeChanger = false,
  showTotal = true,
  summary,
  layout = "inline",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showQuickJumper = true,
}: ResourcePaginationProps) {
  const [interactionLoading, setInteractionLoading] = React.useState(false);
  const [jumpValue, setJumpValue] = React.useState("");
  const releaseTimerRef = React.useRef<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, current), totalPages);
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
    onChange(boundedPage, pageSize);
  };

  const handlePageSizeChange = (value: string) => {
    const nextPageSize = Number(value);
    if (!Number.isFinite(nextPageSize) || isBusy) return;
    startPaginationLoading();
    onChange(1, nextPageSize);
  };

  const handleJump = () => {
    const target = Number(jumpValue);
    if (!Number.isFinite(target)) {
      setJumpValue("");
      return;
    }
    setJumpValue("");
    handlePageChange(Math.trunc(target));
  };

  const isSplit = layout === "split";

  const totalNode =
    summary !== undefined
      ? summary
      : typeof showTotal === "function"
        ? showTotal(total)
        : showTotal
          ? `共 ${total} 条，第 ${safePage}/${totalPages} 页`
          : null;

  const pageSizeSelect = showSizeChanger ? (
    <Select value={String(pageSize)} onValueChange={handlePageSizeChange} disabled={isBusy}>
      <SelectTrigger
        aria-label="每页条数"
        className="h-8 w-[92px] rounded-[4px] border-line px-2 text-[13px] text-text-strong hover:border-brand-500"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {pageSizeOptions.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {`${size} / 页`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  return (
    <div
      className={cn(
        "flex min-h-14 items-center gap-3 py-3 text-[13px] text-text-soft",
        isSplit ? "justify-between" : "justify-end",
      )}
    >
      {totalNode !== null ? (
        <span
          className={cn(
            "whitespace-nowrap",
            isSplit ? "text-[12px] text-text-mute" : "text-[13px] text-text-strong",
          )}
        >
          {totalNode}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        {isBusy ? (
          <span className="inline-flex h-5 items-center gap-1 whitespace-nowrap text-text-mute">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            加载中
          </span>
        ) : null}

        {pageSizeSelect}

        {showQuickJumper && totalPages > 1 ? (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="text-[13px] text-text-soft">跳至</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              aria-label="跳至页码"
              value={jumpValue}
              disabled={isBusy}
              onChange={(event) => setJumpValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                handleJump();
              }}
              className="h-8 w-16 rounded-[4px] px-2 text-[13px] text-text-strong"
            />
            <span className="text-[13px] text-text-soft">页</span>
          </div>
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
                aria-hidden
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
                aria-label={`第 ${item} 页`}
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
      </div>
    </div>
  );
}
