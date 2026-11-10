import * as React from "react";

import type { ResourceSortState } from "./resource-table";

/**
 * 列表排序状态（受控）。
 *
 * 页面只关心「把排序塞进查询参数」，具体状态存在哪由这个 hook 决定；
 * 后续要把排序 / 筛选 / 分页一起同步到 URL 时，只改这里即可。
 *
 * `onAfterChange` 用于在排序变化后把页码拨回第一页（否则可能停在空页上）。
 */
export function useListSort<K extends string = string>(
  initial?: ResourceSortState<K>,
  onAfterChange?: () => void,
) {
  const [sort, setSort] = React.useState<ResourceSortState<K>>(initial ?? {});

  const onSortChange = React.useCallback(
    (next: ResourceSortState) => {
      // 表格只会抛出自己列上声明过的 sortKey，这里收敛回本列表的排序字段。
      setSort(next as ResourceSortState<K>);
      onAfterChange?.();
    },
    [onAfterChange],
  );

  return { sort, onSortChange };
}
