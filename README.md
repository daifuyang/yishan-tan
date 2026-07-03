# Yishan Tan

基于 TanStack Start 的企业内部管理系统底座。

- 框架：TanStack Start（React 19 + Vite + Vinxi/Nitro 兼容）
- 认证：better-auth（session cookie + `x-api-key`）
- 数据：Drizzle ORM + PostgreSQL 16
- 缓存与限流：Redis 7（ioredis）
- UI：shadcn/ui + Radix + Tailwind v4
- 工程：Biome + drizzle-kit + arch:check
- 部署：阿里云函数计算 FC3 custom runtime

## 目录结构

```text
src/
  routes/                       # TanStack 文件路由 + REST /api/v1
  features/<domain>/            # 业务域：schema / service 常驻，policy / queries / actions 按需
  lib/                          # 基础设施：db、auth、redis、logger、errors、context
  server/                       # 请求适配层：把 Request/Headers 转成 ServiceContext
db/
  schema/                       # Drizzle schema
  migrations/                   # 数据库迁移
scripts/
  arch/                         # 架构边界检查
  generators/                   # 资源脚手架生成器
fc-deploy/                      # FC3 部署入口（s.yaml / bootstrap / .env.example）
```

## 快速开始

```bash
cp .env.example .env
npm install
npm run dev     # http://localhost:3000
```

## 架构分层

- **routes** 负责 HTTP/页面入口，不写业务。
- **features** 自包含领域，常驻 `schema / service`，按需引入 `policy / queries / actions`。
- **lib** 放基础设施单例、核心类型与安全能力。
- **server** 放请求适配层，只负责把 Request/Headers 转成业务可用上下文。
- **db** 只放 schema 与 migration。
- **scripts/arch** 检查跨层引用（routes 不能访问 db，service 不能碰 React，REST 顶级资源必须复数等）。

详细的层级、feature 目录模板和 REST 资源约定见 `OWN.md`。

## 常用脚本

```bash
npm run dev          # 本地开发
npm run build        # 生产构建
npm run build:fc     # 生成 fc-deploy/code/
npm run typecheck    # TypeScript 类型检查
npm run lint:check   # Biome 检查
npm run arch:check   # 架构边界检查
npm run gen:resource -- <domain>   # 新功能目录脚手架
```

## 部署

```bash
npm run build
npm run build:fc
DOCBASE_FC_ENV_FILE=fc-deploy/prod.env npm run deploy
```

详见 `OWN.md` 与 `fc-deploy/README.md`。