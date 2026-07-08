"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type MenuTreeNode = {
  value: string;
  label: string;
  children?: MenuTreeNode[];
  disabled?: boolean;
};

export type MenuTreeProps = {
  options: MenuTreeNode[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
  className?: string;
};

type FlatRow = {
  value: string;
  label: string;
  depth: number;
  hasChildren: boolean;
  disabled?: boolean;
};

function flatten(nodes: MenuTreeNode[], depth: number, acc: FlatRow[]): FlatRow[] {
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

function collectDescendants(value: string, nodes: MenuTreeNode[]): string[] {
  const out: string[] = [];
  const findIn = (ns: MenuTreeNode[]): MenuTreeNode | null => {
    for (const n of ns) {
      if (n.value === value) return n;
      if (n.children?.length) {
        const r = findIn(n.children);
        if (r) return r;
      }
    }
    return null;
  };
  const walkDown = (ns: MenuTreeNode[]) => {
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

function allNodeValues(nodes: MenuTreeNode[]): string[] {
  const out: string[] = [];
  const walk = (ns: MenuTreeNode[]) => {
    for (const n of ns) {
      out.push(n.value);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function MenuTree({
  options,
  value,
  onChange,
  disabled,
  emptyText = "暂无可分配的菜单",
  className,
}: MenuTreeProps) {
  const [cascadeChecked, setCascadeChecked] = React.useState(true);
  const [expandAllChecked, setExpandAllChecked] = React.useState(true);
  const [checkAllChecked, setCheckAllChecked] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    return new Set(
      flatten(options, 0, [])
        .filter((r) => r.hasChildren)
        .map((r) => r.value),
    );
  });

  const rows = React.useMemo(() => flatten(options, 0, []), [options]);
  const byValue = React.useMemo(() => new Map(rows.map((r) => [r.value, r])), [rows]);
  const allValues = React.useMemo(() => allNodeValues(options), [options]);

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  React.useEffect(() => {
    if (value.length > 0 && allValues.length > 0) {
      setCheckAllChecked(value.length === allValues.length);
    } else {
      setCheckAllChecked(false);
    }
  }, [value, allValues]);

  function toggleExpanded(rowValue: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rowValue)) next.delete(rowValue);
      else next.add(rowValue);
      return next;
    });
  }

  function handleToggle(rowValue: string) {
    const current = new Set(value);
    const row = byValue.get(rowValue);
    if (!row) return;
    const willSelect = !current.has(rowValue);

    if (cascadeChecked) {
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

  function handleCheckAllChange(next: boolean) {
    setCheckAllChecked(next);
    if (next) {
      const enabled = allValues.filter((v) => !byValue.get(v)?.disabled);
      onChange(enabled);
    } else {
      onChange([]);
    }
  }

  function handleExpandAllChange(next: boolean) {
    setExpandAllChecked(next);
    setExpanded(
      next ? new Set(allNodeValues(options).filter((v) => byValue.get(v)?.hasChildren)) : new Set(),
    );
  }

  function nodeState(row: FlatRow): "checked" | "indeterminate" | "unchecked" {
    if (selectedSet.has(row.value)) return "checked";
    const desc = collectDescendants(row.value, options);
    return desc.some((d) => selectedSet.has(d)) ? "indeterminate" : "unchecked";
  }

  if (options.length === 0) {
    return (
      <div
        className={cn(
          "rounded-[4px] border border-line bg-white px-3 py-4 text-center text-[12px] text-text-mute",
          className,
        )}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-text-strong">
        <label
          htmlFor="menu-tree-expand-all"
          className="inline-flex cursor-pointer items-center gap-2"
        >
          <Checkbox
            id="menu-tree-expand-all"
            checked={expandAllChecked}
            onCheckedChange={(v) => handleExpandAllChange(v === true)}
            disabled={disabled}
          />
          <span>展开/折叠</span>
        </label>
        <label
          htmlFor="menu-tree-check-all"
          className="inline-flex cursor-pointer items-center gap-2"
        >
          <Checkbox
            id="menu-tree-check-all"
            checked={checkAllChecked}
            onCheckedChange={(v) => handleCheckAllChange(v === true)}
            disabled={disabled}
          />
          <span>全选/全不选</span>
        </label>
        <label
          htmlFor="menu-tree-cascade"
          className="inline-flex cursor-pointer items-center gap-2"
        >
          <Checkbox
            id="menu-tree-cascade"
            checked={cascadeChecked}
            onCheckedChange={(v) => setCascadeChecked(v === true)}
            disabled={disabled}
          />
          <span>父子联动</span>
        </label>
      </div>
      <div className="max-h-[320px] overflow-y-auto rounded-[4px] border border-line bg-white px-1 py-1">
        {rows.map((row) => {
          const state = nodeState(row);
          const isExpanded = expanded.has(row.value);
          return (
            <div
              key={row.value}
              className={cn(
                "flex items-center gap-1.5 rounded-[3px] py-1.5 pr-2 text-[13px] hover:bg-line-soft",
                state === "checked" && "bg-brand-50/60",
              )}
              style={{ paddingLeft: 4 + row.depth * 16 }}
            >
              <Checkbox
                checked={
                  state === "checked" ? true : state === "indeterminate" ? "indeterminate" : false
                }
                disabled={disabled || row.disabled}
                onCheckedChange={() => handleToggle(row.value)}
                aria-label={state === "checked" ? "取消选择" : "选择"}
                className="size-3.5 rounded-[3px] [&_[data-slot=checkbox-indicator]_svg]:size-3"
              />
              <button
                type="button"
                disabled={disabled || row.disabled}
                onClick={() => {
                  if (row.hasChildren) {
                    toggleExpanded(row.value);
                  } else {
                    handleToggle(row.value);
                  }
                }}
                className="flex min-w-0 flex-1 items-center gap-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
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
                <span className="min-w-0 flex-1 truncate text-text-strong">{row.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
