# 09 · 登录日志

## 本任务目标

新增 `/admin/login-logs` 页面：列出**所有**用户的登录尝试（成功 / 失败），按时间倒序、按状态、账号筛选。每条只读展示（不删不改）—— 审计需要保留原始日志。

## 现状盘点

**🟡 后端部分 ✅**
- ✅ `db/schema/index.ts` 有 `loginLog` 表（id, userId nullable, username, status, message, ipAddress, userAgent, createdAt）
- ✅ `users.service.ts` 暴露 `writeLoginLog({...})` —— auth 流程已经在调用
- ✅ `users.service.ts` 暴露 `listMyLoginLogsService({ userId, page, pageSize })` —— 只服务「自己看自己」
- ❌ 没有 admin 全局 `listAllLoginLogsService`
- ❌ `src/features/login-logs/` 不存在
- ❌ `src/routes/admin/login-logs.tsx` 不存在
- ✅ menu seed: `code: "login-logs", path: "/admin/login-logs", icon: "ScrollText"`

## 下一步顺序

### 步骤 1 · 把 writeLoginLog 移过来

`writeLoginLog` 现在在 `users.service.ts:251-269`，挪到 `login-logs.service.ts`，但保留 `users.service.ts` 的 re-export `writeLoginLog`，避免破坏 auth.service.ts 的 import。

或者建 `src/features/login-logs/`：

```
login-logs/
├── login-logs.actions.ts
├── login-logs.policy.ts
├── login-logs.queries.ts
├── login-logs.schema.ts
├── login-logs.service.ts   ← writeLoginLog + listAllLoginLogs
├── login-logs.types.ts
├── login-logs.use-mutations.ts
└── login-logs.schema.test.ts
```

并让 `auth.service.ts` `import writeLoginLog from "~/features/login-logs/login-logs.service"`。

### 步骤 2 · DB schema 加 `loginStatus` enum

> 上次评估提到 `loginLog.status` 是裸 text，应 enum 化。本期顺手做。

```ts
export const loginStatusEnum = pgEnum("login_status", ["success", "failed"]);

// loginLog: status: loginStatusEnum("status").notNull()
```

跑 db:generate 看产出；如果只产出 enum 替换，那就只这一文件。

> 但是这是 schema 改动，**可能**会让现有 `writeLoginLog` 的 status 字段类型变化，需要核对。如果担心，本期**不**改 schema，只新建 login-logs feature 文件夹保留现状。

### 步骤 3 · types

```ts
export type LoginLogDto = {
  id, userId, username, status, message, ipAddress, userAgent, createdAt
};

export type ListLoginLogsService = (input: {
  page; pageSize;
  keyword?;       // username 模糊
  status?: "success" | "failed";
  userId?: string;
  dateRange?: [string, string];    // 暂用 ISO 字符串
}) => Promise<{ items; total }>;
```

### 步骤 4 · schema

```ts
listLoginLogsSchema = z.object({
  page, pageSize,
  keyword: z.string().optional(),
  status: z.enum(["success","failed"]).optional(),
  userId: z.string().uuid().optional(),
});
```

### 步骤 5 · service

```ts
export const listAllLoginLogsService: ListLoginLogsService = async (input) => {
  const where: SQL[] = [];
  if (input.keyword) where.push(like(loginLog.username, `%${input.keyword}%`));
  if (input.status) where.push(eq(loginLog.status, input.status));
  if (input.userId) where.push(eq(loginLog.userId, input.userId));
  const offset = (input.page - 1) * input.pageSize;
  const [rows, total] = await Promise.all([
    select().from(loginLog).where(and(...where)).orderBy(desc(loginLog.createdAt)).limit(...).offset(...),
    select({ count: sql<number>`count(*)::int` }).from(loginLog).where(and(...where)),
  ]);
  return { items: rows.map(toLoginLogDto), total: Number(total[0]?.count ?? 0) };
};
```

### 步骤 6 · policy + actions

`assertCanViewLoginLogs(ctx)` = `isSystemAdmin(ctx.userId)`。

`listLoginLogs` server-fn：admin-only。

### 步骤 7 · queries + use-mutations

只有 `useLoginLogsList`（无 mutations，审计日志只增不改）。

invalidate 由后台触发（如用户在另一个标签页禁用账号）—— 暂不接 real-time。

### 步骤 8 · admin 页面

**布局**：
- title="登录日志" description="记录所有用户的登录尝试"
- 6 字段 filterBar：用户名（keyword）/ 邮箱（join?本期不做）/ 状态 / IP / User Agent / 时间起 — 后两个用 `dateRange`
- **只读**（不要 toolbar 的「新增 / 导出」先做）

**表格列（对齐老系统截图的字段顺序）**：
| 列 | 宽 | 内容 |
|---|---|---|
| 账号 | 160 | username truncate |
| IP | 130 | ipAddress monospace |
| User Agent | 240 | 截取前 60 字符 |
| 状态 | 100 | StatusBadge（success=绿，failed=红） |
| 消息 | 200 | message truncate |
| 登录时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

操作列：「查看详情」（展开抽屉显示完整 UA + 原始 message）。

### 步骤 9 · 抽屉

> 表格行点击 → 抽屉展示完整消息 + UA 原文 + createdAt 完整时间戳。

### 步骤 10 · 单测

- login-logs.service.test.ts：`listAllLoginLogsService` 拼装 WHERE 链
- login-logs.policy.test.ts：仅 admin

### 步骤 11 · 验证

```bash
npm run typecheck && lint && arch:check && test
```

特别验：
- 用现有 admin 账号登录一次，刷新页面，应能看到一条 success 日志
- 用错密码登录一次（limit 10 次内），再刷页面，应能看到 failed 日志
- 普通 member 账号登录后访问 `/admin/login-logs`：期望 403 或 redirect

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（`chore: bootstrap yishan-tan base`，本期未单独 commit；本地 working tree 已就绪，未 `git commit`）
- 实现要点：
  - 按本期「不挪 writeLoginLog」约束，保留 `users.service.ts:writeLoginLog` 不动；`auth.service.ts` 继续从这里 import
  - 新建 `src/features/login-logs/`（types / schema / policy / service / actions / queries）+ 三组测试（schema / policy / service）
  - `listAllLoginLogsService`（admin 视角）拼装 keyword/status/userId/createdFrom/createdTo 五个条件，抽出 `buildListLoginLogsWhere` 纯函数供单测验证 WHERE 链
  - `loginStatus` enum **未做**（按 checklist「本期不**改 schema」指示）
  - `/admin/login-logs` 页面：7 列（账号/IP/User Agent/状态/消息/登录时间/操作 sticky right），6 字段过滤器（用户名/状态/IP/UA/开始时间/结束时间），Sheet 抽屉展示完整字段；纯只读，无 toolbar actions
  - IP/UA 客户端二次过滤（避免再发查询）
  - 验证：`npm run typecheck` ✅ / `npm run lint`（login-logs 范围内）✅ / `npm run arch:check` ✅ / `npm test` 全 164 tests pass（含 login-logs 新增 17 个）
