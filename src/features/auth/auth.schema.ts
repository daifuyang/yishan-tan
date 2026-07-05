import { z } from "zod";

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;
const PHONE_PATTERN = /^\+?\d{6,20}$/;

export const accountSchema = z
  .string()
  .min(3, "账号至少 3 个字符")
  .max(128, "账号过长")
  .refine(
    (value) => {
      if (value.includes("@")) {
        return z.string().email().safeParse(value).success;
      }
      return USERNAME_PATTERN.test(value);
    },
    { message: "请输入有效邮箱或用户名（3-30 位字母/数字/下划线/短横线）" },
  );

export const createSessionSchema = z.object({
  account: accountSchema,
  password: z.string().min(8, "密码至少 8 位"),
});

export const phoneSchema = z
  .string()
  .trim()
  .max(20, "手机号过长")
  .regex(PHONE_PATTERN, "手机号格式不正确")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createUserSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(30, "用户名最多 30 个字符")
    .regex(USERNAME_PATTERN, "仅允许字母、数字、下划线、短横线"),
  password: z.string().min(8, "密码至少 8 位").max(128, "密码最多 128 位"),
  name: z.string().min(1, "姓名不能为空").max(50, "姓名过长").optional(),
  displayName: z.string().max(50).optional(),
  phone: phoneSchema,
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
