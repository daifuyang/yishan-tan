/**
 * /api/v1/system-options —— 系统键值配置（admin）。
 */
import { z } from "zod";
import {
  batchSetSystemOptionSchema,
  setSystemOptionSchema,
} from "~/features/system-settings/system-settings.schema";
import {
  batchSetSystemOptionResponseSchema,
  okEnvelope,
  systemOptionDtoSchema,
} from "~/lib/openapi/dtos";
import { useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const keyParamSchema = z
  .object({
    key: z.string().regex(/^[a-z0-9_.-]+$/, "仅允许小写字母、数字、下划线、点、中划线"),
  })
  .openapi("SystemOptionKeyParam");

const batchGetInputSchema = z.object({ keys: z.array(z.string()).max(100) });

registry.registerPath({
  method: "post",
  path: "/api/v1/system-options",
  operationId: "batchGetSystemOptions",
  summary: "批量获取系统配置（admin）。keys 最多 100 个",
  tags: ["system-options"],
  request: { body: { content: { "application/json": { schema: batchGetInputSchema } } } },
  responses: {
    200: {
      description: "匹配的系统配置列表",
      content: {
        "application/json": {
          schema: okEnvelope(
            "SystemOptionsBatchGet",
            z.object({ items: z.array(systemOptionDtoSchema) }),
          ),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/system-options/batch",
  operationId: "batchSetSystemOptions",
  summary: "批量设置（upsert）系统配置（admin）。items 最多 100",
  tags: ["system-options"],
  request: {
    body: { content: { "application/json": { schema: batchSetSystemOptionSchema } } },
  },
  responses: {
    200: {
      description: "逐项设置结果汇总",
      content: {
        "application/json": {
          schema: okEnvelope("SystemOptionsBatchSet", batchSetSystemOptionResponseSchema),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/system-options/{key}",
  operationId: "getSystemOption",
  summary: "获取单个系统配置（admin）",
  tags: ["system-options"],
  request: { params: keyParamSchema },
  responses: {
    200: {
      description: "系统配置；不存在时 data 为 null",
      content: {
        "application/json": {
          schema: okEnvelope("SystemOptionGet", systemOptionDtoSchema.nullable()),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "put",
  path: "/api/v1/system-options/{key}",
  operationId: "setSystemOption",
  summary: "设置（upsert）单个系统配置（admin）",
  tags: ["system-options"],
  request: {
    params: keyParamSchema,
    body: { content: { "application/json": { schema: setSystemOptionSchema } } },
  },
  responses: {
    200: {
      description: "设置后的系统配置",
      content: {
        "application/json": { schema: okEnvelope("SystemOptionSet", systemOptionDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});
