import { okEnvelope } from "~/lib/openapi/dtos";
import { serviceHealthSchema } from "~/lib/openapi/dtos";
import { registry } from "~/lib/openapi/registry";

registry.registerPath({
  method: "get",
  path: "/api/health",
  operationId: "getHealth",
  summary: "服务存活探测",
  tags: ["health"],
  security: [],
  responses: {
    200: {
      description: "服务存活",
      content: { "application/json": { schema: okEnvelope("Health", serviceHealthSchema) } },
    },
  },
});
