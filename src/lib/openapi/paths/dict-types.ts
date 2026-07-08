/**
 * /api/v1/dict-types —— 字典类型（admin）。
 */
import { z } from "zod";
import {
  createDictTypeSchema,
  dictTypeListQuerySchema,
  updateDictTypeSchema,
} from "~/features/dicts/dicts.schema";
import { dictTypeDtoSchema, dictTypeListItemDtoSchema, okEnvelope } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

registry.registerPath({
  method: "get",
  path: "/api/v1/dict-types",
  operationId: "listDictTypes",
  summary: "分页列出字典类型（admin）",
  tags: ["dict-types"],
  request: { query: dictTypeListQuerySchema },
  responses: {
    200: {
      description: "分页字典类型列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(dictTypeListItemDtoSchema).openapi("DictTypePage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/dict-types",
  operationId: "createDictType",
  summary: "创建字典类型（admin）",
  tags: ["dict-types"],
  request: { body: { content: { "application/json": { schema: createDictTypeSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": { schema: okEnvelope("CreatedDictType", dictTypeDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/dict-types/{id}",
  operationId: "getDictType",
  summary: "字典类型详情（admin）",
  tags: ["dict-types"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "字典类型详情",
      content: {
        "application/json": { schema: okEnvelope("DictTypeDetail", dictTypeDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/dict-types/{id}",
  operationId: "updateDictType",
  summary: "更新字典类型（admin）",
  tags: ["dict-types"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateDictTypeSchema } } },
  },
  responses: {
    200: {
      description: "更新后的字典类型",
      content: {
        "application/json": { schema: okEnvelope("UpdatedDictType", dictTypeDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/dict-types/{id}",
  operationId: "deleteDictType",
  summary: "删除字典类型（admin）",
  tags: ["dict-types"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedDictType", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
