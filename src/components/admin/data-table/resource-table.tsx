import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { QueryClientContext } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Maximize2,
  Minimize2,
  Pin,
  RefreshCw,
  Settings,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { SortOrder } from "~/lib/list-sort";
import { CompactEmpty, EmptyState } from "../display/empty-state";
import { ResourceColumnSettingItem } from "./resource-column-setting-item";
import { ResourcePagination, type ResourcePaginationProps } from "./resource-pagination";
import { DENSITY_CLASS, type TableDensity, TableDensityControl } from "./table-density-control";
import { useColumnSettings } from "./use-column-settings";

/**
 * 后台统一表格（Ant Design Pro 风格封装）。
 *
 * 约定：
 *   * 页面级列表表格一律使用本组件，不要直接用 `@/components/ui/table`；
 *     `ui/table` 只作为嵌套小表格的底层原语使用。
 *   * 结构与 Ant Design ProTable 对齐，一个组件内依次是
 *     「工具栏 → 表头 → 表体 → 空状态 → 分页」，不再拆成互相独立的卡片。
 *   * 视觉标准全部内聚在这里，各页面只关心列定义与数据：
 *       - 工具栏 56px、无底色，底部一条浅灰分割线；
 *       - 表头 48px、底色 #F7F9FC、14px / 字重 500；
 *       - 数据行 54px、行分隔线 #EAECF0（仅相邻行之间一条，末行不画线）；
 *       - 悬停底色 #F5F8FC；
 *       - 表格外框无边框、无圆角，与页面留白直接相邻；
 *       - 分页条左汇总右页码，当前页品牌蓝。
 *   * 列的 `className` 只作用于单元格（对齐 antd 的 column 语义），
 *     表头样式走 `headerClassName`。
 */

type ColumnAlign = "left" | "center" | "right";

export type ResourceColumn<Row> = {
  key: string;
  /** 列设置中的纯文字名称，复杂表头建议提供。 */
  title?: string;
  /** false 表示此列必须展示。 */
  hideable?: boolean;
  header: React.ReactNode;
  cell?: (row: Row, index: number) => React.ReactNode;
  width?: string;
  align?: ColumnAlign;
  /** 单元格样式（不作用于表头）。 */
  className?: string;
  /** 表头单元格样式，用于统一表头高度与颜色。 */
  headerClassName?: string;
  /** 冻结列默认带一条分隔线，可按需关闭。 */
  hideStickyBorder?: boolean;
  /** 冻结列方向，需要与父容器 overflow-x-auto 配合；要求列已设置 width。 */
  sticky?: "left" | "right";
  /**
   * 可排序列：填服务端排序字段标识（对应列表查询的 sortBy）。
   *
   * 只有填了 sortKey 的列才出现排序箭头；点击顺序与 antd 一致：
   * 切到新列 → 升序 → 降序 → 取消排序。
   */
  sortKey?: string;
  /**
   * 内容超宽时单行省略，hover 显示完整文案。
   *
   * 后台表格统一口径：文本列一律声明 ellipsis，不再各页手写 truncate 类名。
   */
  ellipsis?: boolean;
};

/**
 * 表格实例句柄（等价 antd ProTable 的 actionRef）。
 *
 * 页面在「新建成功」「导入完成」这类时机需要主动重取数据时用它，
 * 不用再各自维护一份 refetch 回调。
 */
export type ResourceTableRef = {
  /** 重新取数。 */
  reload: () => void;
};

/**
 * 表格排序状态（受控）。
 *
 * `sortKey` 对应列上声明的 `sortKey`，也对应列表查询的 `sortBy`；
 * 两者为空表示不排序。
 */
export type ResourceSortState<K extends string = string> = {
  sortKey?: K;
  sortOrder?: SortOrder;
};

/** 分页配置，语义对齐 antd 的 `pagination`。 */
export type ResourcePaginationConfig = Omit<ResourcePaginationProps, "loading"> & {
  /** 重新取数中的提示（不触发骨架屏）。 */
  loading?: boolean;
};

/**
 * ProTable 风格工具栏：左侧标题（可带信息提示），右侧操作区。
 * 工具栏不再单独占一张卡片，只用一条底部浅灰分割线与表头衔接。
 *
 * 刷新、列设置、密度、全屏属于表格自带能力，统一走 `options`，
 * 不在这里逐个页面接线（语义对齐 antd ProTable 的 `options`）。
 */
