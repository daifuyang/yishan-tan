# 老系统后台菜单迁移 checklist 总览

> 把"移山后台管理系统"中 14 个后台菜单项，**一项一项**对齐到 yishan-tan。
> 索引：seed `MENU_SEED`（`db/seed.ts:107-179`）+ 老系统截图。

## 状态总览

| 序号 | 文件 | 老系统菜单 | 后端 | 前端 | 状态 |
|---|---|---|---|---|---|
| — | `00-users.md` | 用户管理 | ✅ 完整 | ✅ 完整 | 🟢 **参考实现** |
| 01 | `01-roles.md` | 角色管理 | ✅ 完整 | ⚠️ placeholder | 🟡 前端补 |
| 02 | `02-departments.md` | 部门管理 | ✅ 完整 | ⚠️ placeholder | 🟡 前端补 |
| 03 | `03-menus.md` | 菜单管理 | ✅ 完整 + queries | ⚠️ placeholder | 🟡 前端补 |
| 04 | `04-dicts.md` | 字典管理 | ✅ 完整 | ⚠️ placeholder | 🟡 前端补 |
| 05 | `05-settings.md` | 站点配置 | ✅ 完整 | ⚠️ placeholder | 🟡 前端补 |
| 06 | `06-posts.md` | 岗位管理 | ❌ 无 | ❌ 无 | 🔴 全建 |
| 07 | `07-storages.md` | 云存储 | ❌ 无 | ❌ 无 | 🔴 全建 |
| 08 | `08-attachments.md` | 媒体库 | ❌ 无 | ❌ 无 | 🔴 全建 |
| 09 | `09-login-logs.md` | 登录日志 | ⚠️ 表 + writeLog | ❌ 无路由 | 🟡 后端 list + admin 路由 |
| 10 | `10-portals.md` | 门户管理 | ❌ 无 | ❌ 无 | 🔴 全建 |

**总计**：🟢 1 完成参考 + 🟡 6 前端/路由补 + 🔴 4 feature 全建。

## 工作顺序（依赖图）

```
[00] users ✅
      ↓ 提供 service / queries / multi-select.tsx / sticky 列表参考
     ┌────────────────────────────┐
     │                            │
[01] roles                  [02] departments
     │                            │
     │                       [06] posts  ← 依赖 departments
     │
[04] dicts → [05] settings  ← dicts 是 enum 选项源
     
[03] menus（独立）              [09] login-logs（独立）
     
[07] storages → [08] attachments
     
[10] portals（最后）
```

可并行组：
- **A 组**：roles / departments / menus / login-logs 四个独立
- **B 组**：dicts（等 A 出结果再起 settings）
- **C 组**：storages（等 C 出 attachments）
- **D 组**：posts（等 departments 完成）
- **E 组**：portals（最末尾独立）

## 子 agent 执行规则

1. **每份清单**：单 subagent 实施一个清单，不要混做
2. **每步完成**：跑对应验证再勾选 `[x]`，未验证别勾
3. **schema 改动后**：先 `npm run db:generate` 看 SQL，跑 `db:migrate` 验证后再动 service
4. **路径脚本**：CI 必跑 `npm run typecheck && lint && arch:check && test`
5. **勾完一份**：在 todo/ 文件末尾「完成记录」追加日期 + commit hash（`git rev-parse --short HEAD`）

## 标准 checklist 步骤速查

每份清单都按这个节奏组织 subagent：1) DB → 2) types → 3) schema → 4) service → 5) policy → 6) actions → 7) queries+mutations → 8) REST(可选) → 9) tests → 10) admin 页面 → 11) 验证。

完整模板和"为什么这么排"在 `00-users.md`。

## 关键参考文件路径（subagent 必读）

```
# ===== 数据层 =====
db/schema/index.ts                 # 字段命名严格遵循 better-auth 默认约定
db/migrations/                     # 所有 ALTER 都在这，每个 PR 一个 000X_*.sql
db/seed.ts:107-179                 # MENU_SEED 列表，新菜单需在这注册

# ===== 范式参考（每份 subagent 必读） =====
src/features/users/users.schema.ts          # zod schema 写法
src/features/users/users.types.ts           # DTO + service 签名
src/features/users/users.service.ts         # toXxxDto + 事务写法
src/features/users/users.policy.ts          # policy stub（最简单的形式）
src/features/users/users.actions.ts         # createServerFn
src/features/users/users.queries.ts         # queryOptions + useAssignableRoles（跨 feature query 首例）
src/features/users/users.use-mutations.ts   # useMutation + invalidate
src/routes/admin/users.tsx                  # 9 列 + sticky right + 6 字段 filter + 编辑表单
src/components/admin/form/multi-select.tsx  # 通用多选组件（按用户分配角色 / 按角色选菜单会用到）

# ===== 共享组件 =====
src/components/admin/data-table/resource-table.tsx   # 列宽 + sticky helper
src/components/admin/data-table/filter-bar.tsx       # 6 字段 + collapse
src/components/admin/form/index.ts                   # MultiSelect, ResponsiveFormLayer, Popconfirm

# ===== 基础设施 =====
src/lib/authorization.server.ts                      # requireAdmin + SYSTEM_ADMIN_IDS
src/lib/errors.ts                                    # Errors.{unauthenticated,forbidden,notFound,conflict,invalid,...}
src/lib/service-context.ts                           # ServiceContext 类型

# ===== 架构约束（arch:check 会扫） =====
scripts/arch/check-all.mjs                           # routes 不得 import db, services 不得 import routes
scripts/arch/check-naming.mjs                        # <domain>.* 前缀 + 复数规则

# ===== 资源生成器 =====
scripts/generators/gen-resource.ts                   # npm run gen:resource -- <domain>  # 全建时跑这个
```

## 验证清单

每份 subagent 实施完毕必须自检：

- [ ] `npm run typecheck` 通过（tsc --noEmit 0 error）
- [ ] `npm run lint` 通过（biome check 0 error / warning）
- [ ] `npm run arch:check` 4 项全 OK（最严：routes 不引 db；services 不引 routes）
- [ ] `npm test -- src/features/<domain>/` 全绿
- [ ] `npm run dev` 浏览器到 `/admin/<slug>`：列对齐老系统、过滤器 6 字段、编辑/删除/分配 e2e 通
- [ ] 该 feature 文件清单末尾「完成记录」追加 git rev-parse HEAD
