"use client";

import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  DISPLAY_FORMAT,
  HEADER_FORMAT,
  WEEKDAY_LABELS,
  addMonths,
  fromIso,
  getMonthGrid,
  toIso,
} from "./date-picker-utils";

export type DatePickerProps = {
  /** "YYYY-MM-DD" 字符串;与现有 `<input type="date">` 契约一致 */
  value: string | null;
  onChange: (next: string | null) => void;
  /** 默认 "请选择日期" (宪章 §3.3) */
  placeholder?: string;
  disabled?: boolean;
  /** 是否展示清除按钮;默认 true */
  clearable?: boolean;
  /** 配 `<Label htmlFor>`;不传则不挂 */
  id?: string;
  "aria-label"?: string;
  name?: string;
  className?: string;
};

function DatePicker({
  value,
  onChange,
  placeholder = "请选择日期",
  disabled,
  clearable = true,
  id,
  name: _name,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const selected = React.useMemo(() => (value ? fromIso(value) : null), [value]);
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<Date>(
    () => selected ?? new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)),
  );

  React.useEffect(() => {
    if (open && selected) {
      setView(new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)));
    }
  }, [open, selected]);

  const grid = React.useMemo(() => getMonthGrid(view), [view]);
  const viewMonth = view.getUTCMonth();
  const todayIso = toIso(new Date());

  const handleSelect = (d: Date) => {
    onChange(toIso(d));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          className={cn(
            "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-[4px] border border-line bg-white px-3 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
            "focus-visible:border-brand-500 focus-visible:ring-[1px] focus-visible:ring-brand-500",
            "disabled:cursor-not-allowed disabled:opacity-40",
            !value && "text-text-mute",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <Calendar className="size-3.5 shrink-0 opacity-60" aria-hidden />
            <span className="truncate">
              {selected ? DISPLAY_FORMAT.format(selected) : placeholder}
            </span>
          </span>
          {clearable && value && !disabled ? (
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
      <PopoverContent align="start" className="w-[280px] p-3">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            aria-label="上一月"
            onClick={() => setView((v) => addMonths(v, -1))}
            className="rounded p-1 text-text-soft hover:bg-line-soft hover:text-text-strong"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[13px] font-medium text-text-strong">
            {HEADER_FORMAT.format(view)}
          </span>
          <button
            type="button"
            aria-label="下一月"
            onClick={() => setView((v) => addMonths(v, 1))}
            className="rounded p-1 text-text-soft hover:bg-line-soft hover:text-text-strong"
          >
            <ChevronRight className="size-4" />
          </button>
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
            const isSelected = !!selected && toIso(selected) === iso;
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                onClick={() => handleSelect(d)}
                className={cn(
                  "mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-[12.5px]",
                  inMonth ? "text-text-strong" : "text-text-mute/50",
                  isSelected && "bg-brand-500 text-white hover:bg-brand-600",
                  !isSelected && isToday && "ring-1 ring-brand-500/60",
                  !isSelected && inMonth && "hover:bg-line-soft",
                )}
              >
                {d.getUTCDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="text-[12px] text-text-mute hover:text-text-strong"
          >
            清除
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(toIso(new Date()));
              setOpen(false);
            }}
          >
            今天
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };

DatePicker.displayName = "DatePicker";
