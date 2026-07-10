# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Yishan Tan 是后续 TanStack Start 企业级项目的默认底座（enterprise starter base）。技术栈：TanStack Start (React 19 + Vite + Nitro) · better-auth · Drizzle ORM + PostgreSQL 16 · Redis 7 (ioredis) · shadcn/ui + Tailwind v4 · Biome。部署到阿里云函数计算 FC3 custom runtime。

## Commands

```bash
npm run dev              # 本地开发 http://localhost:3000（host 0.0.0.0）
npm run build            # 生产构建
npm run typecheck        # tsc --noEmit
npm run lint             # biome check .（等同 lint:check）
npm run format           # biome format --write .

npm test                 # vitest run（全量）
npm run test:watch       # vitest watch
npx vitest run src/features/users/users.policy.test.ts   # 单个测试文件
npx vitest run -t "关键字"                                # 按测试名过滤

npm run db:generate      # 由 schema 生成迁移
npm run db:migrate       # 执行迁移
npm run db:seed          # 播种（tsx，读 .env）
npm run db:reset         # drop + migrate + seed

npm run arch:check       # 全部架构边界检查（见下）
npm run gen:resource -- <domain>   # 生成新 feature 目录脚手架
```

配置：`cp .env.example .env`。关键变量：`DATABASE_URL`（或拆分 `DATABASE_*`）、`REDIS_URL`、`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`。
**管理员鉴权**：`SYSTEM_ADMIN_IDS`（逗号分隔 userId）是显式白名单，覆盖 DB role；**未配置时回退 `ctx.role === "admin"`**，让 seed 用户登入即可访问后台，避免「必须手抄 userId 写进 .env」（见 `src/lib/authorization.server.ts:isSystemAdmin`）。

CI 前置门槛：`typecheck` + `lint` + `arch:check` + `test` 都要过。改动跨层引用后务必跑 `arch:check`，它是脚本级硬约束，不是建议。

## UI 一致性约束

后台 admin 的设计规约见 [`docs/DESIGN_CHARTER.md`](./docs/DESIGN_CHARTER.md),包含设计价值观、设计令牌、文字与排版、布局、组件 API、反馈与消息、表格与列表、表单与录入、按钮层级、响应式、暗黑模式、治理守卫、反模式清单等章节。改动 admin UI 前必读;重大 UI 改动须在 PR 描述引用宪章章节号(如 §9.1)。

> **宪章落地追踪**:Phase 1 / 2 / 3 进度详见 `docs/DESIGN_CHARTER.md` 附录 C;2026-07 当前 arch:check 仅含 4 个 P0 守卫(`check-routes` / `-actions` / `-services` / `-naming`,见宪章 §12.1)。宪章 §12.2 的 `check-ui-tokens`(P1)/ `check-ui-naming`(P2)与 §12.3 的 biome `noRestrictedImports` 禁 antd 均待补;Phase 1 立即落地的 5 项中 1 项已完成(文案"您"→"你/我"),其余 4 项本轮代码合规一并修复。

## 请求流与分层（核心心智模型）

有两条并行的入口，但都汇聚到同一个 **service 层**，且都必须先构造 `ServiceContext` 才能触达业务：

1. **前端 → Server Function**：`features/<domain>/<domain>.actions.ts` 用 `createServerFn().validator(zodSchema).handler()`。handler 里通过 `getRequestHeaders()` → `contextFromRequest()` / `requireRequestContext()` 拿 ctx，再调 service。React 组件通过 `<domain>.queries.ts`（TanStack Query）消费。
2. **REST → File Route**：`routes/api/v1/<resource>/...` 用 `createFileRoute(...).server.handlers.{GET,POST,...}`。handler 里 `requireRequestContext(request)` 拿 ctx，`parseQuery/parseJsonBody/parseParams`（`src/server/handlers.ts`）校验入参，`ok()/page()` 包装响应，`try/catch` 用 `handleApiError()` 统一转错。

