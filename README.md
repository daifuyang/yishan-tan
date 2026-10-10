# Yishan Tan

基于 TanStack Start 的企业内部管理系统底座。

- 框架：TanStack Start（React 19 + Vite + Nitro）
- 认证：better-auth（session cookie + `x-api-key`）
- 数据：Drizzle ORM + PostgreSQL
- 缓存与限流：Redis 7（ioredis）
- UI：shadcn/ui + Radix + Tailwind v4
- 工程：Biome + drizzle-kit + arch:check
- 部署：阿里云函数计算 FC3 custom runtime

## 目录结构

```text
src/
  routes/                       # TanStack 文件路由 + REST /api/v1
  features/<domain>/            # 业务域：schema / service 常驻，policy / queries / actions 按需
  lib/                          # 基础设施：db、auth、redis、errors、context
  server/                       # 请求适配层：把 Request/Headers 转成 ServiceContext
db/
  schema/                       # Drizzle schema
  migrations/                   # 数据库迁移
scripts/
  arch/                         # 架构边界检查
  generators/                   # 资源脚手架生成器
deploy/fc/                      # FC3 部署入口（s.yaml / bootstrap / .env.example）
docs/                           # 当前规范与说明
  plans/                        # 实施计划
  history/                      # 历史评估
  references/                   # 参考资料
```

## 快速开始

```bash
cp .env.example .env  # PowerShell 使用 Copy-Item .env.example .env
npm ci
# 编辑 .env，配置 PostgreSQL、Redis 和认证密钥
npm run db:migrate
npm run db:seed
npm run dev          # http://localhost:3000，自动加载 .env
```

`db:seed` 为本地开发创建管理员 `admin`，默认密码 `admin123`。生产环境需使用独立配置和强密码。完整部署流程见 [FC3 部署说明](./deploy/fc/README.md)。

## 后台列表规范

所有后台资源列表必须采用 **搜索区 + 表格区**，以系统管理的 [用户列表](./src/routes/admin/users.tsx)、[角色列表](./src/routes/admin/roles.tsx) 为基准。

- 统一使用 `ResourcePage`：页面标题 → 独立搜索卡片 → 表格卡片（列表标题、工具栏、表格、分页）。
- 搜索字段使用 `QueryFormItem`；由 `FilterBar` 提供“重置 / 查询 / 展开收起”，默认三列、折叠首行。
- 搜索输入写入 `draft`，请求只使用已提交的 `filters`；点击查询或按 Enter 后提交条件并回到第一页，重置恢复默认条件并重新查询。
- 表格统一使用 `ResourceTable`，复用加载、错误、空状态、列冻结、行选中与分页；树形数据也采用树表格。
- 列表工具栏的新增、导出、批量操作放在表格区；编辑与详情使用弹层，不替换列表主体。
- 工作台是概览页，站点配置是配置表单页；这两类页面不套用列表结构。

完整行为与验收要求见 [后台列表规范](./docs/admin-list-standard.md)。新增列表及修改现有列表必须遵循该规范，结构检查已接入 `npm run arch:check`。

## 架构分层

- **routes** 负责 HTTP/页面入口，不写业务。
- **features** 自包含领域，常驻 `schema / service`，按需引入 `policy / queries / actions`。
- **lib** 放基础设施单例、核心类型与安全能力。
- **server** 放请求适配层，只负责把 Request/Headers 转成业务可用上下文。
- **db** 只放 schema 与 migration。
- **scripts/arch** 检查跨层引用（routes 不能访问 db，service 不能碰 React，REST 顶级资源必须复数等）。

编码助手从 [AGENTS.md](./AGENTS.md) 开始；分层和 REST 约定见 [OWN.md](./OWN.md)，视觉与交互约定见 [设计宪章](./docs/DESIGN_CHARTER.md)。

项目说明、实施计划、历史评估与参考资料见 [文档索引](./docs/README.md)。

## 常用脚本

```bash
npm run dev          # 本地开发
npm run build        # 生产构建
npm run build:fc     # 生成 deploy/fc/code/
npm run typecheck    # TypeScript 类型检查
npm run lint:check   # Biome 检查
npm run arch:check   # 架构边界检查
npm run arch:check:lists # 后台列表结构检查
npm run gen:resource -- <domain>   # 新功能目录脚手架
```

## 部署

```bash
npm run build
npm run build:fc
YISHAN_FC_ENV_FILE=deploy/fc/prod.env npm run deploy
```

部署脚本使用 Bash；Windows 下请在 WSL / Bash 环境运行部署命令。当前 `build` 命令使用 POSIX 环境变量语法，PowerShell 下使用 `$env:NODE_ENV='production'; npm exec -- vite build`。

详见 [架构约定](./OWN.md) 与 [部署说明](./deploy/fc/README.md)。
