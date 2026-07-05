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

export const updateUserSchema = z.object({
  name: z.string().min(1, "姓名不能为空").max(50, "姓名过长").optional(),
  displayName: z.string().min(1).max(50).optional(),
  phone: phoneSchema,
  email: z.string().email().optional(),
  status: statusSchema.optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(8).max(128),
  newPassword: z.string().min(8).max(128),
});

export const loginLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LoginLogListQuery = z.infer<typeof loginLogListQuerySchema>;
