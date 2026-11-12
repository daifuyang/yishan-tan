# Yishan 与 yishan-tan 功能对齐调研

调研日期：2026-10-09。目标是核对业务能力，而不是复制旧后台版式。

实施更新：A01 已完成用户、部门、岗位、字典、角色、菜单的操作权限接入，并开始推广配置、存储、媒体、日志、门户权限，详见 [实施说明](./user-permissions.md)。下文差异表保留调研时基线；A02 数据范围仍未完成。当前测试、arch:check、生产构建和全仓 Lint 均已通过。

## 1. 基线和方法

原版是本地相邻仓库 `C:/Users/dfy/workspace/products/yishan`，HEAD `684e4f3`，存在未提交变更；比较基线为本日工作区源码，不是仅比较该提交。tan 也有既有未提交改动。本轮只更新 tan 文档，不修改原版，不执行迁移、seed、数据库重置或部署。

核对范围：原版 system-api 的表、schema、service、路由、权限与 Admin 页面；Demo manifest 及 portal/shop/CRM 源码目录；tan 的 db/schema、feature、REST、后台路由及组件。未连接两边线上服务，未执行原版测试。配置字段、接口、UI、运行时消费者分开检查。

旧 [页面对照](./references/YISHAN_ADMIN_ROUTE_ALIGNMENT.md) 是历史参考：其中 post 页面路径已不存在，portal 业务页面已迁入 modules；tan 的批量操作、导出、重置密码和站点字段也已更新，不能原样作为 TODO。

主要证据入口（链接指向两边本地源码）：

| 范围 | 原版 | tan |
| --- | --- | --- |
| 数据模型 | [tables](../../yishan/packages/core/system-api/src/db/schema/tables.ts) | [schema](../db/schema/index.ts) |
| 用户 | [UserForm](../../yishan/apps/yishan-admin/src/pages/system/user/components/UserForm.tsx)、[user schema](../../yishan/packages/core/system-api/src/core/schemas/user.ts) | [用户页](../src/routes/admin/users.tsx)、[用户业务](../src/features/users/users.service.ts) |
| 权限 | [路由权限](../../yishan/packages/core/system-api/src/route-permissions.ts)、[权限业务](../../yishan/packages/core/system-api/src/core/services/permission.service.ts)、[JWT/PAT](../../yishan/packages/core/system-api/src/core/plugins/external/jwt-auth.ts) | [管理员鉴权](../src/lib/authorization.server.ts)、[角色 policy](../src/features/roles/roles.policy.ts)、[后台守卫](../src/routes/admin/route.tsx) |
| 角色/菜单 | [RoleForm](../../yishan/apps/yishan-admin/src/pages/system/role/components/RoleForm.tsx)、[MenuForm](../../yishan/apps/yishan-admin/src/pages/system/menu/components/MenuForm.tsx) | [角色页](../src/routes/admin/roles.tsx)、[菜单业务](../src/features/menus/menus.service.ts) |
| 媒体 | [附件业务](../../yishan/packages/core/system-api/src/core/services/attachment.service.ts)、[附件路由](../../yishan/packages/core/system-api/src/core/routes/api/v1/admin/attachments/index.ts) | [媒体页](../src/routes/admin/attachments.tsx)、[上传](../src/routes/api/uploads.ts)、[附件业务](../src/features/attachments/attachments.service.ts) |
| 存储 | [配置页面](../../yishan/apps/yishan-admin/src/pages/system/storage/index.tsx)、[七牛凭证](../../yishan/packages/core/system-api/src/core/routes/api/v1/admin/system/qiniu/index.ts) | [驱动](../src/lib/storage-driver/index.ts)、[存储页](../src/routes/admin/storages.tsx) |
| 账户 | [个人中心](../../yishan/apps/yishan-admin/src/pages/account/center/index.tsx)、[Token 契约](../../yishan/packages/core/system-api/src/core/schemas/api-token.ts) | [用户 actions](../src/features/users/users.actions.ts)、[Key 路由](../src/routes/api/v1/api-keys/index.ts) |
| 产品模块 | [manifest](../../yishan/apps/demo/api/src/manifest.ts) | [门户内容](../src/routes/admin/portal/articles.tsx)（分类 / 文章 / 页面 / 模板） |

## 2. 总体结论

系统管理的主要 CRUD 已迁移，但与当前原版尚未功能等价。最大差距在权限执行、媒体管理、云存储和账户管理；另缺地区与模块管理。字段缺口集中在部门/岗位描述、字典排序/默认值/标签及菜单行为。门户元配置是 tan 新能力，不能替代原版门户内容。

