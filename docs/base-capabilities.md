# 基座能力现状

> 目标：让任何接入方在 5 分钟内搞清楚 yishan-tan 当前已经具备哪些能力、覆盖到哪一层、还有哪些缺口。

## 1. 文档信息

- 项目：`yishan-tan`
- 阶段：后台管理基座 v1
- 文档版本：v1
- 配套文档：
  - `docs/data-model.md` 数据模型
  - `docs/api-reference.md` REST API 清单
  - `docs/testing.md` 测试覆盖

## 2. 目标与范围

按 `Yishan Tan 基座能力实现计划.md` 的规划，本阶段只补齐“后台管理基座”必需的通用能力，不进入业务模块。

包含：

- 认证与会话增强
- 用户 / 角色 / 部门 / 菜单 / 字典 / 系统配置 / API Key
- 登录日志
- 工程化：lint / typecheck / 架构守卫 / 测试

不包含：

- 文章 / 页面 / 分类 / 模板
- 商品 / 订单 / SKU
- 插件运行时
- 云存储供应商集成
- 完整后台前端页面

## 3. 已落地的能力

### 3.1 认证与会话

- [x] 注册：`POST /api/v1/users`
- [x] 登录：`POST /api/v1/sessions`
- [x] 登出：`DELETE /api/v1/sessions`
- [x] 当前用户：`GET /api/v1/users/me`
- [x] 修改当前用户密码：`PATCH /api/v1/users/me`
- [x] 当前用户登录日志：`GET /api/v1/users/me/login-logs`
- [x] 登录日志自动写入（成功 / 失败都会落 `login_log`）

### 3.2 API Key

- [x] 列表：`GET /api/v1/api-keys`
- [x] 创建：`POST /api/v1/api-keys`
- [x] 删除：`DELETE /api/v1/api-keys/:id`
- [x] 鉴权：`x-api-key` 头，与 session cookie 并存

### 3.3 用户管理

- [x] 用户列表：`GET /api/v1/users`
- [x] 用户详情：`GET /api/v1/users/:id`
- [x] 用户更新：`PATCH /api/v1/users/:id`
- [x] 用户删除：`DELETE /api/v1/users/:id`
- [x] 约束：禁止禁用 / 删除当前登录用户，禁止禁用 / 删除系统管理员

### 3.4 角色与权限

- [x] 角色列表：`GET /api/v1/roles`
- [x] 角色详情：`GET /api/v1/roles/:id`
- [x] 角色创建：`POST /api/v1/roles`
- [x] 角色更新：`PATCH /api/v1/roles/:id`
- [x] 角色删除：`DELETE /api/v1/roles/:id`
- [x] 角色与菜单绑定：随角色创建 / 更新写入 `role_menu`
- [x] 用户与角色绑定：用户更新时可携带 `roleIds`
- [x] 约束：仍有用户绑定时禁止删除角色

### 3.5 部门

- [x] 部门列表：`GET /api/v1/departments`
- [x] 部门详情：`GET /api/v1/departments/:id`
- [x] 部门树：`GET /api/v1/departments?tree=1`
- [x] 部门创建：`POST /api/v1/departments`
- [x] 部门更新：`PATCH /api/v1/departments/:id`
- [x] 部门删除：`DELETE /api/v1/departments/:id`
- [x] 约束：存在子部门时禁止删除，上级不能为自身

### 3.6 菜单与授权

- [x] 菜单列表：`GET /api/v1/menus`
- [x] 菜单详情：`GET /api/v1/menus/:id`
- [x] 菜单树：`GET /api/v1/menus?tree=1`
- [x] 当前用户授权菜单树：`GET /api/v1/menus?authorized=tree`
- [x] 当前用户授权路径列表：`GET /api/v1/menus?authorized=paths`
- [x] 菜单创建：`POST /api/v1/menus`
- [x] 菜单更新：`PATCH /api/v1/menus/:id`
- [x] 菜单删除：`DELETE /api/v1/menus/:id`
- [x] 约束：存在子菜单或被角色绑定时禁止删除

### 3.7 系统配置

- [x] 单项读取：`GET /api/v1/system-options/:key`
- [x] 单项写入：`PUT /api/v1/system-options/:key`
- [x] 批量读取：`POST /api/v1/system-options`
- [x] 批量写入：`POST /api/v1/system-options/batch`
- [x] key 合法性校验：只允许 `^[a-z0-9_.-]+$`
- [x] 权限：所有写操作要求系统管理员

### 3.8 字典

