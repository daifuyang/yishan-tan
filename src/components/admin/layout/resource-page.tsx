import type * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { FilterBar } from "../data-table/filter-bar";
import { ResourceTable, type ResourceTableProps } from "../data-table/resource-table";
import { PageHeader } from "./page-header";

type ResourcePageProps<Row> = {
  title: React.ReactNode;
  description?: React.ReactNode;

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

  tableProps: Omit<ResourceTableProps<Row>, "variant">;
  className?: string;
};

export function ResourcePage<Row>({
  title,
  description,
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
  tableProps,
  className,
}: ResourcePageProps<Row>) {
  const hasToolbar = toolbarTitle !== undefined || toolbarActions !== undefined;

  return (
    <div className={cn("space-y-4", className)}>
      <PageHeader title={title} description={description} className="border-b-0 pb-0" />

      {filter ? (
        <Card className="rounded-md border-line p-6 shadow-card">
          <FilterBar
            values={filterValues}
            defaultValues={defaultFilterValues}
            onChange={onFilterChange}
            onReset={onFilterReset}
            onSubmit={onFilterSubmit}
            submitLabel={filterSubmitLabel}
            loading={filterLoading}
            columns={filterColumns}
            collapsible={filterCollapsible}
            defaultCollapsed={filterDefaultCollapsed}
            className="border-0 bg-transparent p-0"
          >
            {filter}
          </FilterBar>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4 rounded-md border-line p-6 shadow-card">
        {hasToolbar ? (
          <div className="flex items-center justify-between gap-2">
            {toolbarTitle ? (
              <h2 className="text-[15px] font-medium text-text-strong">{toolbarTitle}</h2>
            ) : (
              <span aria-hidden />
            )}
            {toolbarActions ? (
              <div className="flex items-center gap-2">{toolbarActions}</div>
            ) : null}
          </div>
        ) : null}

        <ResourceTable {...tableProps} variant="card" />
      </Card>
    </div>
  );
}
