# 测试覆盖

> 当前基座 v1 测试矩阵。所有用例通过 `npm test` 运行。

## 1. 总体状态

- 测试文件：16 个
- 测试用例：115 个
- 覆盖层级：
  - 共享工具（errors / pagination / authorization）
  - HTTP 层（http / handlers）
  - Schema 校验（每个 feature 一份）
  - Policy 层（users / system-settings）
  - Service 纯函数（menus / departments）

## 2. 文件清单

| 文件 | 用例 | 覆盖点 |
| --- | --- | --- |
| `src/lib/errors.test.ts` | 2 | `ServerError` 工厂、`isServerError` 判定 |
| `src/lib/pagination.test.ts` | 4 | 分页 schema 解析与默认值 |
| `src/lib/authorization.server.test.ts` | 8 | `SYSTEM_ADMIN_IDS` 解析、`requireAdmin`、`requireSelfOrAdmin` |
| `src/server/http.test.ts` | 9 | `json / ok / page`、`handleApiError` 错误映射 |
| `src/server/handlers.test.ts` | 9 | `parseJsonBody / parseQuery / parseParams` |
| `src/features/auth/auth.schema.test.ts` | 7 | 登录、注册 schema |
| `src/features/roles/roles.schema.test.ts` | 9 | 角色 schema |
| `src/features/departments/departments.schema.test.ts` | 5 | 部门 schema |
| `src/features/departments/departments.service.test.ts` | 4 | `buildDepartmentTree` 纯函数 |
| `src/features/menus/menus.schema.test.ts` | 7 | 菜单 schema |
| `src/features/menus/menus.service.test.ts` | 11 | `buildTree` / `collectMenuPaths` 纯函数 |
| `src/features/system-settings/system-settings.schema.test.ts` | 12 | 系统配置 schema |
| `src/features/system-settings/system-settings.policy.test.ts` | 7 | `assertSystemSettingKey` 与 `assertSystemSettingAccess` |
| `src/features/users/users.schema.test.ts` | 8 | 用户 schema |
| `src/features/users/users.policy.test.ts` | 5 | `isSystemAdmin` / `assertNotSelfOrSystemAdmin` |
| `src/features/dicts/dicts.schema.test.ts` | 8 | 字典 schema |

合计：115 用例。

## 3. 覆盖策略

### 3.1 单元测试优先

- Schema / Policy / 工具函数 = 纯单元测试
- 不依赖数据库、不依赖 HTTP 服务

### 3.2 Service 纯函数外提

service 中可独立测试的部分（`buildTree` / `collectMenuPaths` / `buildDepartmentTree`）从 service 中导出，避免对 drizzle 链式调用做脆弱 mock。

### 3.3 暂不覆盖

- 路由级集成测试（未引入 supertest / fetch harness）
- Service 与数据库交互的端到端测试（需要真实 PG 或临时 schema）
- `actions.ts`（TanStack Server Function）的端到端测试

## 4. 验证状态

| 检查项 | 命令 | 状态 |
| --- | --- | --- |
| Lint | `npm run lint:check` | 通过 |
| Typecheck | `npm run typecheck` | 通过 |
| 架构守卫 | `npm run arch:check` | 通过 |
| 单元测试 | `npm test` | 通过（16 文件 / 115 用例） |

## 5. 下一阶段测试目标

1. Service 与数据库的集成测试
   - 在测试中用 `pglite` 或临时 schema 跑 drizzle
   - 覆盖 happy path 与失败路径
2. 路由级集成测试
   - 启动 `app.request` 或本地 fetch server
   - 校验鉴权、参数、响应结构
3. `actions.ts` 端到端测试
   - 验证 Server Function 的鉴权与 schema 校验串联
4. 错误码覆盖
   - 每个 service 的失败分支应当有对应的单测
5. 限流测试
   - 验证 `auth:signin` 限流边界