export type ResourceTableToolbar = {
  /** 左侧标题：表格的业务名称，如「用量记录」。 */
  title?: React.ReactNode;
  /** 标题右侧的附加内容（如信息提示图标）。 */
  titleExtra?: React.ReactNode;
  /** 列表主操作（新建 / 导入 / 登记），固定排列在刷新按钮左侧。 */
  primaryAction?: React.ReactNode;
  /** 其他工具操作；兼容既有 actions，不应再手动放置刷新。 */
  actions?: React.ReactNode;
  /**
   * 选中行后的批量操作区。
   *
   * 有选中项时，表格上方出现一条选中态提示条（对齐 antd ProTable 的
   * tableAlertRender）：左边是「已选择 N 项」，右边是这里渲染的批量操作，
   * 末尾自带「取消选择」。
   */
  selectionActions?: React.ReactNode;
  /** 工具栏容器类名，用于按需调整内边距。 */
  className?: string;
};

/**
 * 表格自带能力，对齐 antd ProTable 的 `options`。
 *
 * - `reload`：刷新按钮，默认开启。传 `false` 隐藏；传函数则用自定义刷新动作
 *   （不传时走内置刷新：优先用表格的 `onRetry`，否则重新拉取当前页面活跃的查询）。
 * - `setting`：列设置，默认开启。
 * - `density`：尺寸（行高密度）切换，默认开启。
 * - `fullScreen`：全屏，默认关闭。
 *
 * 整个 `options` 传 `false` 时隐藏这组内置按钮，等同 antd 的 `options={false}`。
 */
export type ResourceTableOptions = {
  reload?: boolean | (() => void);
  setting?: boolean;
  density?: boolean;
  fullScreen?: boolean;
};

/**
 * 表格形态：
 * - page：页面级（筛选区一张卡、表格一张卡）；
 * - panel：单层留白的一张卡（财务 / 供应商类面板）；
 * - inline：全部裸排（弹窗、抽屉、页签内嵌）。
 */
export type ResourceTableVariant = "page" | "panel" | "inline";

export type ResourceTableProps<Row> = {
  columns: ResourceColumn<Row>[];
  data: Row[];
  rowKey: (row: Row, index: number) => string;

  /** 分页配置；传 false 隐藏分页条，不传则不渲染分页。 */
  pagination?: ResourcePaginationConfig | false;
  /** 分页区容器类名（例如面板内的左右留白）。 */
  paginationClassName?: string;

  /** ProTable 风格工具栏。 */
  toolbar?: ResourceTableToolbar;
  /** 表格自带能力（刷新 / 列设置 / 密度 / 全屏），语义对齐 antd ProTable 的 `options`。 */
  options?: ResourceTableOptions | false;
  /** 排序状态（受控）。 */
  sort?: ResourceSortState;
  /** 排序变化回调；不传时表头不渲染排序箭头。 */
  onSortChange?: (sort: ResourceSortState) => void;
  loading?: boolean;
  /** 重新取数中的提示（如分页区的加载态），不触发骨架屏。 */
  fetching?: boolean;
  empty?: React.ReactNode;
  emptyTitle?: React.ReactNode;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** 当前是否处于「已筛选」状态；用于区分「暂无数据」与「没有匹配的结果」。 */
  filtered?: boolean;
  /** 已筛选但无结果时的标题（默认「没有匹配的结果」）。 */
  emptyFilteredTitle?: React.ReactNode;
  /** 已筛选但无结果时的描述。 */
  emptyFilteredDescription?: React.ReactNode;
  /** 已筛选但无结果时的操作（如「清除筛选」）。 */
  emptyFilteredAction?: React.ReactNode;
  emptyVariant?: "default" | "dashed";
  emptyIcon?: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
  /**
   * 列设置的持久化键。
   *
   * 给出后，用户的列显隐与列顺序会按这个键记在浏览器本地，
   * 切换页面再回来仍然保留；不传则只在本次挂载内有效。
   */
  settingsKey?: string;
  /** 表格实例句柄（reload）。 */
  ref?: React.Ref<ResourceTableRef>;
  /** 错误提示。配合 onRetry 渲染重试按钮。 */
  error?: React.ReactNode;
  onRetry?: () => void;
  onRowClick?: (row: Row) => void;
  rowClassName?: (row: Row, index: number) => string;
  /** 加载态行样式，用于保持与数据行一致的高度，避免列表跳动。 */
  skeletonRowClassName?: string;
  className?: string;
  /** 追加到 <table> 上的类名（如列宽约束）。 */
  tableClassName?: string;
  /** 表格最小宽度（px 或 CSS 长度），窄屏时横向滚动而不是挤压列。 */
  scrollX?: number | string;
  /** 行高密度：default 为页面级标准，small 用于紧凑列表。 */
  size?: TableDensity;
  /** 是否给表格加竖向分隔线，默认 false（统一为无竖线）。 */
  bordered?: boolean;
  variant?: ResourceTableVariant;
  rowSelection?: {
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    getKey?: (row: Row, index: number) => string;
    disabled?: (row: Row, index: number) => boolean;
  };
};

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};
const HEAD_ALIGN_CLASS: Record<ColumnAlign, string> = {
  left: "text-left",
  center: "text-center justify-center",
  right: "text-right",
};

