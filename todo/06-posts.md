# 06 · 岗位管理（feature 全建）

## 本任务目标

新增 `/admin/posts` 全功能页面：维护「岗位」（post = job position），每个岗位挂一个部门 `department_id`。**完全新建的 feature** —— DB schema 不存在、feature 文件夹不存在、路由文件不存在。

## 现状盘点

**🔴 全部空**

- ❌ `db/schema/index.ts` 没有 `post` / `user_post` 表
- ❌ `src/features/posts/` 目录不存在
- ❌ `src/routes/admin/posts.tsx` 不存在
- ❌ `db/seed.ts` 仅在 MENU_SEED 里有菜单节点 `posts → /admin/posts`，没有数据 seed
- ✅ menu seed 已就绪：`code: "posts", path: "/admin/posts", icon: "Briefcase"` —— sidebar 自然显示

约束：本任务**必须**先建 post 表，否则后端无 service 可写。**`posts` 强依赖 `departments`**（02 已完成），所以执行前确认 02 已合并。

## 下一步顺序

### 步骤 1 · DB schema 新建 post 表

`db/schema/index.ts` 加：

```ts
export const post = pgTable("post", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  departmentId: uuid("department_id")
    .notNull()
    .references(() => department.id, { onDelete: "restrict" }),
  sort: integer("sort").notNull().default(0),
  status: statusEnum("status").notNull().default("enabled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type DbPost = typeof post.$inferSelect;

export const userPost = pgTable(
  "user_post",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);
```

字段命名照 `department` 表的形状（code/name/sort/status/deletedAt）。

### 步骤 2 · drizzle 生成迁移

```bash
npm run db:generate    # 期望产出 000X_post_table.sql
cat db/migrations/000X_*.sql  # 验 ALTER/CREATE TABLE 正确
npm run db:migrate     # 实际跑
```

然后用 `set -a; . ./.env; set +a; npx tsx` 跑 postgres query 验表存在。

### 步骤 3 · 用 gen:resource 生成骨架

```bash
npm run gen:resource -- post
```

这会创建 `src/features/posts/{schema,types,service,policy,actions}.ts` + `src/routes/api/v1/posts.ts`（如果用 REST 暴露）。

### 步骤 4 · types 改

gen:resource 出来的 stub 按部门逻辑改：

```ts
export type PostDto = {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  departmentName: string;       // join 出来
  sort: number;
  status: "enabled" | "disabled";
  userCount: number;             // 聚合 user_post
  createdAt: string;
  updatedAt: string;
};

export type ListPostsService = (input: {
  page; pageSize; keyword?; departmentId?; status?;
}) => Promise<{ items: PostDto[]; total: number }>;
// ... CreateUpdateDelete 三个签名
```

### 步骤 5 · schema

`posts.schema.ts`：post 字段校验，code 正则、name max 50、sort int、status enum。

### 步骤 6 · service

```ts
async function getUserCountMap(postIds: string[]): Promise<Map<string, number>> { ... }
async function getNameMapForDepartments(ids: string[]): Promise<Map<string, string>> { ... }

export const listPostsService: ListPostsService = async ({...}) => {
  // 同 users 模式：page → Promise.all([rows, total]) → 两次聚合 → toDto
};
```

### 步骤 7 · policy + actions

`assertCanManagePosts(ctx)` 同 roles 风格。actions 钩入。

### 步骤 8 · queries + use-mutations

`postsQueryKey` + `usePostsList(input)` + mutations 三个 hook。invalidate `postsQueryKey.all`。

### 步骤 9 · REST（可选）

gen:resource 生成的 `routes/api/v1/posts.ts` 已经写好基础，不动也跑通。

### 步骤 10 · admin 页面

`src/routes/admin/posts.tsx` 新建：

**布局**：
- title="岗位管理" description="维护岗位及其所属部门"
- 6 字段 filterBar：名称 / 编码 / 部门 / 状态 / 创建起 / 创建止
- 「+ 新增岗位」按钮

**表格列（对齐老系统截图）**：
| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 160 | name |
| 编码 | 140 | code |
| 部门 | 180 | departmentName truncate |
| 排序 | 70 | 数值居中 |
| 关联用户 | 90 | N 人 |
| 状态 | 90 | StatusBadge |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

操作列：「编辑 / 启用-禁用 / 更多（删除）」

### 步骤 11 · 编辑表单 EditPostFields

- 名称 Input
- 编码 Input（max 50, regex 字母数字下划线短横线）
- 部门 Select（拉 `useDepartmentsList({ status: "enabled" })`）
- 排序 InputNumber
- 状态 Select

### 步骤 12 · 单测

- posts.schema.test.ts
- posts.policy.test.ts
- posts.service.test.ts（如有 mock 的时间精力）

### 步骤 13 · 验证

```bash
npm run typecheck && lint && arch:check && test
npm run dev  # /admin/posts
```

特别验：
- 创建岗位、部门被删：service 阻止（restrict）
- 删除有用户的岗位：是否允许？service 行为决定；建议允许，靠 user_post 自动 cascade

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（当前 HEAD；本任务由子 agent 实施未提交，需 main agent 决定 commit 时机）
- 验证：`npm run typecheck && npm run lint && npm run arch:check && npm test -- src/features/posts/` 全绿；`npm test` 267/267 通过；dev 服探测 `GET /api/v1/posts` 返回 401（未登录）正常。
