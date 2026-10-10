# 用户管理操作权限：A01 第一批

实施日期：2026-10-09。A01 当前完成用户管理试点，其它业务域尚未接入操作权限，仍沿用超级管理员限制。数据范围属于 A02，尚未执行查询过滤。

## 授权方式

超级管理员在角色编辑页分别配置菜单和操作权限。菜单控制导航入口，角色的 permissionCodes 才授予操作权限；菜单 permissionCodes 仅作为关联描述，不自动赋权。

| 权限 | 能力 |
| --- | --- |
| users:read | 搜索、列表、详情 |
| users:create | 新增用户 |
| users:update | 编辑、启停 |
| users:delete | 删除 |
| users:reset-password | 重置密码 |
| users:export | 导出 |
| users:assign-roles | 分配或清空业务角色 |

页面需要 users:read。新增、编辑和分配角色独立授权。非超级管理员不能修改超级管理员，不能分配系统角色或超出自身操作权限的角色。启用且未删除的角色参与权限计算，每次服务端请求读取当前关系，撤销与禁用在下一次请求生效。

REST 与 Server Function 使用同一授权策略；前端禁用未授权按钮。编辑用户的部门/岗位选项通过受限表单接口提供，不要求开放部门或岗位管理权限。登出清理查询缓存。

## 升级与兼容

已生成增量迁移 `db/migrations/0001_fearless_misty_knight.sql`，新增 role_permission 和 menu_permission 两张关系表。真实环境尚未执行迁移；上线前备份并运行 `npm run db:migrate`。原有角色不会自动获得操作权限，需要超级管理员明确分配；既有超级管理员规则保留。

`POST /api/v1/users` 改为受保护的管理创建接口，需要 users:create；传入 roleIds 还需要 users:assign-roles。匿名请求返回 401，不再作为公开注册入口。非超级管理员 API Key 暂不继承业务角色操作权限，scopes 与权限交集留待 A06。

## 验证与剩余范围

40 个测试文件 / 329 用例通过，包含 11 个 PGlite 集成用例：执行完整迁移、关系保存与回滚、撤销、禁用、越权分配、管理员保护，以及真实 REST/Server Function handler 的授权与写入。HTTP 请求上下文和框架适配层使用测试替身，未覆盖真实会话传输。

浏览器运行真实用户/角色页面及生产 CSS，使用隔离数据替身，验证只读按钮、编辑权限、查询提交与翻页、角色编辑的原有菜单/操作权限回填和保存。不是线上账户端到端验收。真实 PostgreSQL/Redis、会话/API Key 生命周期、其它业务域权限与 dataScope 仍待后续完成。

typecheck、arch:check、生产 Vite 构建通过。本次修改代码的 Biome 检查通过，保留 schema 既有 any 警告；全仓 Lint 仍有历史诊断。
