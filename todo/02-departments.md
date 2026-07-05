# 02 · 部门管理

## 本任务目标

落地 `/admin/departments` 页面：用树形表格展示部门层级（parent/children），支持新增 / 编辑 / 禁用 / 删除。表单必填名称 / 编码 / 排序 / 父部门。对齐老系统：列表里 ID 列是从 1 自增的 UUID 短串、名称带层级前缀（例如「移山总部/技术部/前端组」）。

## 现状盘点

**后端 ✅ 完整**
- `src/features/departments/departments.schema.ts`
- `src/features/departments/departments.service.ts`（含 `getDepartmentTreeService`，递归 children 数组）
- `src/features/departments/departments.types.ts`（`DepartmentNode` 类型已含 children）
- `src/features/departments/departments.actions.ts`
- `src/features/departments/departments.schema.test.ts`（5 tests）
- `src/features/departments/departments.service.test.ts`（4 tests）
- `src/features/departments/departments.policy.ts`（stub 163B）

**前端 ⚠️ placeholder**
- `src/routes/admin/departments.tsx` 913B

**DB**：`department` 表已有 `parent_id`（uuid, 无 self-ref FK）/ `name`/`code`/`sort`/`status`/`created_at`/`updated_at`/`deleted_at`。

**特殊**：本表没有 FK 自引用约束（schema 写法 `parentId: uuid("parent_id")` 不带 `references()`），代码里靠 service 自洽校验避免环。

## 下一步顺序

### 步骤 1 · 补 policy stub

`src/features/departments/departments.policy.ts`：

```ts
export function assertCanManageDepartments(ctx: ServiceContext): void {
  if (!isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅系统管理员可管理部门");
  }
}
```

### 步骤 2 · actions 钩入 policy

每个 action 第一步 `await assertCanManageDepartments(ctx)`。**特别注意** `deleteDepartment`：删除前 service 校验是否有子部门/在职用户，要不要禁止？读 service.ts 看下，已写就保留；没写就补：
- 子部门非空 → 409 `Errors.conflict("请先删除子部门")`
- 关联在职用户 → 409 `Errors.conflict("该部门下还有在职用户")`

### 步骤 3 · use-mutations（没有现成的）

`src/features/departments/departments.use-mutations.ts` 新建：useCreate/useUpdate/useDelete，参考 roles 的同款。

### 步骤 4 · admin 页面重写

**布局**：
- title="部门管理" description="维护组织部门树"
- 树形表格（不用 6 字段 filterBar，部门层级天然是棵树）

**表格列（树形化）**：
| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 280 | 缩进 4 字符/层 + expand 三角 + name |
| 编码 | 140 | monospace 灰 |
| 排序 | 80 | 数值居中 |
| 关联用户 | 90 | N 人 |
| 状态 | 90 | StatusBadge |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

用 `<Table>` + 递归 `DepartmentRow` 渲染，children 数组 splice 到 `department_id` 对应行下。操作列下加「新增子部门」快捷入口（创建时预填 `parentId`）。

**过滤器（按老系统截图对齐）**：6 字段 filterBar 不合适，改成单行 toolbar：
- 顶部一个 `Input` 关键字搜（name + code 一起 like）
- 状态 Select（全部/启用/禁用）
- 「+ 新增部门」按钮

如果决定跟随 users 风格的 6 字段 filterBar，也可以拆成：名称 / 编码 / 状态 / 创建起 / 创建止 / 排序起；不强制。

### 步骤 5 · 编辑表单 EditDepartmentFields

- 名称 Input
- 编码 Input（max 50, regex `^[a-zA-Z0-9_-]+$`，唯一）
- 父部门 Select（id 列表，预填当前 parentId；不允许选自己或子部门，防环）
- 排序 InputNumber
- 状态 Select
- 删除前先校验：service 拒掉有子项

### 步骤 6 · 树形 UI 复选 / 拖拽

老系统截图（如果看得到）有拖拽排序、本期**不做**。本表 + sort 字段就够了。

### 步骤 7 · 测试补充

- departments.actions.test.ts：assertCanManageDepartments（之前可能没有）
- departments.service.test.ts 已经在 — 检查是否覆盖环检测 / 子部门非空删的 case，没有就加

### 步骤 8 · 验证

```bash
npm run typecheck && npm run lint && npm run arch:check && npm test -- src/features/departments/
```

特别验：
- 创建顶级部门「移山总部」+ 子部门「技术部」+ 孙部门「前端组」，列表层级正确
- 尝试将父部门 ID 改给自己或子部门：service 层应抛 400 或 409，不允许
- 删除有子部门的部门：service 报错 → 前端 errorMessage 透出

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（未提交改动；本次执行仅记录 hash）
- 验证：
  - `npm run typecheck` 通过
  - `npm run lint` 通过
  - `npm run arch:check` 4 项全 OK
  - `npm test -- src/features/departments/` → 3 文件 / 27 tests passed
  - `npm test` 全量 → 23 文件 / 164 tests passed，无回归

### 改动概览

- `src/features/departments/departments.policy.ts` — 接入 SYSTEM_ADMIN_IDS 鉴权
- `src/features/departments/departments.actions.ts` — 每个 action 钩入 assertCanManageDepartments；新增 getDepartment action
- `src/features/departments/departments.service.ts` — 新增 getDepartmentService、isDescendantOf、isDescendantOfInList；update 增加 parent 存在 + 环检测
- `src/features/departments/departments.types.ts` — 新增 GetDepartmentService 类型
- `src/features/departments/departments.queries.ts`（新） — useDepartmentsList / useDepartmentTree / useDepartmentDetail
- `src/features/departments/departments.use-mutations.ts`（新） — useCreateDepartment / useUpdateDepartment / useDeleteDepartment
- `src/features/departments/departments.policy.test.ts`（新） — 2 tests
- `src/features/departments/departments.schema.test.ts` — 扩展到 12 tests（边界 / 长度 / null）
- `src/features/departments/departments.service.test.ts` — 扩展到 13 tests（多级层级、isDescendantOfInList）
- `src/routes/admin/departments.tsx` — 重写为树形资源页：缩进 / 折叠三角 / 关键字+状态客户端过滤 / 编辑+新增子部门+删除 Popconfirm / sticky right 操作列
