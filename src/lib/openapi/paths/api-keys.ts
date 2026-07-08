/**
 * /api/v1/api-keys —— 固定 API key 管理。
 */
import { z } from "zod";
import { apiKeyCreateResponseSchema, apiKeyDtoSchema, okEnvelope } from "~/lib/openapi/dtos";
import { useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");
const createApiKeyInputSchema = z.object({ name: z.string().max(50).optional() });

// GET /api/v1/api-keys —— 列出当前用户的 key（不含明文）
registry.registerPath({
  method: "get",
  path: "/api/v1/api-keys",
  operationId: "listApiKeys",
  summary: "列出当前用户的所有 API key",
  tags: ["api-keys"],
  responses: {
    200: {
      description: "API key 列表（不含明文）",
      content: {
        "application/json": {
          schema: okEnvelope("ApiKeyList", z.object({ items: z.array(apiKeyDtoSchema) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});

// POST /api/v1/api-keys —— 创建新 key（明文只返回一次）
registry.registerPath({
  method: "post",
  path: "/api/v1/api-keys",
  operationId: "createApiKey",
  summary: "创建新 API key。明文只返回一次，请立刻保存到本地",
  tags: ["api-keys"],
  request: {
    body: { content: { "application/json": { schema: createApiKeyInputSchema } } },
  },
  responses: {
    201: {
      description: "创建成功，key 字段是明文（仅此一次），apiKey 字段是脱敏后的记录",
      content: {
        "application/json": { schema: okEnvelope("CreatedApiKey", apiKeyCreateResponseSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

// DELETE /api/v1/api-keys/{id} —— 撤销 key
registry.registerPath({
  method: "delete",
  path: "/api/v1/api-keys/{id}",
  operationId: "deleteApiKey",
  summary: "撤销（删除）一个 API key",
  tags: ["api-keys"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "撤销成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedApiKey", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
