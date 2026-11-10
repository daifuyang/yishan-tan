import { useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";

import type { SortOrder } from "~/lib/list-sort";

export type ListUrlSort = {
  sortKey?: string;
  sortOrder?: SortOrder;
};

export type UseListUrlStateOptions = {
  /**
   * 允许写进 URL 的筛选字段。
   *
   * 只有列在这里的字段才会进入地址栏，避免把临时条件也暴露出去。
   */
  filterKeys: string[];
  /** 筛选字段的默认值（值为空表示「不筛选」）。 */
  defaultFilters?: Record<string, string>;
  /** 每页条数默认值。 */
  defaultPageSize?: number;
  /** 默认排序（写入 URL 前的初始态）。 */
  defaultSort?: ListUrlSort;
  /**
   * 是否有服务端分页。
   *
   * 树形列表（departments / menus）是整棵树 + 客户端分页，
   * 把 page / pageSize 写进地址栏没有意义；传 false 时地址栏只保留筛选与排序。
   */
  paginated?: boolean;
};

/**
 * 列表状态与 URL 同步。
 *
 * 大厂后台的列表页刷新、分享链接后都能回到同一份视图：筛选条件、页码、
 * 每页条数、排序都写在地址栏里。这里把这份状态收敛到一个 hook，
 * 页面只管用它暴露的读写方法。
 *
 * 约定：
 *   - 读：直接用返回值（filters / page / pageSize / sort）；
 *   - 写：setFilters / setPage / setPageSize / setSort；
 *   - 筛选变化自动回到第 1 页；
 *   - 写入用 replace，不往浏览器历史里塞垃圾。
 */
export function useListUrlState(options: UseListUrlStateOptions) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;

  // 选项对象每次渲染都是新的，用字符串化的 key 稳定住下游 memo 的依赖。
  const filterKeysKey = options.filterKeys.join(",");
  const defaultFiltersKey = JSON.stringify(options.defaultFilters ?? {});
  const defaultPageSize = options.defaultPageSize ?? 10;
  const defaultSortKey = JSON.stringify(options.defaultSort ?? {});
  const paginated = options.paginated ?? true;

  const defaultFilters = React.useMemo(
    () => JSON.parse(defaultFiltersKey) as Record<string, string>,
    [defaultFiltersKey],
  );
  const defaultSort = React.useMemo(
    () => JSON.parse(defaultSortKey) as ListUrlSort,
    [defaultSortKey],
  );
  const filterKeys = React.useMemo(() => filterKeysKey.split(",").filter(Boolean), [filterKeysKey]);

  const filters = React.useMemo(() => {
    const result: Record<string, string> = { ...defaultFilters };
    for (const key of filterKeys) {
      const value = search[key];
      if (typeof value === "string" && value !== "") result[key] = value;
    }
    return result;
  }, [search, defaultFilters, filterKeys]);

  const page = React.useMemo(() => {
    const raw = search.page;
    const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [search.page]);

  const pageSize = React.useMemo(() => {
    const raw = search.pageSize;
    const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultPageSize;
  }, [search.pageSize, defaultPageSize]);

  const sort = React.useMemo<ListUrlSort>(() => {
    const sortKey = typeof search.sortBy === "string" && search.sortBy ? search.sortBy : undefined;
    const sortOrder =
      search.sortOrder === "asc" || search.sortOrder === "desc" ? search.sortOrder : undefined;
    if (!sortKey || !sortOrder) return defaultSort;
    return { sortKey, sortOrder };
  }, [search.sortBy, search.sortOrder, defaultSort]);

  const patchSearch = React.useCallback(
    (patch: Record<string, unknown>) => {
      void navigate({
        search: ((previous: Record<string, unknown>) => {
          const merged: Record<string, unknown> = { ...previous, ...patch };
          for (const [key, value] of Object.entries(merged)) {
            if (value === undefined || value === null || value === "") delete merged[key];
          }
          return merged;
        }) as never,
        replace: true,
      });
    },
    [navigate],
  );

  const setFilters = React.useCallback(
    (values: Record<string, string>) => {
      const patch: Record<string, unknown> = paginated ? { page: 1 } : {};
      for (const key of filterKeys) {
        const value = values[key] ?? "";
        // 与默认值相同的条件不写进地址栏，保持链接干净。
        patch[key] = value === (defaultFilters[key] ?? "") ? "" : value;
      }
      patchSearch(patch);
    },
    [defaultFilters, filterKeys, paginated, patchSearch],
  );

  const resetFilters = React.useCallback(() => {
    const patch: Record<string, unknown> = paginated ? { page: 1 } : {};
    for (const key of filterKeys) patch[key] = "";
    patchSearch(patch);
  }, [filterKeys, paginated, patchSearch]);

  const setPage = React.useCallback(
    (next: number) => {
      if (!paginated) return;
      patchSearch({ page: next > 1 ? next : undefined });
    },
    [paginated, patchSearch],
  );

  const setPageSize = React.useCallback(
    (next: number) => {
      if (!paginated) return;
      patchSearch({ pageSize: next === defaultPageSize ? undefined : next, page: 1 });
    },
    [defaultPageSize, paginated, patchSearch],
  );

  const setSort = React.useCallback(
    (next: ListUrlSort) => {
      patchSearch({
        sortBy: next.sortKey,
        sortOrder: next.sortOrder,
        ...(paginated ? { page: 1 } : {}),
      });
    },
    [paginated, patchSearch],
  );

  return {
    filters,
    page,
    pageSize,
    sort,
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    setSort,
  };
}
