/**
 * /api/uploads —— 文件上传（admin）与探活。
 */
import { z } from "zod";
import { attachmentDtoSchema, okEnvelope } from "~/lib/openapi/dtos";
import { useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

registry.registerPath({
  method: "post",
  path: "/api/uploads",
  operationId: "uploadFile",
  summary: "上传文件到默认存储（admin）。multipart/form-data，字段 file",
  tags: ["uploads"],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: z.object({
            file: z.string().openapi({ format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "上传成功，返回附件 DTO",
      content: {
        "application/json": { schema: okEnvelope("UploadedAttachment", attachmentDtoSchema) },
      },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/uploads",
  operationId: "checkUploadHealth",
  summary: "探活端点。任何已鉴权用户调用，返回 ok=true 表示鉴权链可达",
  tags: ["uploads"],
  security: [],
  responses: {
    200: {
      description: "鉴权链正常",
      content: {
        "application/json": {
          schema: okEnvelope("UploadHealth", z.object({ ok: z.literal(true) })),
        },
      },
    },
    401: {
      description: "未鉴权（UNAUTHENTICATED）",
      content: {
        "application/json": { schema: z.object({ ok: z.literal(false), code: z.string() }) },
      },
    },
  },
});
