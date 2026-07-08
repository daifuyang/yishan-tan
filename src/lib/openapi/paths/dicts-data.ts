/**
 * /api/v1/dicts-data —— 字典条目（admin）。
 */
import { z } from "zod";
import {
  createDictDataSchema,
  dictDataListQuerySchema,
  updateDictDataSchema,
} from "~/features/dicts/dicts.schema";
import { dictDataDtoSchema, okEnvelope } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

registry.registerPath({
  method: "get",
  path: "/api/v1/dicts-data",
  operationId: "listDictData",
  summary: "分页列出字典条目（admin）",
  tags: ["dicts-data"],
  request: { query: dictDataListQuerySchema },
  responses: {
    200: {
      description: "分页字典条目",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(dictDataDtoSchema).openapi("DictDataPage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/dicts-data",
  operationId: "createDictData",
  summary: "创建字典条目（admin）。typeCode 必须已存在",
  tags: ["dicts-data"],
  request: { body: { content: { "application/json": { schema: createDictDataSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: { "application/json": { schema: okEnvelope("CreatedDictData", dictDataDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/dicts-data/{id}",
  operationId: "getDictData",
  summary: "字典条目详情（admin）",
  tags: ["dicts-data"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "字典条目详情",
      content: { "application/json": { schema: okEnvelope("DictDataDetail", dictDataDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/dicts-data/{id}",
  operationId: "updateDictData",
  summary: "更新字典条目（admin）",
  tags: ["dicts-data"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateDictDataSchema } } },
  },
  responses: {
    200: {
      description: "更新后的字典条目",
      content: { "application/json": { schema: okEnvelope("UpdatedDictData", dictDataDtoSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/dicts-data/{id}",
  operationId: "deleteDictData",
  summary: "删除字典条目（admin）",
  tags: ["dicts-data"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedDictData", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
