/**
 * /api/v1/portal-pages —— 门户内容页面（admin）。
 */
import { z } from "zod";
import {
  createPortalPageSchema,
  portalPageListQuerySchema,
  updatePortalPageSchema,
} from "~/features/portal-content/portal-content.schema";
import { okEnvelope, portalPageDtoSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("PortalPageIdParam");

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-pages",
  operationId: "listPortalPages",
  summary: "分页列出门户页面（admin）。支持标题 / 路径 / 状态过滤",
  tags: ["portal-pages"],
  request: { query: portalPageListQuerySchema },
  responses: {
    200: {
      description: "分页页面列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(portalPageDtoSchema).openapi("PortalPagePage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/portal-pages",
  operationId: "createPortalPage",
  summary: "创建门户页面（admin）",
  tags: ["portal-pages"],
  request: { body: { content: { "application/json": { schema: createPortalPageSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": { schema: okEnvelope("CreatedPortalPage", portalPageDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-pages/{id}",
  operationId: "getPortalPage",
  summary: "门户页面详情（admin）",
  tags: ["portal-pages"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "页面详情",
      content: {
        "application/json": { schema: okEnvelope("PortalPage", portalPageDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/portal-pages/{id}",
  operationId: "updatePortalPage",
  summary: "更新门户页面（admin）",
  tags: ["portal-pages"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updatePortalPageSchema } } },
  },
  responses: {
    200: {
      description: "更新后的页面",
      content: {
        "application/json": { schema: okEnvelope("UpdatedPortalPage", portalPageDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/portal-pages/{id}",
  operationId: "deletePortalPage",
  summary: "删除门户页面（admin）。软删除",
  tags: ["portal-pages"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedPortalPage", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
