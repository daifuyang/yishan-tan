import { z } from "zod";

export const systemOptionKeySchema = z
  .string()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9_.-]+$/, "仅允许小写字母、数字、下划线、点、中划线");

export const setSystemOptionSchema = z.object({
  value: z.string(),
  description: z.string().max(200).optional(),
});

export const batchSetSystemOptionSchema = z.object({
  items: z
    .array(
      z.object({
        key: systemOptionKeySchema,
        value: z.string(),
        description: z.string().max(200).optional(),
      }),
    )
    .min(1)
    .max(100),
});

/**
 * 系统选项分组代码 schema。仅允许小写字母数字与下划线，避免与 key 规则冲突。
 */
export const systemOptionGroupCodeSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9_]+$/, "分组 code 仅允许小写字母、数字、下划线");

export type SetSystemOptionInput = z.infer<typeof setSystemOptionSchema>;
export type BatchSetSystemOptionInput = z.infer<typeof batchSetSystemOptionSchema>;
