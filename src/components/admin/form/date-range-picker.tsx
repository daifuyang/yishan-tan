"use client";

import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { placeholders } from "@/lib/copy";
import { cn } from "@/lib/utils";

import {
  HEADER_FORMAT,
  WEEKDAY_LABELS,
  addMonths,
  fromIso,
  getMonthGrid,
  toIso,
} from "./date-picker-utils";

export type DateRange = { start: string | null; end: string | null };

export type DateRangePickerProps = {
  /** `{start, end}` 都是 `YYYY-MM-DD` 字符串;两者都为 null 表示未选择 */
  value: DateRange;
  onChange: (next: DateRange) => void;
  /** 默认 "请选择区间" (宪章 §3.3 / §220) */
  placeholder?: string;
  disabled?: boolean;
  /** 是否展示清除按钮;默认 true */
  clearable?: boolean;
  /** 配 `<Label htmlFor>`;不传则不挂 */
  id?: string;
  "aria-label"?: string;
  className?: string;
};

function todayIso(): string {
  return toIso(new Date());
}

function DateRangePicker({
  value,
  onChange,
  placeholder = placeholders.date.range,
  disabled,
  clearable = true,
  id,
  className,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  // 用户已选了开始日期但还没选结束;重新打开时保留(不会丢)
  const [pendingStart, setPendingStart] = React.useState<string | null>(null);
  // 左月视图;首次打开锚定到 start / pendingStart / 今天
  const [leftMonth, setLeftMonth] = React.useState<Date>(() => {
    const anchor = value.start ?? pendingStart ?? todayIso();
    const d = fromIso(anchor);
    const fallback = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
    return new Date(Date.UTC((d ?? fallback).getUTCFullYear(), (d ?? fallback).getUTCMonth(), 1));
  });
  const rightMonth = React.useMemo(() => addMonths(leftMonth, 1), [leftMonth]);

  const leftGrid = React.useMemo(() => getMonthGrid(leftMonth), [leftMonth]);
  const rightGrid = React.useMemo(() => getMonthGrid(rightMonth), [rightMonth]);

  const handleDayClick = (iso: string) => {
    if (!pendingStart) {
      setPendingStart(iso);
      return;
    }
    // 第二次点 — commit;end < start 自动 swap;同日点保留为单日区间
    const [s, e] = pendingStart <= iso ? [pendingStart, iso] : [iso, pendingStart];
    onChange({ start: s, end: e });
    setPendingStart(null);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange({ start: null, end: null });
    setPendingStart(null);
  };

  const handleFooterClear = () => {
    onChange({ start: null, end: null });
    setPendingStart(null);
    setOpen(false);
  };

  // 触发器显示文本
  const displayValue = (() => {
    if (value.start && value.end) return `${value.start} ~ ${value.end}`;
    if (value.start) return `${value.start} ~ ?`;
    return null;
  })();

  const today = todayIso();

  const renderMonth = (view: Date, grid: Date[], side: "left" | "right") => {
    const viewMonth = view.getUTCMonth();
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between pb-1">
          {side === "left" ? (
            <button
              type="button"
              aria-label="上一月"
              onClick={() => setLeftMonth((v) => addMonths(v, -1))}
              className="rounded p-1 text-text-soft hover:bg-line-soft hover:text-text-strong"
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : (
            <span className="size-6" />
          )}
          <span className="text-[13px] font-medium text-text-strong">
            {HEADER_FORMAT.format(view)}
          </span>
          {side === "right" ? (
            <button
              type="button"
              aria-label="下一月"
              onClick={() => setLeftMonth((v) => addMonths(v, 1))}
              className="rounded p-1 text-text-soft hover:bg-line-soft hover:text-text-strong"
            >
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <span className="size-6" />
          )}
        </div>
        <div className="grid grid-cols-7 gap-y-1 pb-1 text-center text-[11px] text-text-mute">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((d) => {
            const inMonth = d.getUTCMonth() === viewMonth;
            const iso = toIso(d);
            const isStart = iso === value.start;
            const isEnd = iso === value.end && !!value.start;
            const isPendingStart = iso === pendingStart && !value.start;
            const isInRange =
              !!value.start &&
              !!value.end &&
              value.end > value.start &&
              iso > value.start &&
              iso < value.end;
            const isToday = iso === today;
            const isEndpoint = isStart || isEnd || isPendingStart;
            return (
              <button
                key={iso}
                type="button"
                aria-label={iso}
                aria-pressed={isEndpoint}
                aria-current={isToday ? "date" : undefined}
                onClick={() => handleDayClick(iso)}
                className={cn(
                  "mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-[12.5px]",
                  inMonth ? "text-text-strong" : "text-text-mute/50",
                  isEndpoint && "bg-brand-500 text-white hover:bg-brand-600",
                  isInRange && "bg-brand-50 text-text-strong",
                  !isEndpoint && isToday && "ring-1 ring-brand-500/60",
                  !isEndpoint && !isInRange && inMonth && "hover:bg-line-soft",
                )}
              >
                {d.getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          data-slot="date-range-picker"
          className={cn(
            "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-[4px] border border-line bg-white px-3 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
            "focus-visible:border-brand-500 focus-visible:ring-[1px] focus-visible:ring-brand-500",
            "disabled:cursor-not-allowed disabled:opacity-40",
            !displayValue && "text-text-mute",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <Calendar className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">{displayValue ?? placeholder}</span>
          </span>
          {clearable && displayValue && !disabled ? (
            <button
              type="button"
              aria-label="清空"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClear(e);
              }}
              className="shrink-0 rounded-sm p-0.5 text-text-mute transition-colors hover:bg-line-soft hover:text-text-strong"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[560px] p-3">
        <div className="flex gap-4">
          {renderMonth(leftMonth, leftGrid, "left")}
          {renderMonth(rightMonth, rightGrid, "right")}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
          <span className="text-[12px] text-text-mute" aria-live="polite">
            {pendingStart ? `已选开始:${pendingStart},请选择结束` : " "}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={handleFooterClear}>
            清除
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

DateRangePicker.displayName = "DateRangePicker";

export { DateRangePicker };
