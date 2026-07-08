/**
 * 把 src/lib/openapi/paths/*.ts 里注册的所有路径与 schema
 * 聚合成 openapi.generated.json 写到仓库根。
 *
 * 在 prebuild / dev 时自动跑（见 package.json scripts）。
 * 跑完会校验 operationId 是否唯一且全部手写——防止有人漏写让 zod-to-openapi 自动生成。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "../src/lib/openapi/registry";

// 副作用导入：每个文件顶层都会执行 registry.registerPath / register
import "../src/lib/openapi/paths/health";
import "../src/lib/openapi/paths/uploads";
import "../src/lib/openapi/paths/sessions";
import "../src/lib/openapi/paths/users";
import "../src/lib/openapi/paths/api-keys";
import "../src/lib/openapi/paths/roles";
import "../src/lib/openapi/paths/menus";
import "../src/lib/openapi/paths/departments";
import "../src/lib/openapi/paths/dict-types";
import "../src/lib/openapi/paths/dicts-data";
import "../src/lib/openapi/paths/posts";
import "../src/lib/openapi/paths/storages";
import "../src/lib/openapi/paths/system-options";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf-8")) as {
  version?: string;
  name?: string;
};

const doc = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Yishan Tan Admin API",
    version: packageJson.version ?? "0.0.0",
    description:
      "Yishan Tan 后台 REST API。鉴权走 x-api-key header，从 Admin → API Keys 页面生成固定 token。\n\n" +
      "代码生成：openapi-typescript / orval / openapi-fetch 都可消费本 spec。",
  },
  servers: [{ url: "http://localhost:3000", description: "本地开发" }],
});

// 集中定义 security scheme；让所有 path 默认走 ApiKeyAuth
doc.components = {
  ...(doc.components ?? {}),
  securitySchemes: {
    ApiKeyAuth: {
      type: "apiKey",
      in: "header",
      name: "x-api-key",
      description: "从 Admin → API Keys 创建的固定 API key。前缀 yishantan_。",
    },
  },
};
doc.security = [{ ApiKeyAuth: [] }];

const outFile = resolve(projectRoot, "openapi.generated.json");
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(doc, null, 2)}\n`, "utf-8");

// 校验 operationId 唯一 + 无自动生成前缀
const seen = new Set<string>();
const allOperationIds: string[] = [];
let autoGen = 0;
const pathsObj = doc.paths ?? {};
for (const [, pathItem] of Object.entries(pathsObj)) {
  for (const method of ["get", "post", "put", "patch", "delete"] as const) {
    const op = (pathItem as Record<string, { operationId?: string } | undefined>)[method];
    if (!op?.operationId) continue;
    allOperationIds.push(op.operationId);
    if (seen.has(op.operationId)) {
      throw new Error(`duplicate operationId: ${op.operationId}`);
    }
    seen.add(op.operationId);
    // 自动生成通常形如 ApiV1UsersListUsersGet 或 usersListUsersGet 这种带大段路径的
    if (/^(ApiV\d+|api-v\d+|V\d+)/i.test(op.operationId)) {
      autoGen += 1;
    }
  }
}

console.log(
  `✓ openapi.generated.json: ${Object.keys(pathsObj).length} paths, ` +
    `${allOperationIds.length} operationIds`,
);
if (autoGen > 0) {
  console.warn(
    `⚠ 检测到 ${autoGen} 个 operationId 看起来是自动生成的（带 ApiV... 前缀）。请在 src/lib/openapi/paths/<domain>.ts 里手写 operationId。`,
  );
  process.exit(2);
}
