# 操作权限接入：A01.3 与 A01.4 第一批

实施日期：2026-10-10。A01 已完成用户、部门、岗位、字典、角色、菜单六个资源域的操作权限接入；配置、存储、媒体、日志、门户仍待接入。数据范围属于 A02，尚未执行查询过滤。

## 授权方式

超级管理员在角色编辑页分别配置菜单和操作权限。菜单控制导航入口，角色的 permissionCodes 才授予操作权限；菜单 permissionCodes 仅作为关联描述，不自动赋权。部门、岗位和字典操作沿用同一目录与实时关系查询。

| 权限 | 能力 |
| --- | --- |
| users:read | 搜索、列表、详情 |
| users:create | 新增用户 |
| users:update | 编辑、启停 |
| users:delete | 删除 |
| users:reset-password | 重置密码 |
| users:export | 导出 |
| users:assign-roles | 分配或清空业务角色 |

角色和菜单分别使用 `roles:read/create/update/delete` 与 `menus:read/create/update/delete`。普通管理员给角色或菜单保存 `permissionCodes` 时，只能授予自己已有的操作权限；系统默认角色仍只能由超级管理员修改。

页面需要 users:read。新增、编辑和分配角色独立授权。非超级管理员不能修改超级管理员，不能分配系统角色或超出自身操作权限的角色。启用且未删除的角色参与权限计算，每次服务端请求读取当前关系，撤销与禁用在下一次请求生效。

REST 与 Server Function 使用同一授权策略；前端禁用未授权按钮。编辑用户的部门/岗位选项通过受限表单接口提供，不要求开放部门或岗位管理权限。登出清理查询缓存。

## 升级与兼容

已生成增量迁移 `db/migrations/0001_fearless_misty_knight.sql`，新增 role_permission 和 menu_permission 两张关系表。真实环境尚未执行迁移；上线前备份并运行 `npm run db:migrate`。原有角色不会自动获得操作权限，需要超级管理员明确分配；既有超级管理员规则保留。

`POST /api/v1/users` 改为受保护的管理创建接口，需要 users:create；传入 roleIds 还需要 users:assign-roles。匿名请求返回 401，不再作为公开注册入口。非超级管理员 API Key 暂不继承业务角色操作权限，scopes 与权限交集留待 A06。

## 已完成的资源域

部门、岗位和字典类型/数据均按读取、新增、编辑、删除分别校验；部门导出单独使用 `departments:export`。REST 与 Server Function 使用同一授权策略，页面按钮按权限禁用，表单选项只通过最小字段接口提供。真实隔离 PostgreSQL、Redis 和浏览器会话已验证只读、编辑、无权限、管理员及授权撤销场景。

角色、菜单已按读取、新增、编辑、删除分别校验，菜单树读取使用 `menus:read`；授权入口和页面按钮沿用同一权限目录。角色/菜单的 REST、Server Function、权限码越权分配和系统默认角色保护已通过隔离 PGlite 集成测试，真实浏览器会话验收待补。

## 验证与剩余范围

40 个测试文件 / 338 用例通过，包含 20 个 PGlite 集成用例：执行完整迁移、关系保存与回滚、撤销、禁用、越权分配、管理员保护，以及真实 REST/Server Function handler 的授权与写入。HTTP 请求上下文和框架适配层使用测试替身，未覆盖真实会话传输。

浏览器使用隔离 PostgreSQL/Redis 的真实 session，已验证用户、部门、岗位、字典的只读/编辑/无权限/管理员页面、查询提交与翻页、危险操作焦点、管理员 REST CRUD、批量删除及授权撤销；角色、菜单的真实浏览器会话验收待补。不是线上账户端到端验收。真实 API Key 生命周期、配置、存储、媒体、日志、门户权限与 dataScope 仍待后续完成。

typecheck、arch:check、生产 Vite 构建通过。本次修改代码的 Biome 检查通过，保留 schema 既有 any 警告；全仓 Lint 仍有历史诊断。
