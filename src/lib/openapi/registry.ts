/**
 * OpenAPI registry —— 所有路径与 schema 注册中心。
 *
 * 用法：
 *   import { registry } from "~/lib/openapi/registry";
 *   const createUserInput = createUserSchema.openapi("CreateUserInput");
 *   registry.registerPath({ method: "post", path: "/api/v1/users", ... });
 *
 * scripts/generate-openapi.ts 负责把 `registry.definitions` 序列化成 openapi.generated.json。
 * 不要在这里 import 任何业务模块（保持基础设施洁净）。
 */
import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();
