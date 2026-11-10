import * as React from "react";

import { cn } from "@/lib/utils";
import { ProTable } from "../block/pro-table";
import type { ResourceTableProps } from "../data-table/resource-table";
import { PageHeader } from "./page-header";

type ResourcePageProps<Row> = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** 页面在外部已经有统一标题（如多标签页共用标题）时关掉内置标题区。 */
  hideHeader?: boolean;

  filter?: React.ReactNode;
  filterValues?: Record<string, unknown>;
  defaultFilterValues?: Record<string, unknown>;
  onFilterChange?: (values: Record<string, unknown>) => void;
  onFilterReset?: () => void;
  onFilterSubmit?: (values: Record<string, unknown>) => void;
  filterSubmitLabel?: string;
  filterLoading?: boolean;
  filterColumns?: number;
  filterCollapsible?: boolean;
  filterDefaultCollapsed?: boolean;

  toolbarTitle?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  /** 新建 / 导入等列表主操作；由公共 Table 排列在刷新左侧。 */
  toolbarPrimaryAction?: React.ReactNode;
  /** 自定义刷新动作；不传时用表格内置刷新（等价 antd 的 actionRef.reload()）。 */
  onRefresh?: () => void;
  /** 重新取数中的提示；不传时沿用表格的 fetching / loading。 */
  refreshing?: boolean;

  tableProps: Omit<ResourceTableProps<Row>, "variant">;
  className?: string;
};

/**
 * 页面级列表：标题 + 筛选区 + 表格。
 *
 * 结构与视觉全部交给公共 ProTable（筛选 → 工具栏 → 表格 → 分页），
 * 页面只负责标题、筛选条件与查询状态。
 */
export function ResourcePage<Row>({
  title,
  description,
  hideHeader = false,

  filter,
  filterValues,
  defaultFilterValues,
  onFilterChange,
  onFilterReset,
  onFilterSubmit,
  filterSubmitLabel,
  filterLoading,
  filterColumns,
  filterCollapsible,
  filterDefaultCollapsed,

  toolbarTitle,
  toolbarActions,
  toolbarPrimaryAction,
  onRefresh,
  refreshing,

  tableProps,
  className,
}: ResourcePageProps<Row>) {
  const hasToolbar =
    Boolean(tableProps.toolbar) ||
    toolbarTitle !== undefined ||
    toolbarActions !== undefined ||
    toolbarPrimaryAction !== undefined ||
    onRefresh !== undefined;

  // 分页：统一走 pagination 配置对象。
  const pagination = tableProps.pagination;

  // 表格自带能力：刷新 / 列设置 / 密度 / 全屏，统一走 options（对齐 antd ProTable）。
  // 页面级 onRefresh 只是给内置刷新换一个更精确的动作。
  const tableOptions = React.useMemo(() => {
    if (tableProps.options === false) return false;
    const base = { ...(tableProps.options ?? {}) };
    if (onRefresh !== undefined && base.reload === undefined) base.reload = onRefresh;
    return base;
  }, [tableProps.options, onRefresh]);

  return (
    <div className={cn("space-y-4", className)}>
      {hideHeader ? null : (
        <PageHeader title={title} description={description} className="border-b-0 pb-0" />
      )}

      <ProTable<Row>
        variant="page"
        columns={tableProps.columns}
        data={tableProps.data}
        rowKey={tableProps.rowKey}
        search={
          filter
            ? {
                children: filter,
                values: filterValues as Record<string, string> | undefined,
                defaultValues: defaultFilterValues as Record<string, string> | undefined,
                onChange: onFilterChange as ((values: Record<string, string>) => void) | undefined,
                onSubmit: onFilterSubmit as ((values: Record<string, string>) => void) | undefined,
                onReset: onFilterReset,
                columns: filterColumns,
                collapsible: filterCollapsible,
                defaultCollapsed: filterDefaultCollapsed,
                submitLabel: filterSubmitLabel,
                loading: filterLoading,
              }
            : undefined
        }
        toolbar={
          hasToolbar
            ? {
                ...tableProps.toolbar,
                title: toolbarTitle !== undefined ? toolbarTitle : tableProps.toolbar?.title,
                actions:
                  toolbarActions !== undefined ? toolbarActions : tableProps.toolbar?.actions,
                primaryAction:
                  toolbarPrimaryAction !== undefined
                    ? toolbarPrimaryAction
                    : tableProps.toolbar?.primaryAction,
                selectionActions: tableProps.toolbar?.selectionActions,
              }
            : undefined
        }
        options={tableOptions}
        ref={tableProps.ref}
        settingsKey={tableProps.settingsKey}
        sort={tableProps.sort}
        onSortChange={tableProps.onSortChange}
        pagination={pagination}
        loading={tableProps.loading}
        fetching={tableProps.fetching ?? refreshing}
        error={tableProps.error}
        onRetry={tableProps.onRetry}
        empty={tableProps.empty}
        emptyTitle={tableProps.emptyTitle}
        emptyDescription={tableProps.emptyDescription}
        emptyAction={tableProps.emptyAction}
        filtered={tableProps.filtered}
        emptyFilteredTitle={tableProps.emptyFilteredTitle}
        emptyFilteredDescription={tableProps.emptyFilteredDescription}
        emptyFilteredAction={tableProps.emptyFilteredAction}
        emptyVariant={tableProps.emptyVariant}
        emptyIcon={tableProps.emptyIcon}
        bordered={tableProps.bordered}
        paginationClassName={tableProps.paginationClassName}
        onRowClick={tableProps.onRowClick}
        rowClassName={tableProps.rowClassName}
        skeletonRowClassName={tableProps.skeletonRowClassName}
        rowSelection={tableProps.rowSelection}
        size={tableProps.size}
        scrollX={tableProps.scrollX}
        tableClassName={tableProps.tableClassName}
      />
    </div>
  );
}
