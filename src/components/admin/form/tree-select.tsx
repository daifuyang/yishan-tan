"use client";

import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TreeNode = {
  value: string;
  label: string;
  children?: TreeNode[];
  disabled?: boolean;
};

export type TreeSelectProps = {
  /** single: string | null; multi: string[] */
  value: string | string[] | null;
  onChange: (next: string | string[] | null) => void;
  options: TreeNode[];
  /** 单选 / 多选;默认 "single" */
  mode?: "single" | "multi";
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** 是否展示清除按钮;默认 true */
  clearable?: boolean;
  /** 父子联动(选中父→所有子;子全选→父自动勾);仅 multi;默认 true */
  cascade?: boolean;
  /** 默认展开的节点 value 列表;不传则默认全部展开父节点;传 [] 全部折叠 */
  defaultExpanded?: string[];
  /** 已选 chip 折叠阈值,仅 multi 模式;默认 3(宪章 §8.4 +N 折叠) */
  maxVisibleChips?: number;
  /** popover 最大高度;默认 280px */
  maxHeight?: number;
  /** 是否展示搜索框;默认 true。 */
  searchable?: boolean;
  /** 搜索框 placeholder;默认 "搜索"。 */
  searchPlaceholder?: string;
  /** 搜索无结果时文案;默认 "未找到匹配项"。 */
  noMatchText?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

type FlatRow = {
  value: string;
  label: string;
  depth: number;
  hasChildren: boolean;
  disabled?: boolean;
};

function flatten(nodes: TreeNode[], depth: number, acc: FlatRow[]): FlatRow[] {
  for (const n of nodes) {
    acc.push({
      value: n.value,
      label: n.label,
      depth,
      hasChildren: !!n.children?.length,
      disabled: n.disabled,
    });
    if (n.children?.length) flatten(n.children, depth + 1, acc);
  }
  return acc;
}

function collectDescendants(value: string, nodes: TreeNode[]): string[] {
  const out: string[] = [];
  const findIn = (ns: TreeNode[]): TreeNode | null => {
    for (const n of ns) {
      if (n.value === value) return n;
      if (n.children?.length) {
        const r = findIn(n.children);
        if (r) return r;
      }
    }
    return null;
  };
  const walkDown = (ns: TreeNode[]) => {
    for (const n of ns) {
      out.push(n.value);
      if (n.children?.length) walkDown(n.children);
    }
  };
  const target = findIn(nodes);
  if (target?.children) walkDown(target.children);
  return out;
}

function collectAncestors(value: string, rows: FlatRow[]): string[] {
  const out: string[] = [];
  const target = rows.find((r) => r.value === value);
  if (!target) return out;
  let parentDepth = target.depth - 1;
  for (let j = rows.indexOf(target) - 1; j >= 0 && parentDepth >= 0; j--) {
    const row = rows[j];
    if (!row) continue;
    if (row.depth === parentDepth) {
      out.push(row.value);
      parentDepth -= 1;
    }
  }
  return out;
}

/**
 * 渲染可见行:每个父节点后面紧跟其 children(若 expanded);跳过 collapsed 父的子树。
 */
function buildVisibleRows(rows: FlatRow[], expanded: Set<string>): FlatRow[] {
  const out: FlatRow[] = [];
  let skipDepth = -1;
  for (const row of rows) {
    if (skipDepth >= 0) {
      if (row.depth > skipDepth) continue;
      skipDepth = -1;
    }
    out.push(row);
    if (row.hasChildren && !expanded.has(row.value)) {
      skipDepth = row.depth;
    }
  }
  return out;
}

function TreeSelect({
  value,
  onChange,
  options,
  mode = "single",
  placeholder = "请选择",
  emptyText = "暂无可选项",
  disabled,
  clearable = true,
  cascade = true,
  defaultExpanded,
  maxVisibleChips = 3,
  maxHeight = 280,
  searchable = true,
  searchPlaceholder = "搜索",
  noMatchText = "未找到匹配项",
  id,
  className,
  "aria-label": ariaLabel,
}: TreeSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    if (defaultExpanded !== undefined) return new Set(defaultExpanded);
    return new Set(
      flatten(options, 0, [])
        .filter((r) => r.hasChildren)
        .map((r) => r.value),
    );
  });
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  const rows = React.useMemo(() => flatten(options, 0, []), [options]);
  const byValue = React.useMemo(() => new Map(rows.map((r) => [r.value, r])), [rows]);
  const labelByValue = React.useMemo(() => new Map(rows.map((r) => [r.value, r.label])), [rows]);

  const selectedSet = React.useMemo(() => {
    if (mode === "multi") return new Set(Array.isArray(value) ? value : []);
    return new Set(value != null ? [value] : []);
  }, [value, mode]);

  React.useEffect(() => {
    if (open) {
      setSearch("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
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

  /**
   * 搜索时:所有父节点视为展开 + 过滤行(行 label 匹配 OR 是匹配项的祖先)。
   * 非搜索时:用 buildVisibleRows 按 expanded 过滤。
   */
  const visibleRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buildVisibleRows(rows, expanded);
    const matchedValues = new Set<string>();
    for (const r of rows) {
      if (r.label.toLowerCase().includes(q)) matchedValues.add(r.value);
    }
    const keep = new Set<string>(matchedValues);
    for (const v of matchedValues) {
      for (const a of collectAncestors(v, rows)) keep.add(a);
    }
    const filtered = rows.filter((r) => keep.has(r.value));
    return buildVisibleRows(
      filtered,
      new Set(filtered.filter((r) => r.hasChildren).map((r) => r.value)),
    );
  }, [rows, expanded, search]);

  function toggleExpanded(rowValue: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowValue)) next.delete(rowValue);
      else next.add(rowValue);
      return next;
    });
  }

  function nodeState(row: FlatRow): "checked" | "indeterminate" | "unchecked" {
    if (selectedSet.has(row.value)) return "checked";
    const desc = collectDescendants(row.value, options);
    return desc.some((d) => selectedSet.has(d)) ? "indeterminate" : "unchecked";
  }

  function handleToggle(rowValue: string) {
    if (mode === "single") {
      onChange(rowValue === value ? (clearable ? null : rowValue) : rowValue);
      setOpen(false);
      return;
    }
    const current = new Set(Array.isArray(value) ? value : []);
    const row = byValue.get(rowValue);
    if (!row) return;
    const willSelect = !current.has(rowValue);

    if (cascade) {
      const targets = [rowValue, ...collectDescendants(rowValue, options)];
      const next = new Set(current);
      for (const t of targets) {
        const targetRow = byValue.get(t);
        if (targetRow?.disabled) continue;
        if (willSelect) next.add(t);
        else next.delete(t);
      }
      const ancestors = collectAncestors(rowValue, rows);
      for (const a of ancestors) {
        const aRow = byValue.get(a);
        if (aRow?.disabled) continue;
        const aDesc = collectDescendants(a, options);
        const anySelected = aDesc.some((d) => next.has(d));
        if (anySelected) next.add(a);
        else next.delete(a);
      }
      onChange(Array.from(next));
    } else {
      if (current.has(rowValue)) current.delete(rowValue);
      else current.add(rowValue);
      onChange(Array.from(current));
    }
  }

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "single") onChange(null);
    else onChange([]);
  };

  const visibleValues =
    mode === "multi" && Array.isArray(value) ? value.slice(0, maxVisibleChips) : [];
  const overflow =
    mode === "multi" && Array.isArray(value) ? Math.max(0, value.length - visibleValues.length) : 0;
  const singleLabel =
    mode === "single" && typeof value === "string" ? (labelByValue.get(value) ?? null) : null;
  const useTriggerSearchInput = searchable && mode === "single";

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
      {useTriggerSearchInput ? (
        <PopoverAnchor asChild>
          <div
            ref={anchorRef}
            id={id}
            aria-label={ariaLabel ?? placeholder}
            aria-haspopup="tree"
            className={cn(
              "relative flex h-8 w-full min-w-0 items-center rounded-[4px] border border-line bg-white text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
              "focus-within:border-brand-500 focus-within:ring-[1px] focus-within:ring-brand-500",
              disabled && "cursor-not-allowed opacity-40",
              className,
            )}
          >
            <input
              ref={searchRef}
              value={open ? search : (singleLabel ?? "")}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={activateInput}
              onClick={activateInput}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder={open ? (singleLabel ?? placeholder) : placeholder}
              disabled={disabled}
              className="h-full w-full min-w-0 bg-transparent px-3 pr-14 text-[13px] text-text-strong outline-none placeholder:text-text-mute"
            />
            <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-text-mute">
              {clearable && selectedSet.size > 0 && !disabled && !open ? (
                <button
                  type="button"
                  aria-label="清空选择"
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleClear(e);
                  }}
                  className="rounded-sm p-0.5 transition-colors hover:bg-line-soft hover:text-text-strong"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
              {open ? (
                <Search className="size-3.5" aria-hidden />
              ) : (
                <ChevronDown className="size-4 opacity-60" aria-hidden />
              )}
            </span>
          </div>
        </PopoverAnchor>
      ) : (
        <PopoverTrigger asChild>
          <button
            type="button"
            ref={anchorRef as React.Ref<HTMLButtonElement>}
            id={id}
            aria-label={ariaLabel ?? placeholder}
            aria-haspopup="tree"
            disabled={disabled}
            className={cn(
              "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-[4px] border border-line bg-white px-3 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none",
              "focus-visible:border-brand-500 focus-visible:ring-[1px] focus-visible:ring-brand-500",
              "disabled:cursor-not-allowed disabled:opacity-40",
              selectedSet.size === 0 && "text-text-mute",
              className,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
              {mode === "single" ? (
                <span className="truncate">{singleLabel ?? placeholder}</span>
              ) : selectedSet.size === 0 ? (
                <span className="truncate text-text-mute">{placeholder}</span>
              ) : (
                <>
                  {visibleValues.map((v) => (
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
              {clearable && selectedSet.size > 0 && !disabled ? (
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
        </PopoverTrigger>
      )}
      <PopoverContent
        align="start"
        className="flex flex-col overflow-hidden p-0"
        onInteractOutside={(e) => {
          if (useTriggerSearchInput && anchorRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        style={{
          width: "var(--radix-popover-trigger-width)",
          maxHeight: `min(${maxHeight}px, var(--radix-popover-content-available-height))`,
        }}
      >
        {searchable && !useTriggerSearchInput ? (
          <div className="shrink-0 px-2 py-2">
            <div className="relative rounded-[6px] border border-line bg-white transition-colors focus-within:border-brand-500 focus-within:ring-[1px] focus-within:ring-brand-500">
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder={searchPlaceholder}
                className="h-8 w-full bg-transparent px-3 pr-14 text-[13px] text-text-strong outline-none placeholder:text-text-mute"
              />
              <Search className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-text-mute" />
            </div>
          </div>
        ) : null}
        <div
          ref={scrollContainerRef}
          className="-mx-px min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onWheelCapture={handleViewportWheel}
        >
          {visibleRows.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px] text-text-mute">
              {search.trim() ? noMatchText : emptyText}
            </div>
          ) : (
            <ul role="tree" className="py-1">
              {visibleRows.map((row) => {
                const state = mode === "multi" ? nodeState(row) : null;
                const isExpanded = expanded.has(row.value);
                return (
                  <li
                    key={row.value}
                    role="treeitem"
                    aria-selected={mode === "single" ? row.value === value : state === "checked"}
                    aria-checked={mode === "multi" ? state === "checked" : undefined}
                    aria-disabled={row.disabled}
                    aria-expanded={row.hasChildren ? isExpanded : undefined}
                    style={{ paddingLeft: 4 + row.depth * 12 }}
                  >
                    <div
                      className={cn(
                        "group flex w-full items-center gap-1.5 rounded-[3px] py-1.5 pr-2 text-[13px]",
                        "hover:bg-line-soft",
                        mode === "multi" && state === "checked" && "bg-brand-50/60",
                      )}
                    >
                      {mode === "multi" ? (
                        <button
                          type="button"
                          disabled={row.disabled}
                          aria-label={state === "checked" ? "取消选择" : "选择"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(row.value);
                          }}
                          className={cn(
                            "inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
                            state === "checked"
                              ? "border-brand-600 bg-brand-600 text-white"
                              : state === "indeterminate"
                                ? "border-brand-600 bg-brand-100 text-brand-600"
                                : "border-line bg-white text-transparent",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                          )}
                        >
                          {state === "checked" ? (
                            <Check className="size-3" />
                          ) : state === "indeterminate" ? (
                            <span className="block h-[6px] w-[6px] rounded-[1px] bg-brand-600" />
                          ) : null}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={row.disabled}
                        onClick={() => {
                          if (row.hasChildren) {
                            toggleExpanded(row.value);
                          } else {
                            handleToggle(row.value);
                          }
                        }}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-1 text-left",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                        )}
                      >
                        <span
                          className="inline-flex w-3.5 shrink-0 items-center justify-center text-text-mute"
                          aria-hidden
                        >
                          {row.hasChildren ? (
                            isExpanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-text-strong">
                          {row.label}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { TreeSelect };
