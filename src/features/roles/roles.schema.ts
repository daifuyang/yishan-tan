import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  status: statusSchema.default("enabled"),
  menuIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  status: statusSchema.optional(),
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
