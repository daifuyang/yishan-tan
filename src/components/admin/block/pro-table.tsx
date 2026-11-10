/**
 * ProTable：后台列表的统一「区块级」组件（开箱即用）。
 *
 * 设计目标（对齐 ProComponents 心智模型）：
 *   一个组件固定承载「筛选区 → 工具栏 → 表格 → 分页」四段，页面只写
 *   列定义、查询状态与筛选字段，所有视觉与交互规范收敛在这里：
 *     - 筛选区：公共 FilterBar，一个业务字段一个控件，草稿与已提交条件分离；
 *     - 工具栏：标题 / 主操作 / 刷新，公共组件负责排列；
 *     - 表格：统一 ResourceTable（表头 48px、行 54px、行分隔线、悬停态、滚动）；
 *     - 分页：统一 ResourcePagination —— 左汇总「共 N 条，第 x/y 页」、右每页条数 + 页码，
 *       与表格末行之间固定 12px，不画分隔线。
 *
 * 三种形态：
 *   - variant="page"（默认）：筛选区一张卡、表格一张卡，用于后台页面；
 *   - variant="panel"：单层留白的一张卡，用于财务 / 供应商类面板；
 *   - variant="inline"：全部裸排，用于弹窗 / 抽屉 / 面板内嵌。
 */

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FilterBar } from "../data-table/filter-bar";
import { QueryFormItem } from "../data-table/query-form-item";
import {
  type ResourceColumn,
  type ResourcePaginationConfig,
  type ResourceSortState,
  ResourceTable,
  type ResourceTableOptions,
  type ResourceTableRef,
  type ResourceTableToolbar,
} from "../data-table/resource-table";
import type { TableDensity } from "../data-table/table-density-control";
import { ContentPanel } from "../layout/content-panel";

export type ProTableColumn<Row> = ResourceColumn<Row>;

/** 列定义与公共表格保持同源，页面只需从 block 引入。 */
export type { ResourceColumn };

/** 声明式筛选字段：一个业务字段一个控件。 */
export type ProTableSearchField = {
  /** 条件键，与提交后的 values 对应。 */
  name: string;
  label: string;
  /**
   * 控件渲染。
   * - value：草稿值（编辑中，未提交）；
   * - onChange：只改草稿，不发请求；
   * - id：控件 id，交给 label 的 htmlFor。
   */
  render: (params: {
    value: string;
    onChange: (value: string) => void;
    id: string;
  }) => React.ReactNode;
};

export type ProTableSearch = {
  /** 声明式筛选字段；与 children 二选一。 */
  fields?: ProTableSearchField[];
  /** 已有页面自绘控件时直接传 FilterBar 的 children。 */
  children?: React.ReactNode;
  /** 已提交的条件（受控）。 */
  values?: Record<string, string>;
  /** 草稿初值。 */
  defaultValues?: Record<string, string>;
  /** 草稿变化（仅重置等场景需要）。 */
  onChange?: (values: Record<string, string>) => void;
  /** 点「查询」或按 Enter：值已 trim。 */
  onSubmit?: (values: Record<string, string>) => void;
  /** 点「重置」。 */
  onReset?: () => void;
  /** 筛选区列数，默认 3（后台统一口径，见 docs/admin-list-standard.md）。 */
  columns?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  submitLabel?: string;
  loading?: boolean;
};

export type ProTableToolbar = ResourceTableToolbar;

/**
 * 分页配置：语义对齐 antd 的 `pagination`。
 * 传 false 表示不分页；不传则不渲染分页条。
 */
export type ProTablePagination = ResourcePaginationConfig;

/** 与 ResourceTable 的行选择契约保持一致，避免页面自定义。 */
export type ProTableRowSelection<Row> = {
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  getKey?: (row: Row, index: number) => string;
  disabled?: (row: Row, index: number) => boolean;
};

