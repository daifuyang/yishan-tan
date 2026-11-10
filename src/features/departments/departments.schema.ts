import { z } from "zod";

import { sortOrderSchema } from "~/lib/list-sort";

export const statusSchema = z.enum(["enabled", "disabled"]);

/** 可排序列白名单（服务端按此映射到数据库列）。 */
export const departmentSortBySchema = z.enum(["createdAt", "updatedAt", "name", "sort", "status"]);

export const createDepartmentSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50),
  leaderId: z.string().uuid().nullable().optional(),
  sort: z.number().int().min(0).max(9999).default(0),
  status: statusSchema.default("enabled"),
});

export const updateDepartmentSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50).optional(),
  leaderId: z.string().uuid().nullable().optional(),
  sort: z.number().int().min(0).max(9999).optional(),
  status: statusSchema.optional(),
});

export const departmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  name: z.string().trim().optional(),
  status: statusSchema.optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）；缺省按 sort 升序、创建时间升序。 */
  sortBy: departmentSortBySchema.optional(),
  /** 排序方向；缺省升序。 */
  sortOrder: sortOrderSchema.optional(),
});

/** 部门树查询参数（只带排序，筛选在页面侧做）。 */
export const departmentTreeQuerySchema = z.object({
  sortBy: departmentSortBySchema.optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;
export type DepartmentSortBy = NonNullable<DepartmentListQuery["sortBy"]>;
export type DepartmentTreeQuery = z.infer<typeof departmentTreeQuerySchema>;
