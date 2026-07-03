import { z } from "zod";

export const createSessionSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
});

export const createUserSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(30, "用户名最多 30 个字符")
    .regex(/^[a-zA-Z0-9_-]+$/, "仅允许字母、数字、下划线、短横线"),
  password: z.string().min(8, "密码至少 8 位").max(128, "密码最多 128 位"),
  displayName: z.string().max(50).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