function getStickyCellProps<Row>(
  col: ResourceColumn<Row>,
  zone: "header" | "body",
  side?: "left" | "right",
): { style: React.CSSProperties; className: string } | null {
  const stickySide = side ?? col.sticky;
  if (!stickySide) return null;
  const isHeader = zone === "header";
  const style: React.CSSProperties = {
    position: "sticky",
    [stickySide === "left" ? "left" : "right"]: 0,
    zIndex: isHeader ? 3 : 1,
  };
  const sideBorder = stickySide === "left" ? "border-r" : "border-l";
  const bg = isHeader ? "bg-table-header-bg" : "bg-white";
  return {
    style,
    className: `${bg} ${col.hideStickyBorder ? "" : sideBorder} border-line`,
  };
}

/**
 * 从 React 节点里提取纯文本，用于省略号列的 hover 提示。
 */
function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || node === false || node === true) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return nodeToText(props.children);
  }
  return "";
}

const SKELETON_ROW_COUNT = 5;

function toScrollX(scrollX: number | string | undefined): string | undefined {
  if (scrollX === undefined) return undefined;
  return typeof scrollX === "number" ? `${scrollX}px` : scrollX;
}

export function ResourceTable<Row>({
  columns: allColumns,
  data,
  rowKey,
  pagination,
  paginationClassName,
  toolbar: providedToolbar,
  options,
  sort,
  onSortChange,
  loading,
  fetching,
  empty,
  emptyTitle = "暂无数据",
  emptyDescription,
  emptyAction,
  filtered = false,
  emptyFilteredTitle,
  emptyFilteredDescription,
  emptyFilteredAction,
  emptyVariant,
  emptyIcon,
  error,
  onRetry,
  ref,
  settingsKey,
  onRowClick,
  rowClassName,
  skeletonRowClassName,
  className,
  tableClassName,
  scrollX,
  size = "default",
  bordered = false,
  variant = "page",
  rowSelection,
}: ResourceTableProps<Row>) {
  const toolbar: ResourceTableToolbar = { ...providedToolbar };
  const columnSettingsId = React.useId();
  // 列显隐与列顺序：给了 settingsKey 就按表格维度记住（跨页面保持）。
  const [columnSettings, setColumnSettings] = useColumnSettings(settingsKey);
  const hiddenColumnKeys = React.useMemo(
    () => new Set(columnSettings.hidden),
    [columnSettings.hidden],
  );
  const columnOrder = columnSettings.order;
  const setHiddenColumnKeys = React.useCallback(
    (next: Set<string> | ((previous: Set<string>) => Set<string>)) => {
      setColumnSettings((previous) => {
        const previousSet = new Set(previous.hidden);
        const resolved = typeof next === "function" ? next(previousSet) : next;
        return { ...previous, hidden: [...resolved] };
      });
    },
    [setColumnSettings],
  );
  const setColumnOrder = React.useCallback(
    (next: string[] | ((previous: string[]) => string[])) => {
      setColumnSettings((previous) => ({
        ...previous,
        order: typeof next === "function" ? next(previous.order) : next,
      }));
    },
    [setColumnSettings],
  );
  // 用户手动固定的列（列设置里可固定到左 / 右）。
  // 同一侧只允许固定一列：底层的 sticky 只能挂在左右边缘，
  // 固定第二列会与前一列重叠，所以固定新列时先解除同侧的旧固定。
  const fixedColumns = columnSettings.fixed;
  const setFixedColumn = React.useCallback(
    (key: string, side: "left" | "right" | null) => {
      setColumnSettings((previous) => {
        const fixed = { ...previous.fixed };
        if (side === null) {
          delete fixed[key];
        } else {
          for (const other of Object.keys(fixed)) {
            if (fixed[other] === side) delete fixed[other];
          }
          fixed[key] = side;
        }
        return { ...previous, fixed };
      });
    },
    [setColumnSettings],
  );

  // 每列实际生效的固定方向：用户固定优先于列声明的 sticky。
  // 用户固定了某一侧时，该侧列声明的 sticky 让位，避免两侧抢占同一个边缘。
  const stickyByKey = React.useMemo(() => {
    const map = new Map<string, "left" | "right">();
    for (const column of allColumns) {
      if (column.sticky) map.set(column.key, column.sticky);
    }
    for (const [key, side] of Object.entries(fixedColumns)) {
      map.set(key, side);
    }
    for (const side of ["left", "right"] as const) {
      if (!Object.values(fixedColumns).includes(side)) continue;
      for (const [key, value] of [...map.entries()]) {
        if (value === side && fixedColumns[key] !== side) map.delete(key);
      }
    }
    return map;
  }, [allColumns, fixedColumns]);

  const [density, setDensity] = React.useState<TableDensity>(size);
  const [fullScreen, setFullScreen] = React.useState(false);

  // 表格自带能力，对齐 antd ProTable 的 `options`：
  // 默认开启刷新、密度与列设置；全屏按页打开；`options={false}` 整体隐藏。
  const optionsHidden = options === false;
  const reloadOption = optionsHidden ? true : (options?.reload ?? true);
  const settingOption = optionsHidden ? false : (options?.setting ?? true);
  // 密度默认开启；全屏默认关闭：表格基本都在页面内，全屏会打断阅读节奏，
  // 需要时按页显式打开 `options={{ fullScreen: true }}`。
  const densityOption = optionsHidden ? false : (options?.density ?? true);
  const fullScreenOption = optionsHidden ? false : (options?.fullScreen ?? false);
  const reloadEnabled = reloadOption !== false;
  const settingEnabled = settingOption !== false;
  const densityEnabled = densityOption === true;
  const fullScreenEnabled = fullScreenOption === true;

  // 内置刷新：优先用表格自己的 onRetry（精确重取当前列表），
  // 否则重新拉取当前页面活跃的查询，效果等同 antd 的 actionRef.reload()。
  const queryClient = React.useContext(QueryClientContext);
  const builtinReload = React.useCallback(() => {
    void queryClient?.refetchQueries({ type: "active" });
  }, [queryClient]);
  const reloadAction = React.useCallback(() => {
    if (typeof reloadOption === "function") {
      reloadOption();
      return;
    }
    if (onRetry) {
      onRetry();
      return;
    }
    builtinReload();
  }, [reloadOption, onRetry, builtinReload]);

  // 表格实例句柄：页面在新建 / 导入成功后可主动 reload()。
  React.useImperativeHandle(
    ref,
    () => ({
      reload: reloadAction,
    }),
    [reloadAction],
  );

  const orderedColumns = [...allColumns].sort((a, b) => {
    const ai = columnOrder.indexOf(a.key);
    const bi = columnOrder.indexOf(b.key);
    return (
      (ai < 0 ? columnOrder.length + allColumns.indexOf(a) : ai) -
      (bi < 0 ? columnOrder.length + allColumns.indexOf(b) : bi)
    );
  });
  const visibleColumns = orderedColumns.filter(
    (column) => column.hideable === false || !hiddenColumnKeys.has(column.key),
  );
  // 用户固定的列移到表格左右边缘，视觉上与「固定」的直觉一致。
  const columns = [
    ...visibleColumns.filter((column) => fixedColumns[column.key] === "left"),
    ...visibleColumns.filter((column) => fixedColumns[column.key] === undefined),
    ...visibleColumns.filter((column) => fixedColumns[column.key] === "right"),
  ];
  const allColumnsVisible = columns.length === allColumns.length;
  // 工具栏行：内置能力（刷新 / 列设置 / 密度 / 全屏）默认就在工具栏右侧，
  // 页面没有自定义标题和操作时也保留这一行（与 antd ProTable 一致）。
  // inline 形态嵌在弹窗里，默认不撑出空行。
  const columnSettingsEnabled = settingEnabled;
  const showToolbar =
    providedToolbar !== undefined ||
    (variant !== "inline" &&
      (densityEnabled || fullScreenEnabled || reloadEnabled || columnSettingsEnabled));
  const selectionEnabled = rowSelection !== undefined;
  const resolveSelectionKey = React.useCallback(
    (row: Row, index: number): string | null => {
      if (!rowSelection) return null;
      const fn = rowSelection.getKey ?? rowKey;
      return fn(row, index);
    },
    [rowKey, rowSelection],
  );

  const selectableItems = React.useMemo(() => {
    if (!rowSelection) return [] as Array<{ row: Row; index: number; key: string }>;
    return data
      .map((row, index) => {
        const key = resolveSelectionKey(row, index);
        if (!key) return null;
        if (rowSelection.disabled?.(row, index)) return null;
        return { row, index, key };
      })
      .filter((x): x is { row: Row; index: number; key: string } => x !== null);
  }, [data, resolveSelectionKey, rowSelection]);

  const selectableKeys = React.useMemo(() => selectableItems.map((i) => i.key), [selectableItems]);

  const allSelectableSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((k) => rowSelection?.selectedKeys.includes(k));
  const someSelectableSelected =
    !allSelectableSelected && selectableKeys.some((k) => rowSelection?.selectedKeys.includes(k));

  const handleToggleAll = (checked: boolean) => {
    if (!rowSelection) return;
    if (checked) {
      const merged = Array.from(new Set([...rowSelection.selectedKeys, ...selectableKeys]));
      rowSelection.onChange(merged);
    } else {
      const remaining = rowSelection.selectedKeys.filter((k) => !selectableKeys.includes(k));
      rowSelection.onChange(remaining);
    }
  };

  const handleToggleRow = (key: string, checked: boolean) => {
    if (!rowSelection) return;
    if (checked) {
      if (rowSelection.selectedKeys.includes(key)) return;
      rowSelection.onChange([...rowSelection.selectedKeys, key]);
    } else {
      rowSelection.onChange(rowSelection.selectedKeys.filter((k) => k !== key));
    }
  };

  const selectionHeaderCell = selectionEnabled ? (
    <TableHead
      key="__selection"
      style={{ width: "40px" }}
      className={HEAD_ALIGN_CLASS.center}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        checked={allSelectableSelected}
        {...(someSelectableSelected ? { "data-state": "indeterminate" } : {})}
        ref={(el) => {
          if (el)
            (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate =
              someSelectableSelected;
        }}
        onCheckedChange={(value) => handleToggleAll(value === true)}
        aria-label="全选当前页"
        disabled={selectableItems.length === 0}
      />
    </TableHead>
  ) : null;

  const renderSelectionCell = (row: Row, index: number) => {
    if (!selectionEnabled || !rowSelection) {
      return null;
    }
    const key = resolveSelectionKey(row, index);
    if (!key) return null;
    const disabled = rowSelection.disabled?.(row, index) ?? false;
    const checked = rowSelection.selectedKeys.includes(key);
    return (
      <TableCell
        key="__selection"
        className={ALIGN_CLASS.center}
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => handleToggleRow(key, value === true)}
          disabled={disabled}
          aria-label="选择此行"
        />
      </TableCell>
    );
  };

  const totalColumnCount = columns.length + (selectionEnabled ? 1 : 0);
  const selectedCount = rowSelection?.selectedKeys.length ?? 0;
  const isInitialLoading = loading && data.length === 0;
  const isEmpty = !isInitialLoading && data.length === 0;

  // 排序：切到新列从升序开始，同一列按 升序 → 降序 → 取消 循环（与 antd 一致）。
  const handleSort = (sortKey: string) => {
    if (!onSortChange) return;
    if (sort?.sortKey !== sortKey) {
      onSortChange({ sortKey, sortOrder: "asc" });
      return;
    }
    if (sort?.sortOrder === "asc") {
      onSortChange({ sortKey, sortOrder: "desc" });
      return;
    }
    if (sort?.sortOrder === "desc") {
      onSortChange({});
      return;
    }
    onSortChange({ sortKey, sortOrder: "asc" });
  };

  const renderHeader = () => (
    <TableHeader>
      <TableRow>
        {selectionHeaderCell}
        {columns.map((col) => {
          const sticky = getStickyCellProps(col, "header", stickyByKey.get(col.key));
          const sortable = Boolean(col.sortKey) && Boolean(onSortChange);
          const isSorted = sortable && sort?.sortKey === col.sortKey;
          const sortOrder = isSorted ? sort?.sortOrder : undefined;
          return (
            <TableHead
              key={col.key}
              aria-sort={
                isSorted
                  ? sortOrder === "asc"
                    ? "ascending"
                    : "descending"
                  : sortable
                    ? "none"
                    : undefined
              }
              style={{
                ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                ...(sticky?.style ?? {}),
              }}
              className={cn(
                HEAD_ALIGN_CLASS[col.align ?? "left"],
                sticky?.className,
                col.headerClassName,
                bordered && "border-r last:border-r-0",
              )}
            >
              {sortable && col.sortKey ? (
                <button
                  type="button"
                  className="inline-flex max-w-full items-center gap-1 rounded text-left outline-none transition-colors hover:text-brand-600 focus-visible:ring-1 focus-visible:ring-brand-500"
                  title="点击排序"
                  onClick={() => handleSort(col.sortKey as string)}
                >
                  <span className="truncate">{col.header}</span>
                  {isSorted && sortOrder === "asc" ? (
                    <ArrowUp className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                  ) : null}
                  {isSorted && sortOrder === "desc" ? (
                    <ArrowDown className="size-3.5 shrink-0 text-brand-600" aria-hidden />
                  ) : null}
                  {!isSorted ? (
                    <ChevronsUpDown
                      className="size-3.5 shrink-0 text-text-mute opacity-40 transition-opacity hover:opacity-100"
                      aria-hidden
                    />
                  ) : null}
                </button>
              ) : (
                col.header
              )}
            </TableHead>
          );
        })}
      </TableRow>
    </TableHeader>
  );

  const retryHandler = onRetry ?? builtinReload;
  const retryAction = retryHandler ? (
    <Button type="button" variant="outline" size="sm" onClick={retryHandler}>
      <RefreshCw className="size-3.5" aria-hidden />
      重试
    </Button>
  ) : null;

  const renderEmptyCell = () => (
    <TableRow>
      <TableCell colSpan={totalColumnCount} className="p-0">
        {error ? (
          <EmptyState title="加载失败" description={error} action={retryAction} />
        ) : empty ? (
          empty
        ) : emptyVariant === "dashed" ? (
          <EmptyState
            icon={emptyIcon}
            title={filtered ? (emptyFilteredTitle ?? "没有匹配的结果") : emptyTitle}
            description={
              filtered ? (emptyFilteredDescription ?? "试试调整或清空筛选条件") : emptyDescription
            }
            action={filtered ? (emptyFilteredAction ?? emptyAction) : emptyAction}
            variant="dashed"
          />
        ) : (
          <CompactEmpty
            icon={emptyIcon}
            title={filtered ? (emptyFilteredTitle ?? "暂无数据") : (emptyTitle ?? "暂无数据")}
            description={filtered ? undefined : emptyDescription}
          />
        )}
      </TableCell>
    </TableRow>
  );

  const minWidth = toScrollX(scrollX);

  const paginationNode = pagination ? (
    <ResourcePagination
      current={pagination.current}
      pageSize={pagination.pageSize}
      total={pagination.total}
      onChange={pagination.onChange}
      loading={pagination.loading ?? fetching ?? loading}
      showSizeChanger={pagination.showSizeChanger}
      showTotal={pagination.showTotal}
      summary={pagination.summary}
      layout={pagination.layout}
      pageSizeOptions={pagination.pageSizeOptions}
      showQuickJumper={pagination.showQuickJumper}
    />
  ) : null;

  const toolbarRefreshing = fetching ?? loading ?? false;
  return (
    <div
      data-slot="resource-table"
      className={cn(
        "flex flex-col",
        fullScreen && "fixed inset-0 z-50 overflow-auto bg-white p-6",
        className,
      )}
    >
      {/* 工具栏：左标题右操作，无额外底色，底部只有一条浅灰分割线。 */}
      {showToolbar ? (
        <div
          data-slot="resource-table-toolbar"
          className={cn(
            "flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line",
            variant === "inline" || fullScreen ? "px-0" : "px-6",
            toolbar.className,
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {toolbar.title ? (
              <h2 className="truncate text-[15px] font-semibold text-text-strong">
                {toolbar.title}
              </h2>
            ) : null}
            {toolbar.titleExtra}
          </div>
          {toolbar.primaryAction ||
          toolbar.actions ||
          densityEnabled ||
          fullScreenEnabled ||
          reloadEnabled ||
          columnSettingsEnabled ? (
            <div
              data-slot="resource-table-toolbar-actions"
              className="flex shrink-0 flex-wrap items-center justify-end gap-2"
            >
              {toolbar.primaryAction}
              {toolbar.actions}
              {reloadEnabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="刷新列表"
                  title="刷新列表"
                  onClick={reloadAction}
                >
                  <RefreshCw
                    className={cn("size-4", toolbarRefreshing && "animate-spin")}
                    aria-hidden
                  />
                </Button>
              ) : null}
              {densityEnabled ? (
                <TableDensityControl value={density} onChange={setDensity} />
              ) : null}
              {columnSettingsEnabled ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="列设置"
                      title="列设置"
                    >
                      <Settings className="size-4" aria-hidden />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 border-b border-line pb-3">
                      <label
                        htmlFor={`${columnSettingsId}-all`}
                        className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold"
                      >
                        <Checkbox
                          id={`${columnSettingsId}-all`}
                          aria-label="全选列"
                          checked={allColumnsVisible ? true : "indeterminate"}
                          onCheckedChange={(checked) => {
                            if (checked) setHiddenColumnKeys(new Set());
                            else {
                              const mandatory = allColumns.filter(
                                (column) => column.hideable === false,
                              );
                              const keep = mandatory.length
                                ? new Set(mandatory.map((column) => column.key))
                                : new Set(allColumns.slice(0, 1).map((column) => column.key));
                              setHiddenColumnKeys(
                                new Set(
                                  allColumns
                                    .filter((column) => !keep.has(column.key))
                                    .map((column) => column.key),
                                ),
                              );
                            }
                          }}
                        />
                        列显示
                      </label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0"
                        onClick={() => {
                          setHiddenColumnKeys(new Set());
                          setColumnOrder([]);
                          setColumnSettings((previous) => ({ ...previous, fixed: {} }));
                        }}
                      >
                        重置
                      </Button>
                    </div>
                    <DragDropProvider
                      onDragEnd={(event) => {
                        if (event.canceled) return;
                        setColumnOrder(
                          move(
                            orderedColumns.map((column) => column.key),
                            event,
                          ),
                        );
                      }}
                    >
                      <ul
                        className="max-h-72 overflow-y-auto overscroll-contain"
                        aria-label="列显示和顺序"
                      >
                        {orderedColumns.map((column, index) => {
                          const visible =
                            column.hideable === false || !hiddenColumnKeys.has(column.key);
                          const label =
                            column.title ??
                            (typeof column.header === "string" ? column.header : column.key);
                          return (
                            <ResourceColumnSettingItem
                              key={column.key}
                              id={column.key}
                              index={index}
                              label={label}
                            >
                              <label
                                htmlFor={`${columnSettingsId}-${column.key}`}
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-[13px]"
                              >
                                <Checkbox
                                  id={`${columnSettingsId}-${column.key}`}
                                  checked={visible}
                                  disabled={
                                    column.hideable === false || (visible && columns.length === 1)
                                  }
                                  onCheckedChange={(checked) =>
                                    setHiddenColumnKeys((previous) => {
                                      const next = new Set(previous);
                                      if (checked) next.delete(column.key);
                                      else next.add(column.key);
                                      return next;
                                    })
                                  }
                                />
                                <span className="truncate" title={label}>
                                  {label}
                                </span>
                              </label>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`固定列：${label}`}
                                    title={
                                      fixedColumns[column.key]
                                        ? `已固定到${
                                            fixedColumns[column.key] === "left" ? "左" : "右"
                                          }侧`
                                        : "固定列"
                                    }
                                    className="shrink-0"
                                  >
                                    <Pin
                                      className={cn(
                                        "size-3.5",
                                        fixedColumns[column.key] && "text-brand-600",
                                      )}
                                      aria-hidden
                                    />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem
                                    onClick={() => setFixedColumn(column.key, "left")}
                                  >
                                    固定到左侧
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setFixedColumn(column.key, "right")}
                                  >
                                    固定到右侧
                                  </DropdownMenuItem>
                                  {fixedColumns[column.key] ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => setFixedColumn(column.key, null)}
                                      >
                                        取消固定
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </ResourceColumnSettingItem>
                          );
                        })}
                      </ul>
                    </DragDropProvider>
                  </PopoverContent>
                </Popover>
              ) : null}
              {fullScreenEnabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={fullScreen ? "退出全屏" : "全屏"}
                  title={fullScreen ? "退出全屏" : "全屏"}
                  onClick={() => setFullScreen((current) => !current)}
                >
                  {fullScreen ? (
                    <Minimize2 className="size-4" aria-hidden />
                  ) : (
                    <Maximize2 className="size-4" aria-hidden />
                  )}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 选中态操作条：语义对齐 antd ProTable 的 tableAlertRender——
          选中行后表格上方出现一条提示条，左边告知选中数量，右边放批量操作。 */}
      {selectedCount > 0 ? (
        <div
          data-slot="resource-table-selection-bar"
          className={cn(
            "flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line bg-table-header-bg",
            variant === "inline" || fullScreen ? "px-0" : "px-6",
          )}
        >
          <span className="text-[13px] font-medium text-text-strong">
            已选择 {selectedCount} 项
          </span>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {toolbar.selectionActions}
            {rowSelection ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => rowSelection.onChange([])}
              >
                取消选择
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto overflow-y-hidden">
        {error && data.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-b border-line bg-destructive/5 px-4 py-2.5 text-[13px] text-destructive">
            <span className="min-w-0">{error}</span>
            {retryAction}
          </div>
        ) : null}

        <Table
          className={cn(
            "table-fixed bg-white",
            DENSITY_CLASS[density],
            bordered && "[&_tbody_td]:border-r [&_tbody_td]:last:border-r-0",
            tableClassName,
          )}
          style={minWidth ? { minWidth } : undefined}
        >
          {renderHeader()}
          <TableBody>
            {isInitialLoading
              ? Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i).map((i) => (
                  <TableRow
                    key={`skeleton-row-${columns.length}-${i}`}
                    className={skeletonRowClassName}
                  >
                    {selectionEnabled ? <TableCell className={ALIGN_CLASS.center} /> : null}
                    {columns.map((col) => {
                      const sticky = getStickyCellProps(col, "body", stickyByKey.get(col.key));
                      return (
                        <TableCell
                          key={col.key}
                          style={{
                            ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                            ...(sticky?.style ?? {}),
                          }}
                          className={cn(sticky?.className, col.className)}
                        >
                          <div className="h-4 w-full max-w-[180px] animate-pulse rounded bg-line-soft" />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              : isEmpty
                ? renderEmptyCell()
                : data.map((row, index) => (
                    <TableRow
                      key={rowKey(row, index)}
                      className={cn(
                        "group/row",
                        onRowClick && "cursor-pointer",
                        rowClassName?.(row, index),
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {renderSelectionCell(row, index)}
                      {columns.map((col) => {
                        const sticky = getStickyCellProps(col, "body", stickyByKey.get(col.key));
                        return (
                          <TableCell
                            key={col.key}
                            style={{
                              ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                              ...(sticky?.style ?? {}),
                            }}
                            className={cn(
                              ALIGN_CLASS[col.align ?? "left"],
                              sticky?.className,
                              col.className,
                            )}
                          >
                            {(() => {
                              const content = col.cell
                                ? col.cell(row, index)
                                : ((row as Record<string, unknown>)[col.key] as React.ReactNode);
                              if (!col.ellipsis) return content;
                              return (
                                <span
                                  className="block truncate"
                                  title={nodeToText(content) || undefined}
                                >
                                  {content}
                                </span>
                              );
                            })()}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
          </TableBody>
        </Table>
      </div>

      {paginationNode ? (
        // 间距统一由组件负责：分页条与表格末行之间固定 12px，不画分隔线。
        <div className={cn("pt-3", paginationClassName)}>{paginationNode}</div>
      ) : null}
    </div>
  );
}

export { ResourcePagination, type ResourcePaginationProps };
