import { z } from "zod";
import { permissionCodesSchema } from "~/features/permissions/permissions.schema";
import { sortOrderSchema } from "~/lib/list-sort";

export const menuTypeSchema = z.enum(["group", "menu", "action"]);
export const statusSchema = z.enum(["enabled", "disabled"]);

export const createMenuSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50),
  path: z.string().max(200).optional(),
  component: z.string().max(200).optional(),
  icon: z.string().max(50).optional(),
  type: menuTypeSchema.default("menu"),
  permission: z.string().max(100).optional(),
  permissionCodes: permissionCodesSchema.optional(),
  sort: z.number().int().min(0).max(9999).default(0),
  status: statusSchema.default("enabled"),
});

export const updateMenuSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50).optional(),
  path: z.string().max(200).optional(),
  component: z.string().max(200).optional(),
  icon: z.string().max(50).optional(),
  type: menuTypeSchema.optional(),
  permission: z.string().max(100).optional(),
  permissionCodes: permissionCodesSchema.optional(),
  sort: z.number().int().min(0).max(9999).optional(),
  status: statusSchema.optional(),
});

export const menuListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: statusSchema.optional(),
  type: menuTypeSchema.optional(),
  /** 可排序列（白名单，服务端按此映射到数据库列）；缺省按菜单 sort 升序。 */
  sortBy: z.enum(["sort", "name", "path", "createdAt", "updatedAt"]).optional(),
  /** 排序方向；缺省沿用菜单现有默认顺序（升序）。 */
  sortOrder: sortOrderSchema.optional(),
});

/** 菜单树查询参数（列表页按表头排序时透传给树接口）。 */
export const menuTreeQuerySchema = z.object({
  sortBy: z.enum(["sort", "name", "path", "createdAt", "updatedAt"]).optional(),
  sortOrder: sortOrderSchema.optional(),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type MenuListQuery = z.infer<typeof menuListQuerySchema>;
export type MenuSortBy = NonNullable<MenuListQuery["sortBy"]>;
export type MenuTreeQuery = z.infer<typeof menuTreeQuerySchema>;
