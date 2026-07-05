import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);

export const createPostSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(50, "名称过长"),
  departmentId: z.string().uuid({ message: "请选择部门" }),
  sort: z.number().int().min(0).max(9999).default(0),
  status: statusSchema.default("enabled"),
});

export const updatePostSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(50, "名称过长").optional(),
  departmentId: z.string().uuid({ message: "请选择部门" }).optional(),
  sort: z.number().int().min(0).max(9999).optional(),
  status: statusSchema.optional(),
});

export const postListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  sortMin: z.coerce.number().int().min(0).optional(),
  status: statusSchema.optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostListQuery = z.infer<typeof postListQuerySchema>;
