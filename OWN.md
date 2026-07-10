# OWN.md — 底座所有权与决策

## 适用范围
Yishan Tan 是后续 TanStack Start 企业级项目的默认底座。

> **UI 规约**:分层与硬约束见本文;后台 admin 的**设计规约见 [`docs/DESIGN_CHARTER.md`](./docs/DESIGN_CHARTER.md)**。两者同级,本文约束代码分层,宪章约束 UI 一致性。

## UI 硬约束(以 DESIGN_CHARTER 为准)

> **改动 admin UI 前必读宪章**(§0.4);本节列出 OWN 级别**必须遵守**的硬约束条款,review 必查:

- **§9.1** 同区主按钮 ≤1(`variant="default"` 同区域最多 1 个;批量停用必 `variant="outline"`)
- **§3.1** 文案统一"你/我",禁止使用"您"
- **§3.3** placeholder 默认走企业 中台惯例:Input `请输入`、Select `请选择`、搜索 `搜索 XXX`、格式敏感字段(邮箱/手机/API Key)用格式示例(`example@email.com` / `138 0000 0000` / `sk-xxxxxx`);AntD 风格 `如:XXX` 需 PR 引用 §3.3;禁止重复 label(`请输入姓名`)与规则说明
- **§7.2** 表格无数据占位统一 `--`,禁止混用 `-` / `空` / `暂无`
- **§9.5** 危险按钮搭配 Popconfirm,焦点默认落取消按钮
- **§13** 反模式清单(15+ 条,review 必查)— 详见 `docs/DESIGN_CHARTER.md` §13
- **§12.4** PR 必须引用宪章章节号(如 `DESIGN_CHARTER §9.1`)
- **§2.1** 业务组件禁止裸 hex,所有颜色必须走 `globals.css` token

## 技术决策
- 框架：TanStack Start + Vite。
- ORM：Drizzle。
- 认证：better-auth（session + api-key），`autoSignIn` 默认关闭，避免注册时副作用不清晰。
- 部署：阿里云函数计算 FC3 custom runtime。

## 分层硬约束
- `src/routes/` 只能写入口（route 声明、loader、beforeLoad、组件、REST handler）。
- `src/features/<domain>/<domain>.service.ts` 是业务边界，对 db/redis/auth 读写负有责任，但不直接接触 `Request` / `Response`。
- `src/features/<domain>/<domain>.actions.ts` 是 TanStack Server Function 入口，只做三件事：zod 校验、获取 `ServiceContext`、调用 service。
- `src/features/<domain>/<domain>.policy.ts` 只做授权判断（`assertCanXxx`），不写数据库。
- `src/server/` 是请求适配层，只负责把 `Request` / `Headers` 解析成 `ServiceContext`。
- `src/lib/` 不写业务，按 `infra / security / core` 三类区分（当前阶段可混放，后续按需拆）。
- `db/` 不反向依赖业务模块。

## feature 目录模板
```text
src/features/<domain>/
  <domain>.schema.ts      # Zod 入参/出参 schema，常驻
  <domain>.types.ts       # 业务 DTO 类型，常驻
  <domain>.service.ts     # 业务逻辑，常驻
  <domain>.policy.ts      # 授权判断，按需
  <domain>.queries.ts     # 读模型（TanStack Query loader / query 函数），按需
  <domain>.actions.ts     # TanStack Server Function 入口，按需（只给前端用时）
  tests/                  # 单元测试，按需
```

补充约定：
- 文件名以 `<domain>.` 为前缀；不允许出现与领域无关的散文件。
- service 函数命名 `xxxService`，参数第一项是 `ServiceContext`。
- actions 函数命名遵循资源动作：`createXxx` / `updateXxx` / `deleteXxx` / `getXxx`。
- schema 导出 `<Action>Schema`，types 导出 `XxxDto` / `XxxInput` / `XxxOutput`。

## REST 资源约定
- 路由全部以 `/api/v1/<resource>` 开头，资源名使用复数（如 `users`、`sessions`）。
- 资源子路径（如 `users/me`）只在表达“当前上下文”时使用，禁止做权限绕过。
- HTTP 方法语义严格：
  - `POST /api/v1/<resource>` 创建
  - `GET /api/v1/<resource>` 列表
  - `GET /api/v1/<resource>/:id` 详情
  - `PATCH /api/v1/<resource>/:id` 部分更新
  - `DELETE /api/v1/<resource>/:id` 删除
- 鉴权使用 `requireRequestContext(request)`，禁止在 route 内手动拼 `ServiceContext`。

## 架构守卫
- `scripts/arch/check-routes.mjs`：禁止 routes 直接访问 db/auth/redis。
- `scripts/arch/check-actions.mjs`：禁止 actions 直接 import db/drizzle。
- `scripts/arch/check-services.mjs`：禁止 services import React/routes/components；强制依赖必须来自白名单（`~/lib/errors`、`~/lib/service-context`、`~/lib/authorization.server`）。
- `scripts/arch/check-naming.mjs`：feature 文件名以 `<domain>.` 为前缀，REST 顶级资源名必须复数，子资源允许非复数。

## 部署约定
- `deploy/fc/s.yaml` 是 FC3 部署唯一入口。
- `bootstrap` 只启动应用，不执行迁移或安装。
- 真实环境变量写在 `deploy/fc/prod.env`，不提交。
- 线上数据库通过 VPC 内网访问，使用独立库与独立用户，不复用其他应用账号。
- `scripts/deploy-fc.sh apply` 完成 build + deploy + smoke。

## 编码风格
- Biome 1.x 单根。
- import 类型用 `import type { ... }`（TS `verbatimModuleSyntax`）。
- 不写注释除非必要；先自描述。
- 字符串优先单引号；JSON 配置文件允许双引号；通过 `npx biome format --write .` 自动同步。
