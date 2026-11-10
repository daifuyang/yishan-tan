/**
 * /api/v1/position —— 岗位管理（操作权限）。
 */
import { z } from "zod";
import {
  createPostSchema,
  postListQuerySchema,
  updatePostSchema,
} from "~/features/posts/posts.schema";
import { okEnvelope, postDtoSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

registry.registerPath({
  method: "get",
  path: "/api/v1/position",
  operationId: "listPosts",
  summary: "分页列出岗位（posts:read）",
  tags: ["posts"],
  request: { query: postListQuerySchema },
  responses: {
    200: {
      description: "分页岗位列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(postDtoSchema).openapi("PostPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/position",
  operationId: "createPost",
  summary: "创建岗位（posts:create）",
  tags: ["posts"],
  request: { body: { content: { "application/json": { schema: createPostSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: { "application/json": { schema: okEnvelope("CreatedPost", postDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/position/{id}",
  operationId: "updatePost",
  summary: "更新岗位（posts:update）",
  tags: ["posts"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updatePostSchema } } },
  },
  responses: {
    200: {
      description: "更新后的岗位",
      content: { "application/json": { schema: okEnvelope("UpdatedPost", postDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/position/{id}",
  operationId: "deletePost",
  summary: "删除岗位（posts:delete）",
  tags: ["posts"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedPost", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
