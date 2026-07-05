import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

export const createDictTypeSchema = z.object({
  name: z.string().min(1).max(50),
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_.-]+$/, "仅允许小写字母、数字、下划线、点、中划线"),
  description: z.string().max(200).optional(),
  status: statusSchema.default("enabled"),
});

export const updateDictTypeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  status: statusSchema.optional(),
});

export const dictTypeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: statusSchema.optional(),
});

export const createDictDataSchema = z.object({
  typeCode: z.string().min(2).max(50),
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(200),
  sort: z.number().int().min(0).max(9999).default(0),
  status: statusSchema.default("enabled"),
  extra: z.string().optional(),
});

export const updateDictDataSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  value: z.string().min(1).max(200).optional(),
  sort: z.number().int().min(0).max(9999).optional(),
  status: statusSchema.optional(),
  extra: z.string().optional(),
});

export const dictDataListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  typeCode: z.string().optional(),
  status: statusSchema.optional(),
});

export type CreateDictTypeInput = z.infer<typeof createDictTypeSchema>;
export type UpdateDictTypeInput = z.infer<typeof updateDictTypeSchema>;
export type DictTypeListQuery = z.infer<typeof dictTypeListQuerySchema>;
export type CreateDictDataInput = z.infer<typeof createDictDataSchema>;
export type UpdateDictDataInput = z.infer<typeof updateDictDataSchema>;
export type DictDataListQuery = z.infer<typeof dictDataListQuerySchema>;
