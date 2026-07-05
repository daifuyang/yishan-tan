# 01 · 角色管理

## 本任务目标

落地 `/admin/roles` 页面：列表展示角色（名称 / 编码 / 描述 / 状态 / 创建时间 / 操作），编辑表单里能勾选「菜单权限树」给该角色分配权限。完成后路径不可错（路径常量写死），删除走 Popconfirm 多选删除要走批量。

## 现状盘点

**后端 ✅ 完整**
- `src/features/roles/roles.schema.ts` — list/create/update 三个 schema，max(100) 分页
- `src/features/roles/roles.service.ts` — CRUD + 关联菜单 + 关联用户，事务写法
- `src/features/roles/roles.types.ts` — `RoleDto` / `RoleDetailDto`（含 `menuIds: string[]`）+ 5 个服务签名
- `src/features/roles/roles.actions.ts` — server-fn 完整，含 `listRoles/getRole/createRole/updateRole/deleteRole`
- `src/features/roles/roles.queries.ts` — `useRolesList(input)` 已实现
- `src/features/roles/roles.policy.ts` — 157 字节 stub
- `src/features/roles/roles.schema.test.ts` — 9 tests

**前端 ⚠️ placeholder**
- `src/routes/admin/roles.tsx` 仅 PageHeader + Placeholder（916B）

**DB seed**：roles 表已建；`role_menu` 关联表已建；`role_status_enum` 已建。

**架构层无破坏**：arch:check 应当通过

## 下一步顺序

### 步骤 1 · 补 policy（**先放开 stub**）

`src/features/roles/roles.policy.ts` 157 字节太单薄，扩成：

```ts
export function assertCanManageRoles(ctx: ServiceContext): void {
  if (!isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅系统管理员可管理角色");
  }
}
```

可以的话同时给 `roles.policy.test.ts` 加 2 个 case（admin / non-admin）。

### 步骤 2 · actions server-fn 加 policy 钩子

`src/features/roles/roles.actions.ts`：每个 handler 最前 `await assertCanManageRoles(ctx)`（adminCtx 已存在）；保护 list/get/create/update/delete。

### 步骤 3 · 新建 use-roles-mutations 客户端 hooks

```ts
// src/features/roles/roles.use-mutations.ts
useCreateRole, useUpdateRole, useDeleteRole, useBulkDeleteRoles
```

参考 `src/features/users/users.use-mutations.ts` 的 3 个 hook 范式（useMutation + invalidate `rolesQueryKey.all`）。

### 步骤 4 · 路由页 admin/roles.tsx 重写

替换 placeholder 为 `ResourcePage`：

**布局**：
- title="角色管理" description="维护业务角色与菜单权限"
- filterColumns={3} filterDefaultCollapsed（默认收起，对齐老系统截图第 1 张的"收起"按钮）
- 主体表格 + toolbar「新增」按钮

**过滤器 6 字段（参考 users 截图对齐）**：
- 名称 / 编码 / 描述（key 为 description）/ 状态 / 创建时间起 / 创建时间止
- 描述字段用 `description` 而不是 `keyword`，对齐 users 的拆分风格（一个表单干一件事）

**表格列（7 列 + 操作列冻结）**：
| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 140 | name truncate |
| 编码 | 160 | code monospace 灰色 |
| 描述 | 240 | description truncate |
| 关联用户 | 100 | N 人（聚合 service 拿） |
| 关联菜单 | 100 | N 个（聚合 service 拿） |
| 状态 | 90 | StatusBadge enabled/disabled |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

**操作列按钮**：「编辑 / 启用-禁用 / 更多（删除）」

**编辑表单 EditRoleFields**：
- 名称 Input（max 50）
- 编码 Input（max 50, regex `^[a-zA-Z0-9_-]+$`，不可改同 code）
- 描述 Textarea
- 状态 Select
- **菜单权限树**：用 `MultiSelect`（`src/components/admin/form/multi-select.tsx`）跨 feature 拉 `useMenusList({ status: "enabled" })`，展示「菜单名 + 路径」副标。提交时 `menuIds: string[]` 整批写入

### 步骤 5 · 菜单权限树选择 UI（重点）

老系统截图里角色编辑有树形选择菜单，本项目用 `MultiSelect` 多选替代（先这样，因为「树形穿梭」UI 工作量大且现有 `<MenuNode>` 数据模型是平铺 children 数组）。

如果后续要树形，先建一个 `TreeTransfer.tsx` 在 `src/components/admin/form/`，input 选项 `value: string[]`（所有被勾选的 id），`onChange`。本期不做。

### 步骤 6 · 单测补充

- roles.actions.test.ts：模拟 admin / 普通用户两种 ctx，验 `assertCanManageRoles`（之前可能没有）
- roles.use-mutations.ts 不写测试（薄包装，价值低）

### 步骤 7 · 验证

```bash
npm run typecheck && npm run lint && npm run arch:check && npm test -- src/features/roles/
npm run dev  # 进 /admin/roles 跑一遍增删改查
```

特别验：
- 编辑某个角色，勾掉所有菜单 → `menu_ids` 写入；下次进入菜单 `/admin/menus` 看 角色分配缓存 是否一致
- 测试 with `assertCanManageRoles`：登普通用户直接 POST `/api/v1/roles`，应当 403

### 完成记录

- 日期：__
- commit：`git rev-parse --short HEAD`
- 验证：`npm run` ... 输出贴在这里
