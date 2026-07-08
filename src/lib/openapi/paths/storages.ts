/**
 * /api/v1/storages —— 存储驱动配置（admin）。
 */
import { z } from "zod";
import {
  createStorageSchema,
  storageListQuerySchema,
  updateStorageSchema,
} from "~/features/storages/storages.schema";
import { okEnvelope, storageDetailDtoSchema, storageDtoSchema } from "~/lib/openapi/dtos";
import { pageEnvelopeSchema, useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

const idParamSchema = z.object({ id: z.string().uuid() }).openapi("IdParamUuid");

registry.registerPath({
  method: "get",
  path: "/api/v1/storages",
  operationId: "listStorages",
  summary: "分页列出存储配置（admin）。config 字段已 redact 敏感值",
  tags: ["storages"],
  request: { query: storageListQuerySchema },
  responses: {
    200: {
      description: "分页存储列表",
      content: {
        "application/json": {
          schema: pageEnvelopeSchema(storageDtoSchema).openapi("StoragePage"),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/storages",
  operationId: "createStorage",
  summary: "创建存储配置（admin）。config 按 driver 子 schema 二次校验",
  tags: ["storages"],
  request: { body: { content: { "application/json": { schema: createStorageSchema } } } },
  responses: {
    201: {
      description: "创建成功",
      content: {
        "application/json": { schema: okEnvelope("CreatedStorage", storageDetailDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/storages/{id}",
  operationId: "getStorage",
  summary: "存储详情（admin）",
  tags: ["storages"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "存储详情（含 redact 后的 config）",
      content: {
        "application/json": { schema: okEnvelope("StorageDetail", storageDetailDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/v1/storages/{id}",
  operationId: "updateStorage",
  summary: "更新存储配置（admin）",
  tags: ["storages"],
  request: {
    params: idParamSchema,
    body: { content: { "application/json": { schema: updateStorageSchema } } },
  },
  responses: {
    200: {
      description: "更新后的存储",
      content: {
        "application/json": { schema: okEnvelope("UpdatedStorage", storageDetailDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/storages/{id}",
  operationId: "deleteStorage",
  summary: "删除存储配置（admin）。默认存储不能删",
  tags: ["storages"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "删除成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeletedStorage", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/storages/{id}/default",
  operationId: "setDefaultStorage",
  summary: "把指定存储设为系统默认（admin）",
  tags: ["storages"],
  request: { params: idParamSchema },
  responses: {
    200: {
      description: "已设为默认",
      content: {
        "application/json": { schema: okEnvelope("DefaultStorage", storageDetailDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});