- [x] 字典类型列表：`GET /api/v1/dict-types`
- [x] 字典类型详情：`GET /api/v1/dict-types/:id`
- [x] 字典类型创建：`POST /api/v1/dict-types`
- [x] 字典类型更新：`PATCH /api/v1/dict-types/:id`
- [x] 字典类型删除：`DELETE /api/v1/dict-types/:id`
- [x] 字典数据列表：`GET /api/v1/dicts-data`
- [x] 字典数据详情：`GET /api/v1/dicts-data/:id`
- [x] 字典数据创建：`POST /api/v1/dicts-data`
- [x] 字典数据更新：`PATCH /api/v1/dicts-data/:id`
- [x] 字典数据删除：`DELETE /api/v1/dicts-data/:id`
- [x] 约束：字典数据依赖字典类型存在

## 4. 通用能力

### 4.1 统一响应

成功：

```json
{ "ok": true, "data": {} }
```

分页：

```json
{
  "ok": true,
  "data": { "items": [] },
  "meta": { "total": 100, "page": 1, "pageSize": 20 }
}
```

失败：

```json
{ "ok": false, "code": "INVALID", "error": "请求参数不合法", "details": {} }
```

### 4.2 统一错误码

| Code | 含义 |
| --- | --- |
| `UNAUTHENTICATED` | 未登录 |
| `FORBIDDEN` | 无权限 |
| `NOT_FOUND` | 资源不存在 |
| `CONFLICT` | 资源已存在或被占用 |
| `INVALID_CREDENTIALS` | 凭证错误 |
| `INVALID` | 参数不合法 |
| `RATE_LIMITED` | 请求过于频繁 |
| `INTERNAL` | 内部错误 |

### 4.3 鉴权

- Web：session cookie
- 自动化 / CLI：`x-api-key`
- 解析：`src/server/request-context.ts`
- 路由统一使用 `requireRequestContext / ensureAdmin / requireAdmin`

### 4.4 限流

- 登录接口 `auth:signin` 按 `email + clientIp` 限流，10 次 / 60 秒
- 实现：`src/lib/rate-limit.server.ts`

### 4.5 分页

- 统一分页 schema：`src/lib/pagination.ts`
- 默认 `pageSize=20`，最大 100

## 5. 领域边界（feature 内）

每个领域按以下文件组织，所有 `<domain>.<kind>.ts` 都以 `<domain>.` 为前缀：

- `<domain>.schema.ts` zod 入参 / 出参
- `<domain>.types.ts` 业务 DTO / service 类型
- `<domain>.service.ts` 业务逻辑
- `<domain>.policy.ts` 授权判断
- `<domain>.actions.ts` TanStack Server Function 入口
- `<domain>.<kind>.test.ts` 测试

涉及领域：

- `auth` 认证与会话
- `users` 用户管理 / 登录日志 / API Key
- `roles` 角色管理
- `departments` 部门管理
- `menus` 菜单与授权
- `system-settings` 系统配置
- `dicts` 字典

## 6. 工程化

- Biome：lint + format + import 排序
- TypeScript：`tsc --noEmit` 严格模式 + `noUncheckedIndexedAccess`
- Drizzle ORM + PostgreSQL
- Redis（ioredis）限流
- better-auth：session cookie + apiKey
- Vitest：单元测试
- TanStack Start：REST + Server Function
- FC3：custom runtime 部署

## 7. 架构守卫

通过 `npm run arch:check` 执行：

- `check-routes` 禁止 routes 直接访问 db / auth / redis
- `check-actions` 禁止 actions 直接 import db / drizzle
- `check-services` 禁止 services import React / routes / components
- `check-naming` 强制 feature 文件命名以 `<domain>.` 为前缀，REST 顶级资源必须复数

## 8. 验证状态

| 检查项 | 命令 | 状态 |
| --- | --- | --- |
| Lint | `npm run lint:check` | 通过 |
| Typecheck | `npm run typecheck` | 通过 |
| 架构守卫 | `npm run arch:check` | 通过 |
| 单元测试 | `npm test` | 通过（16 文件 / 115 用例） |

## 9. 已知缺口与下一阶段

按 `Yishan Tan 基座能力实现计划.md` 的迭代顺序，当前为第一阶段完成态。下一阶段候选：

- 附件与上传
- 内容管理（文章 / 页面 / 分类 / 模板）
- 商城基础（商品 / 订单 / SKU）
- 插件运行时
- 云存储供应商集成
- 后台前端页面（最小可用 admin）
- 集成测试（路由级 / service 级基于临时 sqlite schema）
- 最小 OpenAPI 输出

## 10. 接入指引

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

默认端口 3000。健康检查：`GET /api/health`。