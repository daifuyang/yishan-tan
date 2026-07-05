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
  columns?: number;
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
  const canCollapse = collapsible && items.length > cols - 1;
  const visibleItems = canCollapse && collapsed ? items.slice(0, cols - 1) : items;

  return (
    <form data-slot="filter-bar" onSubmit={handleSubmit} className={className}>
      <div
        data-slot="filter-grid"
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: "16px 24px" }}
      >
        {visibleItems.map((child, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: filter items are static in order
          <React.Fragment key={index}>{child}</React.Fragment>
        ))}
        <div
          data-slot="filter-actions"
          className="flex items-center justify-end gap-2"
          style={{ gridColumnStart: cols }}
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
