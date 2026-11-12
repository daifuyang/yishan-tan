/**
 * /api/v1/portal-templates —— 门户模板（admin）。type 区分文章模板 / 页面模板。
 */
import { z } from "zod";
import {
  createPortalTemplateSchema,
  portalTemplateListQuerySchema,
  updatePortalTemplateSchema,
} from "~/features/portal-content/portal-content.schema";
import { okEnvelope, portalTemplateDtoSchema, portalTemplateJsonSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("PortalTemplateIdParam");

/**
 * 请求体用 OpenAPI 侧的形状：把 feature schema 里的 `schema` / `config`
 * 换成注册好的 `PortalTemplateJson` 组件（$ref）。
 *
 * 直接用 feature schema 会把递归 Zod 内联进请求体，zod-to-openapi 生成时无限
 * 递归爆栈；其余字段保持一致，feature 侧改动时同步这里。
 */
const createPortalTemplateBodySchema = z
  .object({
    ...createPortalTemplateSchema.shape,
    schema: portalTemplateJsonSchema.optional(),
    config: portalTemplateJsonSchema.optional(),
  })
  .openapi("CreatePortalTemplate");

const updatePortalTemplateBodySchema = z
  .object({
    ...updatePortalTemplateSchema.shape,
    schema: portalTemplateJsonSchema.optional(),
    config: portalTemplateJsonSchema.optional(),
  })
  .openapi("UpdatePortalTemplate");

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-templates",
  operationId: "listPortalTemplates",
  summary: "分页列出门户模板（admin）。可按 type 过滤文章模板 / 页面模板",
  tags: ["portal-templates"],
  request: { query: portalTemplateListQuerySchema },
  responses: {
    200: {
      description: "分页模板列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(portalTemplateDtoSchema).openapi("PortalTemplatePage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/portal-templates",
  operationId: "createPortalTemplate",
  summary: "创建门户模板（admin）",
  tags: ["portal-templates"],
  request: {
    body: { content: { "application/json": { schema: createPortalTemplateBodySchema } } },
  },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": {
          schema: okEnvelope("CreatedPortalTemplate", portalTemplateDtoSchema),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-templates/{id}",
  operationId: "getPortalTemplate",
  summary: "门户模板详情（admin）",
  tags: ["portal-templates"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "模板详情",
      content: {
        "application/json": { schema: okEnvelope("PortalTemplate", portalTemplateDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/portal-templates/{id}",
  operationId: "updatePortalTemplate",
  summary: "更新门户模板（admin）",
  tags: ["portal-templates"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updatePortalTemplateBodySchema } } },
  },
  responses: {
    200: {
      description: "更新后的模板",
      content: {
        "application/json": {
          schema: okEnvelope("UpdatedPortalTemplate", portalTemplateDtoSchema),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/portal-templates/{id}",
  operationId: "deletePortalTemplate",
  summary: "删除门户模板（admin）。系统默认模板不允许删除",
  tags: ["portal-templates"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedPortalTemplate", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
