/**
 * GET /api/openapi.json —— 把仓库根 openapi.generated.json 暴露出去给 Restish / openapi-typescript 等消费。
 *
 * 不鉴权：spec 本身不含敏感数据，只描述请求/响应形状。
 * 缓存 5 分钟，让 CDN 友好但又不至于看不到 dev 改动。
 *
 * 注意：必须在每次 `npm run dev` / `npm run build` 前跑 openapi:gen，
 * 否则文件不存在或落后。package.json 已把 prebuild 和 dev 接好。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/openapi/json")({
  server: {
    handlers: {
      GET: () => {
        const spec = readFileSync(resolve(process.cwd(), "openapi.generated.json"), "utf-8");
        return new Response(spec, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
