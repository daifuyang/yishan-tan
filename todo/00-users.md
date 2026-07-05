# 00 · 用户管理（参考实现）

> **本文件不是要实施的清单，是已经完成的范式**。
> 后面 `01-roles.md` ~ `10-portals.md` 的 subagent 都应该**先读完本文件再开干**。

## 完成状态

- 路由：`/admin/users` ✅
- 后端：`src/features/users/` 完整
- 前端：`src/routes/admin/users.tsx` 24KB 含 9 列+多选+sticky right+6 字段 filter
- 数据库：迁移 `db/migrations/0001_strange_ikaris.sql` 加了 phone 列
- 状态：**已完工，作为其它 feature 的对照样板**

## 现状盘点（文件清单）

```
src/features/users/
├── users.actions.ts        # createServerFn × 8（listUsers/getUser/updateUser/deleteUser/...）
├── users.policy.ts         # 12 行 stub（仅 SYSTEM_ADMIN_IDS 白名单）
├── users.policy.test.ts    # 5 tests
├── users.queries.ts        # useUsersList + useUserDetail + useAssignableRoles（跨 feature）
├── users.schema.test.ts    # 9 tests
├── users.schema.ts         # zod schema × 5（list/updateUser/changePassword/loginLogs/phoneSchema）
├── users.service.ts        # 完整 CRUD + phone/name update + lastLoginAt 聚合 + 事务
├── users.types.ts          # AdminUserDto + 服务签名类型
└── users.use-mutations.ts  # useMutation × 3（updateUser/deleteUser/bulkUpdateUserStatus）

src/routes/admin/users.tsx  # ResourcePage + 6 字段 FilterBar + 9 列 ResourceTable（sticky right）
db/migrations/0001_strange_ikaris.sql  # ALTER TABLE "user" ADD COLUMN "phone" text;
src/components/admin/form/multi-select.tsx  # 业务角色多选（新建）
```

## 每个 layer 的关键决策点（subagent 模仿这些）

### 1. DB schema (`db/schema/index.ts`)

- 字段命名严格遵循 better-auth 默认约定（不要在 user 表加 better-auth 未声明的列）
- 业务字段（displayName/phone）走 `additionalFields` 配 better-auth
- 改完 `schema` 必跑 `npm run db:generate`，手抄 patch 到 `000X_*.sql`，再 `npm run db:migrate`
- 检查 `biome.json` 里 `db/migrations` 是否在 ignore（是的，已配）

### 2. 类型 (`users.types.ts`)

- DTO 全部 inline 在 `*types.ts` 里，`DbUser` 走 `import type`
- service 函数签名 (`ListUsersService` / `GetUserService` / ...) 顶层 export，handler 只做入参转发
- 修改 patch 用 `Partial<typeof schema.user.$inferInsert>`

### 3. zod schema (`users.schema.ts`)

- `phoneSchema` 抽出为可复用 zod 子句（`auth.schema.ts` 也复用同一份）
- list 用 `page / pageSize / keyword或独立字段 / status`
- update 不强必填，所有字段 `optional`

### 4. service (`users.service.ts`)

- `toAdminUser(row, roleIds, lastLoginAt)` 映射 DTO 一次
- 涉及多表写用 `db.transaction(async (tx) => {...})` 包起来（userRole 先 delete 再 insert 是事务写法）
- 关联查询（lastLoginAt）一次性 `inArray(userIds)` 避免 N+1

### 5. policy (`users.policy.ts`)

- 仅 12 行：导出 `isSystemAdmin(userId)`，复用 `SYSTEM_ADMIN_IDS`
- 业务特例（"不能禁用自己" / "不能改 system admin"）放进 service 的事务前检查
- 不碰 db，只做判断

### 6. actions (`users.actions.ts`)

- `adminCtx()` / `userCtx()` 抽出来复用，避免每个 handler 重复
- `getRequestHeaders()` → `contextFromRequest()` 或 `requireRequestContext()`
- 所有 action 第一步 `await adminCtx()` / `await userCtx()`

### 7. queries + mutations (`users.queries.ts` / `users.use-mutations.ts`)

- queryKey 命名 `xxxsQueryKey = { all, lists, list, details, detail }`
- `queryOptions` 工厂 + `useXxx` 包装（不要直接 `useQuery` 写死）
- `staleTime: 30_000`，`gcTime: 5 * 60_000`，`refetchOnWindowFocus: false` — 这三项是稳定基线
- 跨 feature query（如 `useAssignableRoles` 调用 `roles.feature` 的 `useRolesList`）：用 `Parameters<typeof useRolesList>[0]` 推导 input 类型，避免循环依赖

### 8. REST（无）

- 用户管理只服务 admin 前端，没建 REST 路由 — 跳过此步骤
- **判断标准**：如果只有 `/admin/<slug>` 一个 client，可以省略 REST；如果是平台级 API（用户/部门 这种往往有外部系统对接），必须加

### 9. 单元测试 (`*.schema.test.ts`)

- 每个 schema 一组正反向 case
- 每个 policy 主要 if-else 分支一个 case
- 至少覆盖「通过 / 不通过 / 边界（空串 / null）」

### 10. admin 页面 (`routes/admin/users.tsx`) — 重点

> 所有 feature 页面都按这个结构写。

**布局**：
- `ResourcePage`：title + description + filter + toolbar + table
- `filterColumns={3}` + `filterCollapsible` （默认收起，老项目截图就是这个状态）
- `useState<FilterState>` 持久 6 字段（不要混用单 keyword）
- `toQuery(state, page, pageSize)` 把 UI state 映射到 `UserListQuery`

**表格列对齐（9 列 + 操作列）**：
- 列宽全部用真实 pixel：140 / 120 / 120 / 220 / 140 / 100 / 90 / 170 / 170 / 200
- `table-fixed` + 列 `width/minWidth` 双重设（之前 bug：曾用 `w-24` 当 `width` 字段，被当 CSS 写，被浏览器忽略）
- 操作列 `sticky: "right"` 冻结（复用我们写的 `getStickyCellProps`）
- 横向滚动：`overflow-x-auto overflow-y-hidden`
- 数据空用 `<EmptyState>`；loading 用 5 行 skeleton

**编辑表单（EditUserFields）**：
- 顶部用户卡（只读 avatar+username+email）
- 姓名 + 昵称 + 手机号 三件套（2 列网格 + 手机号占满）
- 账号状态 Select
- 业务角色 MultiSelect（`src/components/admin/form/multi-select.tsx`）
- 操作列按钮「编辑 / 启用-禁用 / 更多-删除」；删除是 Popconfirm
- 用 `Popconfirm` 异步确认删除

**多语言 / 文案**：保持中文（与老项目一致），按钮用 4 字短词（编辑/禁用/启用/删除）

### 11. 验证

```
npm run typecheck && npm run lint && npm run arch:check && npm test
npm run db:migrate                # 走 0001_*.sql
npm run dev                       # http://localhost:3000/admin/users
```

跑通后 `git log -1 --pretty=%h` 拿到 commit hash 写在这里：

## 完成记录

- 2026-07-05：初版完成。phone 字段加迁移 0001_strange_ikaris.sql；9 列 + sticky right + MultiSelect 业务角色 + 6 字段过滤器。
- hash：`4b04862`（`chore: bootstrap yishan-tan base`）之前的提交记录没了，需要 subagent 在自己执行完后再补
