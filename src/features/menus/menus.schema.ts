import { z } from "zod";

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
  sort: z.number().int().min(0).max(9999).optional(),
  status: statusSchema.optional(),
});

export const menuListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: statusSchema.optional(),
  type: menuTypeSchema.optional(),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type MenuListQuery = z.infer<typeof menuListQuerySchema>;
