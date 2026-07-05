# 10 · 门户管理（feature 全建）

## 本任务目标

新增 `/admin/portals` 全功能页面：维护多套「门户」（portal = 一套独立的 C 端站点，例如「主门户」「商城门户」「活动门户」），每套门户有独立 logo / 主题色 / 域名 / 默认模板。后端 `portal` 表 + 路由页面 + seed 一条菜单项 + 一条「主门户」初始数据。

## 现状盘点

**🔴 全部空**
- ❌ DB 无 portal / portal_theme 表
- ❌ `src/features/portals/` 不存在
- ❌ `src/routes/admin/portals.tsx` 不存在
- ❌ 当前 `MENU_SEED` 没有「portal」分组（这是旧菜单的「门户管理」分组）—— 需加在 seed 里

这是**最后一项**：依赖前面 9 个至少骨架完成；但本身 schema 不强依赖任何具体 feature，可**提前并行启动**。

## 下一步顺序

### 步骤 1 · DB schema 新建 portal 表

```ts
export const portal = pgTable("portal", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),                 // 显示名「主门户」
  code: text("code").notNull().unique(),        // 业务标识 "main"
  domain: text("domain"),                       // 绑定域名 "yishan.com"
  logoUrl: text("logo_url"),
  themePrimary: text("theme_primary"),          // #RRGGBB
  themeMode: text("theme_mode").notNull().default("light"),  // "light"|"dark"
  description: text("description"),
  status: statusEnum("status").notNull().default("enabled"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp(...).notNull().defaultNow(),
  updatedAt: timestamp(...).notNull().defaultNow().$onUpdate(...),
  deletedAt: timestamp(...),
});

export type DbPortal = typeof portal.$inferSelect;
```

enum 化 theme_mode：

```ts
export const portalThemeModeEnum = pgEnum("portal_theme_mode", ["light", "dark"]);
```

partial unique 在 `isDefault` 上，同 storages。

### 步骤 2 · drizzle 迁移 + db:migrate

### 步骤 3 · 用 gen:resource 生成骨架

```bash
npm run gen:resource -- portal
```

### 步骤 4 · types

```ts
export type PortalDto = {
  id, name, code, domain, logoUrl,
  themePrimary, themeMode, description,
  isDefault, status, createdAt, updatedAt
};

export type ListPortalsService = (input: { page; pageSize; keyword?; status? }) => Promise<{ items; total }>;
// CRUD 标准三件套
```

### 步骤 5 · schema

- name: 1-50
- code: regex `^[a-z0-9-]+$`
- domain: simple url validation
- themePrimary: regex `^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$`
- themeMode: enum

### 步骤 6 · service

注意与 storages 同款：
- `setDefaultPortalService`：事务内先清所有 default 再设新 default
- 删 default：阻止（必须先设另一个为 default）

### 步骤 7 · policy + actions

`assertCanManagePortals` = admin-only。

4 个 server-fn（CRUD + setDefault）。

### 步骤 8 · queries + use-mutations

`usePortalsList`, `usePortal(id)`, `useCreatePortal`, `useUpdatePortal`, `useDeletePortal`, `useSetDefaultPortal`。

invalidate `portalsQueryKey.all`。

### 步骤 9 · admin 页面

**布局**：
- title="门户管理" description="管理多套 C 端门户配置"
- 6 字段 filterBar：名称 / 编码 / 域名 / 是否默认 / 状态 / 创建起 / 创建止

**表格列**：
| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 180 | name + 「默认」chip（如 isDefault） |
| 编码 | 140 | code monospace 灰 |
| 域名 | 240 | domain truncate |
| 主题 | 120 | themePrimary 小色块 + themeMode chip |
| 状态 | 90 | StatusBadge |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

操作列：「编辑 / 设为默认 / 启用-禁用 / 更多（删除）」

### 步骤 10 · 编辑表单 EditPortalFields

- 名称 Input
- 编码 Input（regex）
- 域名 Input
- Logo URL Input + 预览（用 attachments 上传回来）
- 主题主色 Color Picker（HTML5 `<input type="color">`） → 同步显示 swatch
- 主题模式 Toggle（light/dark）
- 是否默认 Switch
- 描述 Textarea
- 状态 Select

### 步骤 11 · seed 添加 portal 菜单分组 + 默认数据

`db/seed.ts` 加：

```ts
// 1) MENU_SEED 末尾追加：
{
  code: "portal",
  name: "门户管理",
  parentCode: null,
  path: null,
  icon: "AppWindow",
  type: "group",
  sort: 2,
},
{
  code: "portals",
  name: "门户配置",
  parentCode: "portal",
  path: "/admin/portals",
  icon: "LayoutTemplate",
  type: "menu",
  sort: 0,
},

// 2) 末尾函数：
async function ensureDefaultPortal(): Promise<void> {
  const existing = await db.select().from(portal).where(eq(portal.code, "main")).limit(1);
  if (existing[0]) return;
  await db.insert(portal).values({
    name: "主门户", code: "main", domain: "yishan.com",
    themePrimary: "#1677ff", themeMode: "light",
    isDefault: true, status: "enabled",
  });
}
```

并 await 它在 seed 末尾。

### 步骤 12 · 单测

- portals.schema.test.ts：themePrimary regex 正反向
- portals.service.test.ts：setDefault 事务

### 步骤 13 · 验证

```bash
npm run db:reset          # 跑新 seed，主门户条目入表
npm run typecheck && lint && arch:check && test
npm run dev
```

特别验：
- sidebar 多了一个「门户管理」分组，下面有「门户配置」
- 创建 portal、设 default：立刻影响 sidebar 里的默认 portal 配置（如果有 navbar logo 显示）
- theme 选色器有效

### 完成记录

- 2026-07-05：全建完成。
  - 新增 `portal` 表 + `portal_theme_mode` enum（migration 0004_even_roughhouse.sql）。
  - `src/features/portals/` 全部文件齐全：schema / types / service / policy / actions / queries / use-mutations / 3 个测试。
  - `db/seed.ts` 加 `portal` 顶层分组 + `portals` 子菜单 + `ensureDefaultPortal` 种子（id 默认 portal，主门户 code=main）。
  - `src/routes/admin/portals.tsx` 6 字段 filter + 7 列 + sticky right 操作列（编辑 / 设为默认 / 启用-禁用 / 删除）+ HTML5 color picker。
  - `src/components/admin/layout/menu-icons.ts` 注册 `AppWindow` 和 `LayoutTemplate` 两个 lucide 图标。
  - 验证：`typecheck` / `lint` / `arch:check` 全过；测试 32 files / 249 tests 全绿；`db:migrate` 与 `db:seed` 跑通（菜单数 13 → 14）。
  - 待补：commit 由后续父 agent 在合 PR 时写入。

### 后续可扩展

- portal_acl 关联 user（一个 user 可属于多个 portal，按 portal context 切角色与权限）
- portal i18n：每 portal 独立语言包文件 + 多语言切换
