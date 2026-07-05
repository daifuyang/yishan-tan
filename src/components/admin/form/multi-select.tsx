import { Check, ChevronDown, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /** 已选项超过该数时折叠为「+N」。默认 3。 */
  maxVisibleChips?: number;
  /** 触发器 button 的 aria-label；不传则按 placeholder 推断。 */
  ariaLabel?: string;
};

const VISIBLE_CHIP_LIMIT_DEFAULT = 3;

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "请选择",
  emptyText = "暂无可选项",
  disabled,
  className,
  maxVisibleChips = VISIBLE_CHIP_LIMIT_DEFAULT,
  ariaLabel,
}: MultiSelectProps) {
  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggle = React.useCallback(
    (optionValue: string, checked: boolean) => {
      if (checked) {
        if (selectedSet.has(optionValue)) return;
        onChange([...value, optionValue]);
      } else {
        if (!selectedSet.has(optionValue)) return;
        onChange(value.filter((v) => v !== optionValue));
      }
    },
    [onChange, selectedSet, value],
  );

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (value.length === 0) return;
    onChange([]);
  };

  const visible = value.slice(0, maxVisibleChips);
  const overflow = Math.max(0, value.length - visible.length);
  const labelByValue = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of options) m.set(o.value, o.label);
    return m;
  }, [options]);

  const triggerLabel = ariaLabel ?? placeholder;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          aria-haspopup="menu"
          disabled={disabled}
          className={cn(
            "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-[4px] border border-line bg-white px-3 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
            "placeholder:text-text-mute focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px]",
            "data-[placeholder]:text-text-mute",
            "disabled:cursor-not-allowed disabled:opacity-40",
            value.length === 0 && "text-text-mute",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {value.length === 0 ? (
              <span className="truncate text-text-mute">{placeholder}</span>
            ) : (
              <>
                {visible.map((v) => (
                  <Badge
                    key={v}
                    variant="soft"
                    className="max-w-[160px] truncate px-2 py-0.5 font-normal"
                    title={labelByValue.get(v) ?? v}
                  >
                    {labelByValue.get(v) ?? v}
                  </Badge>
                ))}
                {overflow > 0 ? (
                  <Badge variant="outline" className="px-2 py-0.5 font-normal text-text-soft">
                    +{overflow}
                  </Badge>
                ) : null}
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value.length > 0 ? (
              <button
                type="button"
                aria-label="清空选择"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                className="rounded-sm p-0.5 text-text-mute transition-colors hover:bg-line-soft hover:text-text-strong"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {options.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-text-mute">{emptyText}</span>
          </DropdownMenuItem>
        ) : (
          options.map((opt) => {
            const checked = selectedSet.has(opt.value);
            return (
              <DropdownMenuItem
                key={opt.value}
                disabled={opt.disabled}
                onSelect={(e) => {
                  e.preventDefault();
                  toggle(opt.value, !checked);
                }}
                className={cn("items-start gap-2 py-2", checked && "bg-brand-50/60")}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
                    checked
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-line bg-white text-transparent",
                  )}
                  aria-hidden
                >
                  <Check className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-text-strong">{opt.label}</span>
                  {opt.description ? (
                    <span className="block truncate text-[11px] text-text-mute">
                      {opt.description}
                    </span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            );
          })
        )}
        {value.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onChange([]);
              }}
              className="justify-center text-text-mute"
            >
              <span className="text-[12px]">清空全部（{value.length}）</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
