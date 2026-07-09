import { z } from "zod";

const PHONE_PATTERN = /^\+?\d{6,20}$/;

export const statusSchema = z.enum(["enabled", "disabled"]);

export const phoneSchema = z
  .string()
  .trim()
  .max(20, "手机号过长")
  .regex(PHONE_PATTERN, "手机号格式不正确")
  .optional()
  .or(z.literal("").transform(() => undefined));

const SEARCH_TERM = z.string().trim().optional();

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  username: SEARCH_TERM,
  name: SEARCH_TERM,
  displayName: SEARCH_TERM,
  email: SEARCH_TERM,
  phone: SEARCH_TERM,
  status: z.enum(["enabled", "disabled"]).optional(),
  systemRole: z.enum(["admin", "member"]).optional(),
  roleId: z.string().uuid().optional(),
});

export const genderSchema = z.enum(["male", "female", "other"]);

export const updateUserSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(50, "姓名过长").optional(),
  displayName: z.string().min(1).max(50).optional(),
  phone: phoneSchema,
  email: z.string().email().optional(),
  status: statusSchema.optional(),
  deptId: z.string().uuid().nullable().optional(),
  postIds: z.array(z.string().uuid()).optional(),
  gender: genderSchema.nullable().optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
    .nullable()
    .optional(),
  remark: z.string().max(500, "备注不超过 500 字").nullable().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
});

export const loginLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type LoginLogListQuery = z.infer<typeof loginLogListQuerySchema>;