export type ProTableProps<Row> = {
  columns: ProTableColumn<Row>[];
  data: Row[];
  rowKey: (row: Row, index: number) => string;

  /** 筛选区（可省略）。 */
  search?: ProTableSearch;
  /** 工具栏（可省略）。 */
  toolbar?: ProTableToolbar;
  /** 表格自带能力（刷新 / 列设置 / 密度 / 全屏），语义对齐 antd ProTable 的 `options`。 */
  options?: ResourceTableOptions | false;
  /** 表格实例句柄（reload）。 */
  ref?: React.Ref<ResourceTableRef>;
  /** 列设置的持久化键（按表格维度记住列显隐与顺序）。 */
  settingsKey?: string;
  /** 排序状态（受控）。 */
  sort?: ResourceSortState;
  /** 排序变化回调；不传时表头不渲染排序箭头。 */
  onSortChange?: (sort: ResourceSortState) => void;
  /** 分页；传 false 表示不分页。 */
  pagination?: ProTablePagination | false;

  loading?: boolean;
  fetching?: boolean;
  error?: React.ReactNode;
  onRetry?: () => void;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** 覆盖「是否有筛选条件」的自动判断。 */
  filtered?: boolean;
  emptyFilteredTitle?: React.ReactNode;
  emptyFilteredDescription?: React.ReactNode;
  emptyFilteredAction?: React.ReactNode;
  /** 自定义空状态（优先于 emptyTitle）。 */
  empty?: React.ReactNode;
  emptyVariant?: "default" | "dashed";
  emptyIcon?: React.ComponentType<{
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  bordered?: boolean;
  paginationClassName?: string;
  onRowClick?: (row: Row) => void;
  rowClassName?: (row: Row, index: number) => string;
  /** 骨架行样式（与数据行等高，避免加载时跳动）。 */
  skeletonRowClassName?: string;
  rowSelection?: ProTableRowSelection<Row>;
  size?: TableDensity;
  scrollX?: number | string;
  tableClassName?: string;

  /**
   * 形态：
   * - page：页面级（筛选区一张卡、表格一张卡）；
   * - panel：单层留白的一张卡（财务 / 供应商类面板）；
   * - inline：全部裸排（弹窗、抽屉、页签内嵌）。
   */
  variant?: "page" | "panel" | "inline";
  /** 表格下方的补充说明（位置在分页条之下）。 */
  footer?: React.ReactNode;
  className?: string;
};

function fieldId(name: string): string {
  return `pro-table-filter-${name}`;
}

export function ProTable<Row>({
  columns,
  data,
  rowKey,
  search,
  toolbar,
  options,
  ref,
  settingsKey,
  sort,
  onSortChange,
  pagination,
  loading,
  fetching,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  filtered,
  emptyFilteredTitle,
  emptyFilteredDescription,
  emptyFilteredAction,
  empty,
  emptyVariant,
  emptyIcon,
  bordered,
  paginationClassName,
  onRowClick,
  rowClassName,
  skeletonRowClassName,
  rowSelection,
  size = "default",
  scrollX,
  tableClassName,
  variant = "page",
  footer,
  className,
}: ProTableProps<Row>) {
  const fieldNames = React.useMemo(
    () => (search?.fields ?? []).map((field) => field.name),
    [search],
  );
  const [draft, setDraft] = React.useState<Record<string, string>>(search?.defaultValues ?? {});

  // 外部已提交条件变化时同步草稿（例如父组件重置）。
  React.useEffect(() => {
    if (search?.values) setDraft(search.values);
  }, [search?.values]);

  const setField = React.useCallback((name: string, value: string) => {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }, []);

  const searchNode = search ? (
    <FilterBar
      values={search.values ?? draft}
      defaultValues={search.defaultValues ?? {}}
      columns={search.columns ?? 3}
      // 页面级筛选区默认折叠（沿用 FilterBar 惯例）；面板 / 弹窗内默认全部展开。
      collapsible={search.collapsible ?? variant === "page"}
      defaultCollapsed={search.defaultCollapsed ?? variant === "page"}
      submitLabel={search.submitLabel}
      loading={search.loading ?? fetching}
      onChange={(values) => {
        const next = values as Record<string, string>;
        setDraft(next);
        search.onChange?.(next);
      }}
      onReset={() => {
        const resetValues = search.defaultValues ?? {};
        setDraft(resetValues);
        search.onReset?.();
        if (search.fields) search.onSubmit?.(resetValues);
      }}
      onSubmit={() => {
        if (!search.fields) {
          search.onSubmit?.(search.values ?? draft);
          return;
        }
        const next: Record<string, string> = {};
        for (const name of fieldNames) {
          next[name] = (draft[name] ?? "").trim();
        }
        search.onSubmit?.(next);
      }}
    >
      {search.children ??
        search.fields?.map((field) => (
          <QueryFormItem key={field.name} label={field.label} htmlFor={fieldId(field.name)}>
            {field.render({
              value: draft[field.name] ?? "",
              onChange: (value) => setField(field.name, value),
              id: fieldId(field.name),
            })}
          </QueryFormItem>
        ))}
    </FilterBar>
  ) : null;

  // 空状态分型：筛选无结果 ≠ 库里没有数据。
  // 页面不传 filtered 时，按「已提交条件里是否有非空值」自动判断。
  const hasActiveFilters = React.useMemo(() => {
    if (!search?.values) return false;
    return Object.values(search.values).some((value) => String(value ?? "").trim() !== "");
  }, [search?.values]);
  const isFiltered = filtered ?? hasActiveFilters;
  const clearFiltersAction =
    isFiltered && search?.onReset ? (
      <Button type="button" variant="outline" size="sm" onClick={() => search.onReset?.()}>
        清除筛选
      </Button>
    ) : undefined;

  const tableNode = (
    <ResourceTable<Row>
      columns={columns}
      data={data}
      rowKey={rowKey}
      toolbar={toolbar}
      options={options}
      ref={ref}
      settingsKey={settingsKey}
      sort={sort}
      onSortChange={onSortChange}
      loading={loading}
      fetching={fetching}
      error={error}
      onRetry={onRetry}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      filtered={isFiltered}
      emptyFilteredTitle={emptyFilteredTitle}
      emptyFilteredDescription={emptyFilteredDescription}
      emptyFilteredAction={emptyFilteredAction ?? clearFiltersAction}
      empty={empty}
      emptyVariant={emptyVariant}
      emptyIcon={emptyIcon}
      bordered={bordered}
      paginationClassName={paginationClassName}
      onRowClick={onRowClick}
      rowClassName={rowClassName}
      skeletonRowClassName={skeletonRowClassName}
      rowSelection={rowSelection}
      size={size}
      scrollX={scrollX}
      tableClassName={tableClassName}
      variant={variant === "page" ? "page" : variant}
      pagination={
        pagination === false
          ? false
          : pagination
            ? {
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: pagination.onChange,
                // 后台统一口径：分页条自带每页条数选择。
                showSizeChanger: pagination.showSizeChanger ?? true,
                showQuickJumper: pagination.showQuickJumper ?? true,
                showTotal: pagination.showTotal,
                summary: pagination.summary,
                layout: pagination.layout,
                pageSizeOptions: pagination.pageSizeOptions,
                loading: pagination.loading ?? fetching,
              }
            : undefined
      }
    />
  );

  if (variant === "inline") {
    return (
      <div className={cn("min-w-0 space-y-4", className)}>
        {searchNode}
        {tableNode}
        {footer}
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <ContentPanel padding="none" className={className}>
        <div className="min-w-0 space-y-4 px-6 py-4">
          {searchNode}
          {tableNode}
          {footer}
        </div>
      </ContentPanel>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      {searchNode ? (
        <Card className="rounded-md border-line p-6 shadow-card">{searchNode}</Card>
      ) : null}
      <Card className="rounded-md border-line p-6 shadow-card">{tableNode}</Card>
      {footer}
    </div>
  );
}