不提供完成百分比：两边范围不同，而且原版代码存在不等于已运行验收；将页面数当成功能完成度会掩盖权限与配置未生效问题。

## 3. 基座能力差异及验收

下列编号与 [TODO](../todo/README.md) 一致。P1/P2 是本次建议顺序，不表示用户已经承诺全部业务范围。

| 编号 | 原版当前能力 | tan 当前情况与缺口 | 最低验收要求 |
| --- | --- | --- | --- |
| A01 / P1 | 路由声明权限目录；sys_menu_permission 多权限绑定；sys_role_permission；角色表单提交 permissionCodes | 菜单只有单 permission，角色主要绑定 menuIds；后台菜单可授权，但资源操作仍普遍要求超管 | 同一资源“可读不可写”；无菜单/按钮也不能直接调接口；REST 与 Server Function 权限一致 |
| A02 / P1 | 角色 dataScope；业务模块有数据范围应用，例如 CRM data-scope 契约 | 保存/显示 dataScope，但查询未消费；无自定义部门范围关系 | 分别验证全部/本部门/下级/本人/自定义范围；跨部门读写拒绝。原版每域是否实际应用也需分别核实，不宣称全域已执行 |
| A03 / P1 | hideInMenu、isExternalLink、keepAlive、isDefaultAction、permissionCodes；Admin patchClientRoutes 使用 component 映射 | 缺相应字段；component 仅存储，实际页面由文件路由注册 | 隐藏不等于无访问权限；外链正确打开；默认动作明确；组件受控映射；缓存行为实际验证 |
| A04 / P1 | 七牛/OSS 配置、配置导入导出，七牛真实 uptoken 路由；附件登记流程 | 多存储记录可管理，但只有 local put/delete 实现，其余驱动抛未实现错误 | 优先七牛配置→临时凭证→上传→登记→访问；OSS 按所选流程单独验证；隔离 bucket 测清理及失败分支；配置导入导出不泄露密钥 |
| A05 / P1 | 分组树/子分组 CRUD、素材编辑/分组/状态、批量删除、远程图片导入、媒体展示 | 表格上传/查询/复制/批量删除已实现；无分组模型、素材更新动作与远程导入 | 分组父子约束、重命名/移动/状态、失败上传不留孤立记录；对象清理失败有可追踪结果。保留 tan 表格主体，不强制复制卡片网格 |
| A06 / P1 | 个人中心资料与安全面板；PAT scopes、期限、撤销；tokenScope 与角色权限取交集 | 本人改密/Key API 存在，无个人中心；Key 创建仅 name、固定一年，缺可选 scopes 与交集链路 | 资料保存/改密/Key 创建撤销可操作；只展示一次明文；最小权限、到期/撤销不可用；Key 不扩大用户权限 |
| A07 / P1 | sys_user_dept 多部门；用户 status 与 deletedAt 分离 | user.deptId 单部门；禁用与删除共用 deletedAt | 明确多部门范围并迁移关系；禁用可恢复，删除语义独立；用户名/邮箱登录、现有 session、Key 都遵循状态规则。本轮只确认模型差异，未运行漏洞复现 |
| A08 / P2 | 部门/岗位 description；当前岗位页面为 system/position | department/post 无 description；岗位新增部门关联是 tan 扩展 | schema→数据库→DTO→表单持久化；详情/导出等需要时保留描述；勿继续引用不存在的 post 页面 |
| A09 / P2 | dictType.sortOrder，dictData.tag/isDefault，设为/取消默认 | 数据 sort 已有，类型缺 sort；数据无 tag/isDefault，extra 不能替代明确语义 | 排序稳定；默认约束/切换；标签样式使用有效映射；字典消费者使用默认值 |
| A10 / P2 | 登录日志含姓名 | tan 表格/DTO 主要账号/IP/UA/状态/消息，没有姓名 | 姓名显示与用户删除后的历史记录策略一致；真实失败登录写入验证 |
| A11 / P2 | system/region 页面及 regions 路由、地区模型/种子 | 无地区 feature/路由/表 | 按层级加载和查询省市区、关联有效性、控件联动 |
| A12 / P2 | 模块安装清单、依赖排序、迁移/seed贡献、运行时 enabled 与管理页 | 无对应模块体系或管理页面 | 安装与启停区分，禁用流量保留数据；依赖/版本/未知模块行为；不能只做一个状态表格 |

云存储范围注意：原版有 OSS 配置字段不等于已经实现完整 OSS 文件生命周期；本轮确认七牛凭证的真实代码，不把原版所有供应商都写成已验收。COS/S3/MinIO 是 tan 驱动扩展，不能全部算原版对齐必需项。

