/** 查询表格公共视觉：表头短分隔线与长文本省略，不改变列宽。 */
export const QUERY_TABLE_CLASS =
  "[&_tbody_td]:overflow-hidden [&_tbody_td]:text-ellipsis [&_thead_th]:relative [&_thead_th:not(:last-child)]:after:absolute [&_thead_th:not(:last-child)]:after:right-0 [&_thead_th:not(:last-child)]:after:top-1/2 [&_thead_th:not(:last-child)]:after:h-4 [&_thead_th:not(:last-child)]:after:w-px [&_thead_th:not(:last-child)]:after:-translate-y-1/2 [&_thead_th:not(:last-child)]:after:bg-line [&_thead_th:not(:last-child)]:after:content-['']";

/** 详情页表格：末行保留底线，与右对齐分页衔接。 */
export const DETAIL_QUERY_TABLE_CLASS = `${QUERY_TABLE_CLASS} [&_tbody_tr:last-child>td]:border-b [&_tbody_tr:last-child>td]:border-line`;
