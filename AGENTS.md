# 项目开发规则

本文件适用于整个仓库，是编码助手的统一入口。开始改动前先读 [README.md](./README.md)，再读与任务相关的规范。用户明确指示优先于本文件；不要因常规实现选择反复请求确认。

## 项目与工具

- TanStack Start、React 19、Vite、Nitro；shadcn/ui、Radix、Tailwind v4；Drizzle、PostgreSQL、Redis、better-auth。
- 包管理器统一使用 npm，保留 package-lock.json；安装用 `npm ci`，不要引入另一套 lockfile。
- 本地启动 `npm run dev`，自动加载 .env。不要输出真实凭证，也不要提交 .env。
- 新功能优先复用已有 feature、组件和数据访问方式，不为单个页面引入新的组件库。

## 后台资源列表：强制搜索 + 表格

修改后台 UI 前阅读 [设计宪章](./docs/DESIGN_CHARTER.md)。新增或修改列表时必须阅读 [后台列表规范](./docs/admin-list-standard.md)，参考 `src/routes/admin/users.tsx`、`roles.tsx`；树形列表参考 `departments.tsx`、`menus.tsx`。

1. 使用 `ResourcePage`，顺序固定为标题、独立搜索卡片、表格卡片；表格卡片内放列表标题、工具栏、ResourceTable 和分页。不要自建一套 Card + Input + Table 布局，不以卡片网格或纯树面板替代列表。
2. 搜索通过 `filter` 和 `QueryFormItem` 声明，默认三列、可折叠；复用 FilterBar 的查询、重置与展开收起按钮。不得遗漏搜索区或伪造不生效的搜索字段。
3. `draft` 只保存输入，`filters` 保存已提交条件。请求与 query key 只读 filters；查询提交后页码归 1，重置同时恢复 draft、filters 和页码。编辑字段或展开搜索不触发列表查询，也不改变当前页。
4. ResourceTable 使用业务 ID 作 rowKey，列宽、对齐、状态、操作列、分页、空值与危险操作遵循设计宪章 §7。分页的 total 必须对应实际查询范围；不要用本页过滤结果伪装全量搜索。
5. 新增、导出、批量操作放在表格工具栏，每个操作区域最多一个主按钮。新增/编辑复用 ResponsiveFormLayer；只读详情复用 DetailSheet；危险操作复用 Popconfirm。
6. 树形资源依然使用搜索 + 树表格，保留父子层级。列表不能以非分页的全量拉取替代已有服务端分页。
7. 当前非列表页面仅有 `/admin` 工作台、`/admin/settings` 配置表单，以及 `admin/route.tsx` 布局入口；新资源路由默认按列表检查。新增其它非列表类型时，在检查脚本中写出明确理由并同步规范。
8. 保留侧栏同级对齐、逐级缩进及收起分组弹出子菜单的行为；调整公共组件要验证受影响列表。

现有参考页面不是每个细节都已合规；以规范的查询行为为准，不复制旧页面中修改 draft 就重置页码的 effect。

## 架构边界

详见 [OWN.md](./OWN.md)。routes 负责入口和页面编排；actions 负责校验、请求上下文和调用 service；service 负责业务与数据库操作；policy 负责权限；queries 和 use-mutations 负责前端数据消费。REST 和 Server Function 共用业务 service，不在两个入口复制业务逻辑。

- routes 不直接 import db / auth / redis，actions 不直接访问 db / drizzle。
- services 不依赖 React、routes 或 components。请求上下文从 `src/server/request-context.ts` 获取。
- feature 文件使用领域前缀，REST 顶级资源使用复数。业务错误使用 Errors 工厂。
- UI 使用项目 token 和现有组件，不引入 antd；参考其交互模式即可。

## 验证与交付

- 代码改动运行 `npm run typecheck`、`npm run lint:check`、`npm run arch:check`；行为改动运行相关测试，公共逻辑或跨域改动运行 `npm test`。
- 列表结构守卫为 `npm run arch:check:lists`，已接入 arch:check 和 CI。它只检查结构，搜索语义、分页与权限还需实际验证。
- UI 改动在浏览器验证受影响状态：查询、重置、翻页、空结果、错误、编辑与危险操作中与改动有关的部分。不要仅凭页面返回 HTTP 200 宣称交互通过。
- 文档改动检查本地链接即可；不要为了文档归位跑数据库重置、部署或全仓格式化。
- 如现有门禁失败，区分既有问题与本次引入问题，报告实际结果，不把失败写成通过。
- 不手改 routeTree.gen.ts、openapi.generated.json 和数据库迁移快照，不丢弃已有未提交改动。

## 文档维护

README 是项目入口；AGENTS 是助手执行规则；OWN 是架构决策；DESIGN_CHARTER 是 UI 规范；admin-list-standard 是资源列表规范。CLAUDE.md 保留既有说明，列表任务优先遵循本文件与列表规范。

实施计划放 docs/plans，历史快照放 docs/history，参考资料放 docs/references；更新文档索引。历史记录不得作为当前实现状态的证据。
