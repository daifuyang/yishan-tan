# 测试覆盖与验证状态

更新日期：2026-10-09，以同日实际运行结果为准。旧 16 文件 / 115 用例统计已失效。

## 实际检查

| 命令 | 结果 |
| --- | --- |
| npm test | 40 个文件、337 个测试全部通过 |
| npm run typecheck | 通过 |
| npm run arch:check | 全部通过，含 11 张资源列表检查 |
| npm run lint:check | 全仓失败：269 errors / 1 warning，包含既有换行、格式、import 排序等；本次代码单独检查通过，保留既有 any 警告 |
| NODE_ENV=production vite build | 客户端与服务端构建通过 |

本日调研后已实现 A01 用户、部门、岗位、字典权限接入，详见 [实施说明](./user-permissions.md)。未执行原版 Yishan 的测试。

新增 permissions.integration.test.ts 使用独立内存 PGlite 执行完整迁移，验证真实关系查询/事务、撤销/禁用、角色越权、管理员保护，以及 REST/Server Function handler 的拒绝和授权写入，共 11 用例。请求上下文和框架适配层使用替身，真实会话传输仍待验证。

浏览器使用真实用户/角色页面、生产 CSS 和隔离动作数据替身，验证只读按钮、编辑权限、搜索 draft 不触发查询/翻页、提交回第一页，以及角色编辑菜单/操作权限回填保存。该验证不覆盖真实账户登录及线上服务。

## 覆盖范围

- 共享工具：错误、分页、授权、日期范围、数据库连接串。
- HTTP：响应和错误映射、请求参数解析。
- Schema：auth/users/roles/departments/menus/dicts/system-settings/posts/storages/attachments/login-logs/portals。
- Policy：用户、角色、部门、菜单、字典、系统选项、岗位、存储、附件、日志、门户。
- Service：菜单/部门树与约束、存储/门户局部逻辑、附件局部 mock、日志纯逻辑。
- 前端数据消费：系统选项分组、queries、mutations。

所有测试文件位于 src 下，统计以 npm test 实际输出为准。不要把包含 service 字样的测试自动视为真实数据库集成测试。

## 尚未完成的验收

- 真实隔离 PostgreSQL 的事务、约束、删除/禁用、多关系更新。
- REST 与 Server Function 的身份、接口权限、数据范围、响应契约。
- Redis 登录限流、失败日志与账户状态、会话/Key 撤销行为。
- 浏览器搜索提交、重置、翻页、树展开、错误/空状态、编辑、批量操作与响应式。
- local 上传文件的实际访问、删除；七牛/OSS 真实上传、登记和失败清理。
- 设置保存后的运行时效果，个人中心和工作台真实数据。
- 生产构建、独立 FC3 产物及部署 smoke。

使用隔离测试资源，不以 db:reset 替代集成验证。具体待办见 [TODO 总览](../todo/README.md)，功能验收条件见 [对齐调研](./yishan-alignment-review.md)。
