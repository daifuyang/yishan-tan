/**
 * /api/v1/portal-categories —— 门户内容分类（admin）。
 */
import { z } from "zod";
import {
  createPortalCategorySchema,
  portalCategoryListQuerySchema,
  updatePortalCategorySchema,
} from "~/features/portal-content/portal-content.schema";
import { okEnvelope, portalCategoryDtoSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("PortalCategoryIdParam");

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-categories",
  operationId: "listPortalCategories",
  summary: "分页列出门户内容分类（admin）。支持名称 / 状态 / 上级分类过滤",
  tags: ["portal-categories"],
  request: { query: portalCategoryListQuerySchema },
  responses: {
    200: {
      description: "分页分类列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(portalCategoryDtoSchema).openapi("PortalCategoryPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/portal-categories",
  operationId: "createPortalCategory",
  summary: "创建门户内容分类（admin）",
  tags: ["portal-categories"],
  request: {
    body: { content: { "application/json": { schema: createPortalCategorySchema } } },
  },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": {
          schema: okEnvelope("CreatedPortalCategory", portalCategoryDtoSchema),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-categories/{id}",
  operationId: "getPortalCategory",
  summary: "门户内容分类详情（admin）",
  tags: ["portal-categories"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "分类详情",
      content: {
        "application/json": { schema: okEnvelope("PortalCategory", portalCategoryDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/portal-categories/{id}",
  operationId: "updatePortalCategory",
  summary: "更新门户内容分类（admin）",
  tags: ["portal-categories"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updatePortalCategorySchema } } },
  },
  responses: {
    200: {
      description: "更新后的分类",
      content: {
        "application/json": {
          schema: okEnvelope("UpdatedPortalCategory", portalCategoryDtoSchema),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/portal-categories/{id}",
  operationId: "deletePortalCategory",
  summary: "删除门户内容分类（admin）。存在子分类时不允许删除",
  tags: ["portal-categories"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedPortalCategory", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
