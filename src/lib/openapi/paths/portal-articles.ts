/**
 * /api/v1/portal-articles —— 门户内容文章（admin）。
 */
import { z } from "zod";
import {
  createPortalArticleSchema,
  portalArticleListQuerySchema,
  updatePortalArticleSchema,
} from "~/features/portal-content/portal-content.schema";
import { okEnvelope, portalArticleDtoSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("PortalArticleIdParam");

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-articles",
  operationId: "listPortalArticles",
  summary: "分页列出门户文章（admin）。支持标题 / 状态 / 分类过滤",
  tags: ["portal-articles"],
  request: { query: portalArticleListQuerySchema },
  responses: {
    200: {
      description: "分页文章列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(portalArticleDtoSchema).openapi("PortalArticlePage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/portal-articles",
  operationId: "createPortalArticle",
  summary: "创建门户文章（admin）",
  tags: ["portal-articles"],
  request: {
    body: { content: { "application/json": { schema: createPortalArticleSchema } } },
  },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": { schema: okEnvelope("CreatedPortalArticle", portalArticleDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/portal-articles/{id}",
  operationId: "getPortalArticle",
  summary: "门户文章详情（admin）",
  tags: ["portal-articles"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "文章详情",
      content: {
        "application/json": { schema: okEnvelope("PortalArticle", portalArticleDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/portal-articles/{id}",
  operationId: "updatePortalArticle",
  summary: "更新门户文章（admin）。categoryIds 全量覆盖",
  tags: ["portal-articles"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updatePortalArticleSchema } } },
  },
  responses: {
    200: {
      description: "更新后的文章",
      content: {
        "application/json": { schema: okEnvelope("UpdatedPortalArticle", portalArticleDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/portal-articles/{id}/publish",
  operationId: "publishPortalArticle",
  summary: "发布门户文章（admin）。置为已发布并写入发布时间",
  tags: ["portal-articles"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "已发布",
      content: {
        "application/json": {
          schema: okEnvelope("PublishedPortalArticle", portalArticleDtoSchema),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/portal-articles/{id}",
  operationId: "deletePortalArticle",
  summary: "删除门户文章（admin）。软删除",
  tags: ["portal-articles"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedPortalArticle", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
