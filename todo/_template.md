# NN · 新功能（占位模板）

> 复制此文件 → 改名 `NN-<slug>.md` → 按需改每节

## 本任务目标

> 一句话：落地哪个菜单项 / 跟老系统的对账点是什么

## 现状盘点

**后端 ✅ / ⚠️ / ❌**
- `src/features/<domain>/` 已有：列出文件
- 缺失：哪些文件 / 类型

**前端 ⚠️**
- `src/routes/admin/<slug>.tsx` placeholder / **不存在**

**DB**
- `db/schema/index.ts`：哪些表已有 / 哪些字段还需加
- `db/seed.ts`：菜单节点是否已注册（MENU_SEED）

## 下一步顺序

### 步骤 1 · DB schema（如需）

- [ ] 加 x 列 / 新表 x
- [ ] `npm run db:generate` 生成 `000X_*.sql`
- [ ] `npm run db:migrate` 验证迁移成功
- [ ] 写 SELECT … 验表存在

### 步骤 2 · types

- [ ] `src/features/<domain>/<domain>.types.ts`
- [ ] DTO 字段对齐老系统列
- [ ] service 签名 5 件套

### 步骤 3 · zod schema

- [ ] listSchema：分页 + 独立字段
- [ ] createSchema / updateSchema / deleteSchema

### 步骤 4 · service

- [ ] `toXxxDto` 映射
- [ ] 5 个 CRUD 服务
- [ ] 关联查询 + lastXxxAt 聚合
- [ ] 事务写法

### 步骤 5 · policy

- [ ] `assertCanManageXxx(ctx)`：admin-only + 业务特例
- [ ] 不碰 db

### 步骤 6 · actions

- [ ] `createServerFn().validator(zodSchema).handler()`
- [ ] `adminCtx()` 鉴权
- [ ] policy 钩在最前

### 步骤 7 · queries + use-mutations

- [ ] queryKey 命名约定
- [ ] `useXxxsList` / `useXxx` 包装
- [ ] `useCreateXxx` / `useUpdateXxx` / `useDeleteXxx` 三个 hook

### 步骤 8 · REST（可选）

- [ ] `routes/api/v1/<plural>/` 路由（如需要外部访问）

### 步骤 9 · 单测

- [ ] `*.schema.test.ts`
- [ ] `*.policy.test.ts`
- [ ] `*.service.test.ts`

### 步骤 10 · admin 页面（核心交付）

- [ ] `ResourcePage` + `ResourceTable` 范式
- [ ] 6 字段 filterBar（参考 users 风格）
- [ ] 表格列（含操作列 sticky right）
- [ ] 编辑表单 `EditXxxFields`

### 步骤 11 · 验证

- [ ] `npm run typecheck && lint && arch:check && test`
- [ ] `npm run dev` → `/admin/<slug>` e2e

### 完成记录

- 日期：__
- commit：`git rev-parse --short HEAD`
- 验证日志：__
