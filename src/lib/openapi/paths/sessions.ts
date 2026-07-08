/**
 * /api/v1/sessions —— 登录/登出。
 */
import { z } from "zod";
import { createSessionSchema } from "~/features/auth/auth.schema";
import { okEnvelope } from "~/lib/openapi/dtos";
import { sessionEnvelopeSchema } from "~/lib/openapi/dtos";
import { useErrorResponses } from "~/lib/openapi/envelope";
import { registry } from "~/lib/openapi/registry";

registry.registerPath({
  method: "post",
  path: "/api/v1/sessions",
  operationId: "createSession",
  summary: "登录（账号+密码），下发 session cookie",
  tags: ["sessions"],
  security: [],
  request: { body: { content: { "application/json": { schema: createSessionSchema } } } },
  responses: {
    201: {
      description: "登录成功，Set-Cookie 头会下发 session",
      content: { "application/json": { schema: okEnvelope("Session", sessionEnvelopeSchema) } },
    },
    ...useErrorResponses(),
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/v1/sessions",
  operationId: "deleteSession",
  summary: "登出，清除当前 session",
  tags: ["sessions"],
  responses: {
    200: {
      description: "登出成功",
      content: {
        "application/json": {
          schema: okEnvelope("DeleteSession", z.object({ ok: z.literal(true) })),
        },
      },
    },
    ...useErrorResponses(),
  },
});
