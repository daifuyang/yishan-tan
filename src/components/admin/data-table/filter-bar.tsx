import "./filter-bar.css";
import { ChevronDown, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function flattenChildren(children: React.ReactNode): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      const frag = child as React.ReactElement<{ children?: React.ReactNode }>;
      result.push(...flattenChildren(frag.props.children));
    } else if (child !== null && child !== undefined && child !== false) {
      result.push(child);
    }
  });
  return result;
}

type FilterBarProps = {
  children?: React.ReactNode;
  values?: Record<string, unknown>;
  defaultValues?: Record<string, unknown>;
  onChange?: (values: Record<string, unknown>) => void;
  onReset?: () => void;
  onSubmit?: (values: Record<string, unknown>) => void;
  submitLabel?: string;
  resetLabel?: string;
  expandLabel?: string;
  collapseLabel?: string;
  actions?: React.ReactNode;
  /** 筛选区列数，默认 3（后台统一口径，见 docs/admin-list-standard.md）。 */
  columns?: number;
  /** 自适应列宽：按容器宽度自动决定每行放几个字段。 */
  adaptive?: boolean;
  /** 折叠时展示的字段数量，默认「列数 - 1」（最后一格留给操作区）。 */
  collapsedFieldCount?: number;
  /** 响应式：按容器宽度切换 1 / 2 / N 列，默认开启。 */
  responsive?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  className?: string;
};

export function FilterBar({
  children,
  values: controlledValues,
  defaultValues,
  onChange,
  onReset,
  onSubmit,
  submitLabel = "查询",
  resetLabel = "重置",
  expandLabel = "展开",
  collapseLabel = "收起",
  actions,
  columns = 3,
  adaptive = false,
  collapsedFieldCount,
  responsive = true,
  collapsible = true,
  defaultCollapsed = true,
  loading,
  className,
}: FilterBarProps) {
  const isControlled = controlledValues !== undefined;
  const [internal, setInternal] = React.useState<Record<string, unknown>>(defaultValues ?? {});
  const values = isControlled ? (controlledValues as Record<string, unknown>) : internal;

  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const setValue = React.useCallback(
    (next: Record<string, unknown>) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(values);
  };

  const handleReset = () => {
    setValue(defaultValues ?? {});
    onReset?.();
  };

  // 参考 antd ProTable QueryFilter：末尾一格留给操作区，折叠时只展示第一行字段
  const items = flattenChildren(children);
  const cols = Math.max(1, columns);
  const visibleCount = collapsedFieldCount ?? Math.max(1, cols - 1);
  const canCollapse = collapsible && items.length > visibleCount;
  const visibleItems = canCollapse && collapsed ? items.slice(0, visibleCount) : items;

  // 自适应模式自己用 auto-fit 排版，与容器查询的定列模式互斥。
  const useContainerQuery = responsive && !adaptive;

  return (
    <form
      data-slot="filter-bar"
      data-responsive={useContainerQuery}
      onSubmit={handleSubmit}
      className={className}
    >
      <div
        data-slot="filter-grid"
        className={cn(
          "grid gap-x-6 gap-y-4",
          adaptive &&
            "grid-cols-[repeat(auto-fit,minmax(min(100%,max(220px,calc((100%_-_48px)/var(--filter-columns)))),1fr))]",
        )}
        style={
          adaptive
            ? ({ "--filter-columns": cols } as React.CSSProperties)
            : useContainerQuery
              ? ({
                  "--filter-columns": cols,
                  "--filter-tablet-columns": Math.min(2, cols),
                } as React.CSSProperties)
              : { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
        }
      >
        {visibleItems.map((child, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: filter items are static in order
          <React.Fragment key={index}>{child}</React.Fragment>
        ))}
        <div
          data-slot="filter-actions"
          className={cn(
            "flex flex-wrap items-center justify-end gap-2",
            adaptive && "col-span-full",
          )}
          style={useContainerQuery || adaptive ? undefined : { gridColumnStart: cols }}
        >
          {actions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={loading}
          >
            {resetLabel}
          </Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {submitLabel}
          </Button>
          {canCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed((prev) => !prev)}
              className="gap-1 text-brand-600 hover:bg-transparent hover:text-brand-700"
              aria-expanded={!collapsed}
            >
              {collapsed ? expandLabel : collapseLabel}
              <ChevronDown
                className={cn("size-3.5 transition-transform", collapsed ? "" : "rotate-180")}
                aria-hidden
              />
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
