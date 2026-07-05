# 03 · 菜单管理

## 本任务目标

落地 `/admin/menus` 页面：树形展示菜单节点（group / menu / action 三类），支持新增子菜单、编辑、调整排序、删除（连同子节点级联）。完成后菜单数据通过 `useAuthorizedMenuTree` 自动反映到左侧 sidebar。

## 现状盘点

**后端 ✅ 完整 + queries**
- `src/features/menus/menus.schema.ts`
- `src/features/menus/menus.service.ts`
- `src/features/menus/menus.types.ts`（`MenuNode` 已含 `type: 'group'|'menu'|'action'` + `children: MenuNode[]`）
- `src/features/menus/menus.actions.ts`
- `src/features/menus/menus.queries.ts`（`useAuthorizedMenuTree()` 已实现 — sidebar 用了！）
- `src/features/menus/menus.policy.ts`（157B stub）
- `src/features/menus/menus.schema.test.ts`（13 tests）
- `src/features/menus/menus.service.test.ts`（11 tests）

**前端 ⚠️ placeholder**
- `src/routes/admin/menus.tsx` 942B

**DB**：`menu` 表齐全，类型 enum 已建。

**特别约束**：这是 RBAC 的核心 — sidebar 数据源、角色分配菜单的选项源都来自这表。改菜单要小心：
1. 不要让一个 enabled 系统菜单被误删（即使 enabled 也不能直接 DELETE 而不 cascade 到 role_menu/role 关联）
2. 删除顶级菜单节点：检查是否被角色引用、用户当前会话还在用

## 下一步顺序

### 步骤 1 · policy stub 扩开

```ts
export function assertCanManageMenus(ctx: ServiceContext): void {
  if (!isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅系统管理员可管理菜单");
  }
}
```

### 步骤 2 · actions 钩入 policy

最外层 `await assertCanManageMenus(ctx)`。

**service 已有行为需复核**（看 `menus.service.ts`）：
- 删除顶级菜单：是否禁止？service 应当抛 forbidden 给系统菜单（code 命中 list 里的禁用删除名单，例如 `dashboard` / `system` 不能删）
- 删除叶菜单：是否禁止若被启用角色引用？service 抛 conflict 即可

### 步骤 3 · 兜底联动：「更新菜单」触发 `useAuthorizedMenuTree` 缓存刷新

> 这是关键：任何 `createMenu/updateMenu/deleteMenu` 后必须让 sidebar 立刻反映。

`src/features/menus/menus.queries.ts` 当前已有 `useAuthorizedMenuTree` 的 queryKey。subagent 在写 `use-mutations.ts` 时必须在 `onSuccess` 里 invalidate `menusQueryKey.all`，与 users 那次一样的姿势。

### 步骤 4 · use-mutations

`src/features/menus/menus.use-mutations.ts` 新建（参考 users/use-mutations.ts 范式）：
- useCreateMenu
- useUpdateMenu（含 type 切换：group 不要 menuIds；menu 必须 path + component 可空）
- useDeleteMenu
- useBatchUpdateMenuSort（拖拽后批量更新 sort 用；本期可不做，但 hooks 类型先放好）

### 步骤 5 · admin 页面重写

**布局**：
- title="菜单管理" description="维护后台菜单树（修改后左导航自动同步）"
- 树形表格而非 6 字段 filter（部门/菜单都是树，不要硬套）

**表格列**：
| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 280 | 缩进（4 字符/层）+ 三角 + name + 图标 chip |
| 类型 | 90 | 标签（group/menu/action 三色 StatusBadge） |
| 路径 | 220 | name + monospace path truncate |
| 权限标识 | 140 | permission truncate（仅 menu/action 显示） |
| 排序 | 70 | 数值居中 |
| 状态 | 90 | StatusBadge |
| 操作 | 200 | sticky right |

**行操作**：「编辑 / 新增子菜单 / 启用-禁用 / 更多（删除）」

**顶部 toolbar**：
- 关键字 Input（搜 name/path/permission）
- 类型 Select（全部/group/menu/action）
- 状态 Select
- 「+ 新增顶级菜单」按钮（创建顶级 group，给后台做新栏目）

### 步骤 6 · 编辑表单 EditMenuFields

- 名称 Input
- 类型 Select（三个枚举）
- **类型联动**：选 group → 隐藏 path / component / permission；选 menu → 显示 path + component 可空；选 action → 显示 permission 必填
- 图标 Select（用现有 lucide 列表，列在 `src/components/admin/layout/menu-icons.ts` 里的枚举去选）
- 路径 Input（按 type 决定是否显示）
- 组件 Input（path 同）
- 权限标识 Input（permission，按 type 决定是否显示）
- 排序 InputNumber
- 父级 Select（拉到 enabled 节点，只显示合法 parent type）

### 步骤 7 · 单测 & 验证

```bash
npm run typecheck && lint && arch:check && test -- src/features/menus/
npm run dev
```

特别验：
- 在 `/admin/menus` 改一个菜单的图标 / 名称 → 刷新或 hard-refresh，左侧 sidebar 立即变
- 删除顶级菜单 `dashboard`：应 403 / 409（系统菜单保护）
- 创建新顶级菜单：在 sidebar 立即多一项

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（本次无新提交，按当前 hash 记）
- 验证：typecheck 0 error（仅余 dicts.tsx 既有 TS 错误，与本任务无关）· lint 0 error · arch:check 4/4 OK · `npm test -- src/features/menus/` 20/20 · `npm test` 全量 164/164