**`ServiceContext`（`src/lib/service-context.ts`）是业务边界唯一入参类型**：`{ userId, headers, authKind }`，`authKind` ∈ `session | apiKey | system`。所有 service 函数签名都是 `(ctx or 拆解后的字段, input)`，**永远不直接接触 `Request`/`Response`**。`src/server/request-context.ts` 是唯一把 headers 解析成 ctx 的地方：先 session cookie，再 `x-api-key`，失败返回 `null`。

分层职责（`OWN.md` 有完整硬约束）：
- **`src/routes/`** — 只有入口：route 声明、loader、beforeLoad、组件、REST handler。不写业务。
- **`src/features/<domain>/`** — 自包含领域。常驻 `<domain>.schema.ts`（Zod）、`<domain>.types.ts`（DTO）、`<domain>.service.ts`（业务 + db/redis/auth 读写）。按需 `<domain>.policy.ts`（授权 `assertCanXxx` / `requireXxx`，不碰 db）、`<domain>.queries.ts`、`<domain>.actions.ts`。
- **`src/lib/`** — 基础设施单例与安全能力：`db.server.ts`（`getDb()`）、`redis.server.ts`、`auth.server.ts`、`authorization.server.ts`、`errors.ts`、`logger.server.ts`、`rate-limit.server.ts`、`service-context.ts`。不写业务。
- **`src/server/`** — 请求适配层，只把 `Request`/`Headers` 转成 ctx 或解析/包装 HTTP。
- **`db/`** — 只有 `schema/` 与 `migrations/`，不反向依赖业务模块。

## 错误处理

Service 抛错一律用 `Errors.*` 工厂（`src/lib/errors.ts`）：`unauthenticated(401)`、`forbidden(403)`、`notFound(404)`、`conflict(409)`、`invalid(400)`、`rateLimited(429)`、`internal(500)`，都产出带 `code/statusCode` 的 `ServerError`。REST 层 `handleApiError()` 把 `ServerError` 和 `ZodError` 统一序列化成 `{ ok:false, code, error, details }`。不要在 service 里手抛裸 `Error` 或直接返回 HTTP。

## 命名与约定（arch:check 会强制）

- feature 文件名一律以 `<domain>.` 为前缀，无关领域的散文件不允许。
- service 函数命名 `xxxService`；actions 遵循资源动作 `createXxx/updateXxx/deleteXxx/getXxx/listXxx`；schema 导出 `<Action>Schema`；types 导出 `XxxDto/XxxInput/XxxOutput`。
- REST 路由 `/api/v1/<resource>`，顶级资源名**必须复数**（`users`、`sessions`），子资源可非复数（`users/me`）。HTTP 方法语义严格：`POST` 建 / `GET` 列表或详情 / `PATCH` 部分更新 / `DELETE` 删除。
- import 类型用 `import type { ... }`（`verbatimModuleSyntax`，Biome `useImportType` 为 warn）。字符串优先单引号。缩进 2 空格，行宽 100。默认不写注释，先自描述。

`scripts/arch/` 的四个守卫：`check-routes`（routes 不得直接 import db/auth/redis）、`check-actions`（actions 不得 import db/drizzle）、`check-services`（services 不得 import React/routes/components，强制依赖走白名单 `~/lib/errors`、`~/lib/service-context`、`~/lib/authorization.server`）、`check-naming`（前缀 + 复数规则）。

## 部署

`deploy/fc/s.yaml` 是 FC3 唯一入口；`bootstrap` 只启动应用，不跑迁移/安装。真实环境变量写 `deploy/fc/prod.env`（不提交）。

```bash
npm run build && npm run build:fc          # 生成 deploy/fc/code/
npm run deploy:plan / deploy / deploy:smoke / deploy:rollback   # scripts/deploy-fc.sh
```

新增功能优先用 `npm run gen:resource -- <domain>` 生成骨架，再按上面的分层填充。详见 `OWN.md`。
