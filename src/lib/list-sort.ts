import { z } from "zod";

/**
 * 列表排序方向。
 *
 * 表格组件（表头箭头）与列表查询参数（sortOrder）共用这一套取值，
 * 避免 UI 层和 API 层各说一套。
 */
export const sortOrderSchema = z.enum(["asc", "desc"]);

export type SortOrder = z.infer<typeof sortOrderSchema>;
