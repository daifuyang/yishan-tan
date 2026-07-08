"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { SearchSelectOption } from "./search-select";

export type SearchMultiSelectProps = {
  value: string[];
  onChange: (next: string[]) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noMatchText?: string;
  maxHeight?: number;
  maxVisibleChips?: number;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

function SearchMultiSelect({
  value,
  onChange,
  options,
  placeholder = "请选择",
  emptyText = "暂无可选项",
  disabled,
  clearable = true,
  searchable = true,
  searchPlaceholder = "搜索",
  noMatchText = "未找到匹配项",
  maxHeight = 280,
  maxVisibleChips = 3,
  id,
  className,
  "aria-label": ariaLabel,
}: SearchMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  const selectedSet = React.useMemo(() => new Set(value), [value]);
  const labelByValue = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) map.set(option.value, option.label);
    return map;
  }, [options]);

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, search]);

  const visibleValues = value.slice(0, maxVisibleChips);
  const overflow = Math.max(0, value.length - visibleValues.length);

  React.useEffect(() => {
    if (!open) return;
    setSearch("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  const activateInput = React.useCallback(() => {
    if (disabled) return;
    setOpen(true);
    requestAnimationFrame(() => {
      searchRef.current?.focus();
      if (searchRef.current?.value) {
        searchRef.current.select();
      }
    });
  }, [disabled]);

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  };

  const handleRemoveValue = (targetValue: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((item) => item !== targetValue));
  };

  const handleViewportWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight) return;

    const delta =
      e.deltaMode === 1
        ? e.deltaY * 16
        : e.deltaMode === 2
          ? e.deltaY * container.clientHeight
          : e.deltaY;
    if (delta === 0) return;

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const nextScrollTop = Math.min(maxScrollTop, Math.max(0, container.scrollTop + delta));
    if (nextScrollTop === container.scrollTop) return;

    e.preventDefault();
    e.stopPropagation();
    container.scrollTop = nextScrollTop;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          id={id}
          aria-label={ariaLabel ?? placeholder}
          aria-haspopup="listbox"
          onClick={(e) => {
            if (e.target instanceof Element && e.target.closest("button")) return;
            activateInput();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              activateInput();
            }
          }}
          className={cn(
            "relative flex min-h-8 w-full min-w-0 items-center rounded-[4px] border border-line bg-white text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
            "focus-within:border-brand-500 focus-within:ring-[1px] focus-within:ring-brand-500",
            disabled && "cursor-not-allowed opacity-40",
            className,
          )}
        >
          <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1 px-3 py-1 pr-14">
            {value.length > 0 ? (
              <>
                {visibleValues.map((itemValue) => (
                  <Badge
                    key={itemValue}
                    variant="outline"
                    className="flex max-w-[160px] min-w-0 items-center gap-1 truncate rounded-[4px] border-line bg-muted px-2 py-0.5 font-normal text-text-strong"
                    title={labelByValue.get(itemValue) ?? itemValue}
                  >
                    <span className="truncate">{labelByValue.get(itemValue) ?? itemValue}</span>
                    <button
                      type="button"
                      aria-label={`移除 ${labelByValue.get(itemValue) ?? itemValue}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleRemoveValue(itemValue)}
                      className="rounded-sm text-text-mute transition-colors hover:text-text-strong"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </Badge>
                ))}
                {overflow > 0 ? (
                  <Badge
                    variant="outline"
                    className="rounded-[4px] border-line bg-muted px-2 py-0.5 font-normal text-text-soft"
                  >
                    +{overflow}
                  </Badge>
                ) : null}
              </>
            ) : null}
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={activateInput}
              onClick={activateInput}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={value.length > 0 ? "" : searchPlaceholder || placeholder}
              disabled={disabled}
              className={cn(
                "h-6 min-w-[48px] flex-1 bg-transparent px-0 text-[13px] text-text-strong outline-none placeholder:text-text-mute",
                !open && value.length > 0 && "w-0 min-w-0 px-0 text-transparent caret-transparent",
              )}
            />
          </div>
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-text-mute">
            {clearable && value.length > 0 && !disabled && !open ? (
              <button
                type="button"
                aria-label="清空选择"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleClear(e);
                }}
                className="rounded-sm p-0.5 transition-colors hover:bg-line-soft hover:text-text-strong"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {open && searchable ? (
              <Search className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-4 opacity-60" aria-hidden />
            )}
          </span>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="flex flex-col overflow-hidden p-0"
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        style={{
          width: "var(--radix-popover-trigger-width)",
          maxHeight: `min(${maxHeight}px, var(--radix-popover-content-available-height))`,
        }}
      >
        <div
          ref={scrollContainerRef}
          className="-mx-px min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onWheelCapture={handleViewportWheel}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-text-mute">
              {search.trim() ? noMatchText : emptyText}
            </div>
          ) : (
            // biome-ignore lint/a11y/useSemanticElements: custom multi-select pattern
            <div
              role="listbox"
              aria-label={ariaLabel ?? placeholder}
              aria-multiselectable="true"
              tabIndex={0}
            >
              {filteredOptions.map((option) => {
                const selected = selectedSet.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (selected) onChange(value.filter((item) => item !== option.value));
                      else onChange([...value, option.value]);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[13px] hover:bg-line-soft",
                      selected && "bg-brand-50/60",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-text-strong">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-[11px] text-text-mute">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 inline-flex size-3.5 shrink-0 items-center justify-center text-brand-600">
                      {selected ? <Check className="size-3.5" aria-hidden /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { SearchMultiSelect };
