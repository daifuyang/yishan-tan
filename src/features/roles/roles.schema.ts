import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

/**
 * 数据权限范围
 * 1-全部数据 / 2-本部门数据 / 3-本部门及子部门数据 / 4-仅本人数据 / 5-自定义数据
 */
export const dataScopeSchema = z.enum(["1", "2", "3", "4", "5"]);

export const createRoleSchema = z.object({
  name: z.string().min(1, "角色名称不能为空").max(50, "角色名称最多 50 字"),
  description: z.string().max(200).optional(),
  status: statusSchema.default("enabled"),
  dataScope: dataScopeSchema.default("1"),
  menuIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1, "角色名称不能为空").max(50, "角色名称最多 50 字").optional(),
  description: z.string().max(200).optional(),
  status: statusSchema.optional(),
  dataScope: dataScopeSchema.optional(),
  menuIds: z.array(z.string().uuid()).optional(),
});

export const roleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: statusSchema.optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleListQuery = z.infer<typeof roleListQuerySchema>;
export type DataScope = z.infer<typeof dataScopeSchema>;
