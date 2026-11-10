"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import * as React from "react";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "~/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type SearchSelectProps = {
  value: string | null;
  onChange: (next: string | null) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noMatchText?: string;
  maxHeight?: number;
  id?: string;
  "aria-label"?: string;
  className?: string;
  /** 是否按搜索词在本地过滤 options;默认 true。远程搜索时传 false */
  filterOptions?: boolean;
  /** 选中项不在 options 里时的兜底展示(远程搜索场景) */
  selectedOption?: SearchSelectOption | null;
  /** 搜索词变化回调 */
  onSearchChange?: (search: string) => void;
  /** 展开状态变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 整体加载中 */
  loading?: boolean;
  /** 加载更多中 */
  loadingMore?: boolean;
  /** 加载失败 */
  error?: boolean;
  /** 失败后的重试回调 */
  onRetry?: () => void;
  /** 是否还有更多可加载 */
  hasMore?: boolean;
  /** 加载更多回调 */
  onLoadMore?: () => void;
};

function SearchSelect({
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
  id,
  className,
  "aria-label": ariaLabel,
  filterOptions = true,
  selectedOption: selectedFallback,
  onSearchChange,
  onOpenChange,
  loading = false,
  loadingMore = false,
  error = false,
  onRetry,
  hasMore = false,
  onLoadMore,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  /** 键盘导航的当前高亮项下标;-1 表示没有高亮 */
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listId = React.useId();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  /** 主动把焦点还给输入框时,避免 onFocus 再次把浮层打开 */
  const suppressFocusOpenRef = React.useRef(false);
  /** 关闭浮层时是否需要把焦点还给输入框(组件内部关闭才需要) */
  const restoreFocusRef = React.useRef(false);

  const selectedOption = React.useMemo(
    () =>
      options.find((option) => option.value === value) ??
      (selectedFallback?.value === value ? selectedFallback : null),
    [options, value, selectedFallback],
  );

  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!filterOptions || !q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, search, filterOptions]);

  // 展开时清空上一次的搜索词(与旧行为一致),并把空搜索词通知给外部
  const onSearchChangeRef = React.useRef(onSearchChange);
  React.useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  });

  /**
   * 把焦点交给输入框。
   *
   * Radix Popover 打开时默认会把焦点移到浮层容器,导致「点开 → 立刻打字」丢首字符。
   * 这里通过 onOpenAutoFocus 阻止默认行为 + 手动聚焦输入框来消除竞态,
   * 因此不再需要 requestAnimationFrame 抢焦点。
   */
  const focusSearchInput = React.useCallback(() => {
    const el = searchRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    suppressFocusOpenRef.current = true;
    el.focus();
    // 极端情况下 focus 事件没有同步触发,下一帧复位,避免吞掉后续的正常打开
    requestAnimationFrame(() => {
      suppressFocusOpenRef.current = false;
    });
  }, []);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    // 展开/收起都重置搜索词(与旧行为一致),并同步给外部
    setSearch("");
    setActiveIndex(-1);
    onSearchChangeRef.current?.("");
    onOpenChange?.(next);
  };

  const changeOpen = (next: boolean) => {
    if (disabled || next === open) return;
    // 组件内部关闭时把焦点还给输入框;外部点击关闭(Radix 的 onOpenChange)不抢焦点
    if (!next) restoreFocusRef.current = true;
    setOpenState(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (next === open) return;
    setOpenState(next);
  };

  const choose = (option: SearchSelectOption) => {
    onChange(option.value === value && clearable ? null : option.value);
    changeOpen(false);
  };

  const activateInput = () => {
    if (disabled) return;
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false;
      return;
    }
    changeOpen(true);
  };

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
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

    const nextScrollTop = Math.min(
      container.scrollHeight - container.clientHeight,
      Math.max(0, container.scrollTop + delta),
    );
    if (nextScrollTop === container.scrollTop) return;

    e.preventDefault();
    e.stopPropagation();
    container.scrollTop = nextScrollTop;
  }, []);

  /** 在可选项之间移动高亮;direction 为 -1/1,wrap 为是否循环 */
  const moveActive = (direction: 1 | -1, wrap: boolean) => {
    if (loading || filteredOptions.length === 0) return;
    let next = activeIndex;
    for (let i = 0; i < filteredOptions.length; i++) {
      next = next + direction;
      if (next < 0) {
        if (!wrap) return;
        next = filteredOptions.length - 1;
      } else if (next >= filteredOptions.length) {
        if (!wrap) return;
        next = 0;
      }
      if (!filteredOptions[next]?.disabled) break;
    }
    setActiveIndex(next);
    document.getElementById(`${listId}-${next}`)?.scrollIntoView?.({ block: "nearest" });
  };

  /** 跳到第一个 / 最后一个可选项 */
  const jumpToEdge = (edge: "first" | "last") => {
    if (loading || filteredOptions.length === 0) return;
    const order =
      edge === "first"
        ? filteredOptions.map((_, index) => index)
        : filteredOptions.map((_, index) => filteredOptions.length - 1 - index);
    const target = order.find((index) => !filteredOptions[index]?.disabled);
    if (target === undefined) return;
    setActiveIndex(target);
    document.getElementById(`${listId}-${target}`)?.scrollIntoView?.({ block: "nearest" });
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div
          ref={anchorRef}
          className={cn(
            "relative flex h-8 w-full min-w-0 items-center rounded-[4px] border border-line bg-white text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
            "focus-within:border-brand-500 focus-within:ring-[1px] focus-within:ring-brand-500",
            disabled && "cursor-not-allowed opacity-40",
            className,
          )}
        >
          <input
            id={id}
            ref={searchRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete={searchable ? "list" : "none"}
            aria-activedescendant={
              open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            aria-label={ariaLabel ?? placeholder}
            aria-haspopup="listbox"
            value={open ? search : (selectedOption?.label ?? "")}
            readOnly={!searchable}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(-1);
              scrollContainerRef.current?.scrollTo?.({ top: 0 });
              onSearchChange?.(e.target.value);
            }}
            onFocus={activateInput}
            onClick={activateInput}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Escape") {
                e.preventDefault();
                changeOpen(false);
                return;
              }
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) {
                  changeOpen(true);
                  return;
                }
                moveActive(e.key === "ArrowDown" ? 1 : -1, true);
                return;
              }
              if (e.key === "Home" || e.key === "End") {
                if (!open) return;
                e.preventDefault();
                jumpToEdge(e.key === "Home" ? "first" : "last");
                return;
              }
              if (e.key === "Enter" && open) {
                e.preventDefault();
                const option = filteredOptions[activeIndex];
                if (!loading && option && !option.disabled) choose(option);
              }
            }}
            placeholder={open ? (selectedOption?.label ?? searchPlaceholder) : placeholder}
            disabled={disabled}
            className="h-full w-full min-w-0 bg-transparent px-3 pr-14 text-[13px] text-text-strong outline-none placeholder:text-text-mute"
          />
          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-text-mute">
            {clearable && value && !disabled && !open ? (
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
        // 阻止 Radix 默认的「把焦点移到浮层」,焦点始终留在输入框,消除首字符丢失的竞态
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          focusSearchInput();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          if (restoreFocusRef.current) {
            restoreFocusRef.current = false;
            focusSearchInput();
          }
        }}
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
          {loading ? (
            <output className="block px-3 py-4 text-center text-[12px] text-text-mute">
              正在加载…
            </output>
          ) : filteredOptions.length === 0 && !error ? (
            <div className="px-3 py-4 text-center text-[12px] text-text-mute">
              {search.trim() ? noMatchText : emptyText}
            </div>
          ) : (
            // biome-ignore lint/a11y/useSemanticElements: custom select pattern
            <div id={listId} role="listbox" aria-label={ariaLabel ?? placeholder} tabIndex={-1}>
              {filteredOptions.map((option, index) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    id={`${listId}-${index}`}
                    // biome-ignore lint/a11y/useSemanticElements: listbox option pattern
                    role="option"
                    aria-selected={selected}
                    type="button"
                    tabIndex={-1}
                    disabled={option.disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    className={cn(
                      "flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[13px] hover:bg-line-soft",
                      selected && "bg-brand-50/60",
                      activeIndex === index && "bg-line-soft",
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
          {error && !loading ? (
            <div className="px-3 py-3 text-center text-[12px] text-text-mute">
              选项加载失败，请重试
              <button type="button" className="ml-2 text-brand-600" onClick={onRetry}>
                重试
              </button>
            </div>
          ) : null}
          {hasMore && !loading && !error ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={onLoadMore}
              className="w-full border-t border-line px-3 py-2 text-[12px] text-brand-600 hover:bg-line-soft disabled:opacity-50"
            >
              {loadingMore ? "正在加载…" : "加载更多"}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { SearchSelect };
