"use client";

import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "~/lib/utils";

import {
  DISPLAY_FORMAT,
  HEADER_FORMAT,
  WEEKDAY_LABELS,
  addMonths,
  fromIso,
  getMonthGrid,
  toIso,
  todayIso,
} from "./date-picker-utils";

export type DatePickerProps = {
  /** 选择模式;默认 "date"(保持与既有表单一致) */
  mode?: "date" | "month" | "datetime";
  /**
   * "YYYY-MM-DD"(date)/"YYYY-MM"(month)/"YYYY-MM-DDTHH:mm"(datetime)字符串。
   * 不传则为非受控模式,组件内部维护值。
   */
  value?: string | null;
  onChange?: (next: string | null) => void;
  /** 默认 "请选择日期" (宪章 §3.3) */
  placeholder?: string;
  disabled?: boolean;
  /** 是否展示清除按钮;默认 true */
  clearable?: boolean;
  /** 配 `<Label htmlFor>`;不传则不挂 */
  id?: string;
  "aria-label"?: string;
  /** 关联辅助说明元素 id */
  "aria-describedby"?: string;
  name?: string;
  className?: string;
};

function CalendarPicker({
  value,
  onChange,
  mode = "date",
  placeholder = {
    month: "请选择月份",
    date: "请选择日期",
    datetime: "请选择日期和时间",
  }[mode],
  disabled,
  clearable = true,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: Omit<DatePickerProps, "mode" | "value" | "onChange" | "name"> & {
  mode: NonNullable<DatePickerProps["mode"]>;
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const selected = React.useMemo(
    () => (value ? fromIso(mode === "month" ? `${value}-01` : value.slice(0, 10)) : null),
    [value, mode],
  );
  const [open, setOpen] = React.useState(false);
  // datetime 模式下,输入草稿与最终值分离:选日期只更新草稿,点"确定"才提交
  const [draft, setDraft] = React.useState<string | null>(null);
  const [draftDate, draftTime = "00:00"] = draft?.split("T") ?? [];
  const [hours = "00", minutes = "00"] = draftTime.split(":");
  // 「今天」按本地日历日取(见 date-picker-utils.todayIso),避免跨时区差一天
  const today = todayIso();
  const todayDate = fromIso(today) ?? new Date();
  const [view, setView] = React.useState<Date>(
    () => selected ?? new Date(Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), 1)),
  );

  React.useEffect(() => {
    if (open && selected) {
      setView(new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)));
    }
  }, [open, selected]);

  const grid = React.useMemo(() => getMonthGrid(view), [view]);
  const viewMonth = view.getUTCMonth();

  const handleSelect = (d: Date) => {
    if (mode === "datetime") {
      setDraft(`${toIso(d)}T${hours}:${minutes}`);
      return;
    }
    onChange(mode === "month" ? toIso(d).slice(0, 7) : toIso(d));
    setOpen(false);
  };

  const showClear = clearable && Boolean(value) && !disabled;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next && mode === "datetime") setDraft(value);
        setOpen(next);
      }}
    >
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel ?? placeholder}
            aria-describedby={ariaDescribedBy}
            disabled={disabled}
            className={cn(
              "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-[4px] border border-line bg-white px-3 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
              "focus-visible:border-brand-500 focus-visible:ring-[1px] focus-visible:ring-brand-500",
              "disabled:cursor-not-allowed disabled:opacity-40",
              !value && "text-text-mute",
              showClear && "pr-8",
              className,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <Calendar className="size-3.5 shrink-0 opacity-60" aria-hidden />
              <span className="truncate">
                {selected
                  ? mode === "month"
                    ? toIso(selected).slice(0, 7)
                    : mode === "datetime"
                      ? `${toIso(selected)} ${value?.slice(11, 16)}`
                      : DISPLAY_FORMAT.format(selected)
                  : placeholder}
              </span>
            </span>
          </button>
        </PopoverTrigger>
        {showClear && (
          <button
            type="button"
            aria-label="清空"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-mute transition-colors hover:bg-line-soft hover:text-text-strong"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <PopoverContent
        align="start"
        className={cn(
          "max-w-[calc(100vw-1rem)] p-3",
          mode === "datetime" ? "w-[420px]" : "w-[280px]",
        )}
      >
        <div
          className={cn(
            mode === "datetime" &&
              "grid items-start gap-3 min-[440px]:grid-cols-[minmax(0,1fr)_128px]",
          )}
        >
          <div className="min-w-0">
            <div className="flex h-8 items-center justify-between">
              <button
                type="button"
                aria-label={mode === "month" ? "上一年" : "上一月"}
                onClick={() => setView((v) => addMonths(v, mode === "month" ? -12 : -1))}
                className="rounded p-1 text-text-soft hover:bg-line-soft hover:text-text-strong"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] font-medium text-text-strong">
                {mode === "month" ? `${view.getUTCFullYear()}年` : HEADER_FORMAT.format(view)}
              </span>
              <button
                type="button"
                aria-label={mode === "month" ? "下一年" : "下一月"}
                onClick={() => setView((v) => addMonths(v, mode === "month" ? 12 : 1))}
                className="rounded p-1 text-text-soft hover:bg-line-soft hover:text-text-strong"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            {mode === "month" ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, month) => {
                  const date = new Date(Date.UTC(view.getUTCFullYear(), month, 1));
                  const active = value === toIso(date).slice(0, 7);
                  return (
                    <button
                      key={toIso(date)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelect(date)}
                      className={cn(
                        "h-9 rounded text-[13px]",
                        active ? "bg-brand-500 text-white" : "text-text-strong hover:bg-line-soft",
                      )}
                    >
                      {month + 1}月
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-y-1 pb-1 text-center text-[11px] text-text-mute">
                  {WEEKDAY_LABELS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                  {grid.map((d) => {
                    const inMonth = d.getUTCMonth() === viewMonth;
                    const iso = toIso(d);
                    const isSelected =
                      mode === "datetime"
                        ? draftDate === iso
                        : !!selected && toIso(selected) === iso;
                    const isToday = iso === today;
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
              </>
            )}
          </div>
          {mode === "datetime" && (
            <div className="min-w-0 border-t border-line min-[440px]:border-l min-[440px]:border-t-0 min-[440px]:pl-3">
              <div className="flex h-8 items-center justify-center text-[13px] font-medium text-text-strong">
                时间
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TimeSelect
                  label="小时"
                  count={24}
                  value={hours}
                  disabled={!draftDate}
                  onChange={(next) => setDraft(`${draftDate}T${next}:${minutes}`)}
                />
                <TimeSelect
                  label="分钟"
                  count={60}
                  value={minutes}
                  disabled={!draftDate}
                  onChange={(next) => setDraft(`${draftDate}T${hours}:${next}`)}
                />
              </div>
            </div>
          )}
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
          <Button type="button" variant="ghost" size="sm" onClick={() => handleSelect(todayDate)}>
            {mode === "month" ? "本月" : "今天"}
          </Button>
          {mode === "datetime" && (
            <Button
              type="button"
              size="sm"
              disabled={!draft}
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              确定
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeSelect({
  label,
  count,
  value,
  disabled,
  onChange,
}: {
  label: string;
  count: number;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    function scrollWithWheel(event: WheelEvent) {
      if (!list || !event.deltaY || event.ctrlKey || !event.cancelable) return;
      // 弹层被 portal 到对话框之外,原生滚动锁不住,这里手动接管滚轮
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 28 : event.deltaMode === 2 ? list.clientHeight : 1;
      list.scrollTop += event.deltaY * scale;
    }

    list.addEventListener("wheel", scrollWithWheel, { passive: false });
    return () => list.removeEventListener("wheel", scrollWithWheel);
  }, []);

  return (
    <div className="min-w-0">
      <div className="pb-1 text-center text-[11px] text-text-mute">{label}</div>
      <fieldset aria-label={label} className="min-w-0">
        <div
          ref={scrollRef}
          className="grid max-h-24 min-w-0 content-start gap-0.5 overflow-y-auto overscroll-contain min-[440px]:max-h-[184px]"
        >
          {Array.from({ length: count }, (_, index) => {
            const option = String(index).padStart(2, "0");
            return (
              <button
                key={option}
                type="button"
                aria-pressed={value === option}
                disabled={disabled}
                onClick={() => onChange(option)}
                className={cn(
                  "h-7 rounded text-xs tabular-nums hover:bg-line-soft disabled:opacity-40",
                  value === option && "bg-brand-500 text-white hover:bg-brand-600",
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

function DatePicker({ mode = "date", value, onChange, name, ...props }: DatePickerProps) {
  const [internal, setInternal] = React.useState<string | null>(null);
  const selected = value === undefined ? internal : value;

  function change(next: string | null) {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  return (
    <>
      {name && <input type="hidden" name={name} value={selected ?? ""} disabled={props.disabled} />}
      <CalendarPicker {...props} mode={mode} value={selected} onChange={change} />
    </>
  );
}

export { DatePicker };

DatePicker.displayName = "DatePicker";
