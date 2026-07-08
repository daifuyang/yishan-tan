/**
 * OpenAPI 共享响应壳 + 错误码定义。
 *
 * 形状跟 src/server/http.ts 的 ok() / page() / handleApiError() 完全对齐：
 *   成功     → { ok: true, data }
 *   分页     → { ok: true, data: { items }, meta: { total, page, pageSize } }
 *   错误     → { ok: false, code, error, details? }
 *
 * 错误码来自 src/lib/errors.ts 的 Errors.* 工厂；保持两处对齐，便于
 * 一旦 Errors 加新工厂就能立刻在 OpenAPI 描述里反映出来。
 */
import { z } from "zod";

export const statusSchema = z.enum(["enabled", "disabled"]);
export const systemRoleSchema = z.enum(["admin", "member"]);
export const menuTypeSchema = z.enum(["group", "menu", "action"]);
export const loginLogStatusSchema = z.string();

/** 通用分页元数据。 */
export const pageMetaSchema = z
  .object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  })
  .openapi("PageMeta");

/** 通用分页响应壳。 */
export const pageEnvelopeSchema = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      ok: z.literal(true),
      data: z.object({ items: z.array(item) }),
      meta: pageMetaSchema,
    })
    .openapi(`PageEnvelopeOf${item.description ?? "Item"}`);

/** 通用成功响应壳。 */
export const okEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z
    .object({
      ok: z.literal(true),
      data,
    })
    .openapi(`OkEnvelopeOf${data.description ?? "Data"}`);

/** 错误响应壳。details 由各 Errors.* 决定（INVALID 时是 ZodIssue[]，RATE_LIMITED 时是 { resetAt }）。 */
export const errorEnvelopeSchema = z
  .object({
    ok: z.literal(false),
    code: z.string(),
    error: z.string(),
    details: z.unknown().optional(),
  })
  .openapi("ErrorEnvelope");

/**
 * 跟 src/lib/errors.ts 一一对应的 4xx/5xx 响应。
 * 任何 registerPath 都可以直接展开 useErrorResponses() 到 responses 里。
 */
export function useErrorResponses() {
  return {
    400: {
      description: "请求参数不合法 (INVALID)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
    401: {
      description: "未登录或 session/apiKey 无效 (UNAUTHENTICATED / INVALID_CREDENTIALS)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
    403: {
      description: "权限不足 (FORBIDDEN)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
    404: {
      description: "资源不存在 (NOT_FOUND)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
    409: {
      description: "资源冲突，例如重复 / 有关联数据 (CONFLICT)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
    429: {
      description: "请求过于频繁 (RATE_LIMITED)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
    500: {
      description: "服务暂时不可用 (INTERNAL)",
      content: { "application/json": { schema: errorEnvelopeSchema } },
    },
  };
}
