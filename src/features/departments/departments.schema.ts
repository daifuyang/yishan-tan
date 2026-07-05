import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

export const createDepartmentSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_.-]+$/, "仅允许小写字母、数字、下划线、点、中划线"),
  sort: z.number().int().min(0).max(9999).default(0),
  status: statusSchema.default("enabled"),
});

export const updateDepartmentSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(50).optional(),
  sort: z.number().int().min(0).max(9999).optional(),
  status: statusSchema.optional(),
});

export const departmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: statusSchema.optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type DepartmentListQuery = z.infer<typeof departmentListQuerySchema>;