模块管理范围注意：原版 system/module-management 页面显式在生产跳转 404，页面只提供 list + toggle，迁移/seed 仍走 CLI。模块装配与运行时状态是底层能力；迁移管理页面时应保留环境边界，不将开发管理入口直接暴露到生产。

## 4. 已对齐或已补齐，移出缺功能清单

- 用户批量删除、CSV 导出、管理员重置密码已有 actions/service/UI，不再称“重置密码占位”。用户编辑不直接改密码，走单独重置是当前交互选择。
- 部门批量删除、导出已有；角色、岗位、菜单、字典类型/数据、附件批量删除已有。
- 站点名称、域名、标题、Logo/Favicon、SEO、备案、邮箱/电话/地址、页脚 13 类基础字段已在 system-settings.groups.ts 声明并由配置页保存；旧对照“站点字段缺失”已失效。运行时消费者另列 Q03。
- 岗位、存储、附件、日志、门户内容 feature 和页面都存在；旧 TODO 的“全建/无路由”不成立。
- 登录日志详情、更多筛选、用户/岗位关系、多存储是 tan 的附加能力，不应为照搬原版而删除。

## 5. 交互差异与当前工程缺口

这些问题应与原版功能迁移区分：

| 编号 | 已核实问题 | 验收 |
| --- | --- | --- |
| Q01 | users、roles、dicts、dicts/$typeCode、attachments、storages、portals 的 effect 监听 draft 并重置页码；多页提交只 setFilters | 第 N 页编辑草稿不请求/不变页；提交/重置回第一页；展开搜索不请求。逐页验 posts/login-logs 等提交逻辑 |
| Q02 | 字典数据页 ResourcePage title 为空；Lint 大量格式/排序诊断 | 结构/类型/Lint/测试全部通过，不用禁用规则制造通过 |
| Q03 | 登录/上传/UI 设置可保存却未见消费者；upload.driver 与 storage 默认记录分离；站点字段未见完整展示接入 | 保存后功能确实改变；字段无法生效时明确标注；默认来源统一 |
| Q04 | 工作台 METRICS/ACTIVITIES 写死；OpenAPI 快捷入口跳转菜单 | 真实统计或明确示例；正确契约入口；PG/Redis/权限/浏览器验收。原版 Admin 首页本身为 Welcome，真实工作台是 tan 自身收尾目标 |
| Q05 | API/数据模型说明部分滞后；日期/分页重复；db:reset 用 pnpm，build 为 POSIX 环境变量语法 | 文档与源码一致；npm 链路；Windows/Linux 构建验证，禁止为检查而重置真实数据库 |

## 6. 有意差异，不按缺陷回退

- 列表不展示 ID、使用搜索卡片 + 表格、树表代替纯树、弹层编辑：遵循 tan 设计宪章。
- MIME/日期等新增筛选，负责人选择器、统一详情层：保留，检查真实搜索/权限即可。
- 存储单页配置改为多记录模型：保留模型，补必要业务能力，不照搬旧版式。
- UUID、字符串状态、PostgreSQL、cookie/x-api-key、Server Function：属于架构及契约差异。迁移原版客户端/数据时要设计字段、身份、响应与路径适配，不宣称直接兼容。
- 原版动态菜单装配与 tan 文件路由不同：允许受控映射实现，不要求数据库字符串任意加载组件。

## 7. 原版更大范围，单独规划

| 编号 | 原版源码范围 | tan 状态 / 范围说明 |
| --- | --- | --- |
| S01 | Demo portal：pages/articles/categories/templates 的 schema/service/routes 与 Admin module 页面 | 已迁移：`portal-content` feature + `/admin/portal/*` 五个列表页 + `/api/v1/portal-*` REST；待补前台渲染 |
| S02 | Demo shop：商品/分类/属性/订单；CRM 源码包括客户/商机/报价/合同/回款等 | 未迁移；Demo manifest 默认只含 demo、portal、shop，CRM 未默认安装，不把 CRM 全部算基座必需 |
| S03 | Taro App、Docusaurus、共享 TipTap；Core contracts/database/api/system-api 与显式产品装配 | tan 当前是单仓后台；小程序/文档站/多产品隔离需要独立计划 |

## 8. 验证状态及限制

2026-10-10 在 tan 实际执行：typecheck 通过；Vitest 40 文件 / 338 用例通过；arch:check 四个分层检查及 11 张资源列表检查通过；生产 Vite 构建通过；全仓 Biome 检查通过。

未执行：原版运行测试、云服务、线上部署和角色/菜单真实浏览器会话验收。隔离 PGlite 集成测试已覆盖角色/菜单 REST 与 Server Function 权限闭环；配置、账户、存储及媒体继续按 TODO 推进，业务模块另立计划。
