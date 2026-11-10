# 文档索引

> yishan-tan 的项目文档。现状说明、实施计划、历史评估与参考资料分开管理；计划和历史记录中的状态需结合当前代码核实。

## 入口

| 文档 | 用途 |
| --- | --- |
| [`base-capabilities.md`](./base-capabilities.md) | 当前已实现的基座能力与验证状态 |
| [`user-permissions.md`](./user-permissions.md) | A01 用户管理权限试点、迁移、兼容与验证边界 |
| [`yishan-alignment-review.md`](./yishan-alignment-review.md) | 2026-10-09 原版 Yishan 当前源码对齐调研、差异证据与验收条件 |
| [`admin-ui-plan.md`](./admin-ui-plan.md) | 后台管理界面的 UI 选型、交互规范与实施顺序 |
| [`admin-list-standard.md`](./admin-list-standard.md) | 后台资源列表的搜索 + 表格结构、行为与验收规范 |
| [`data-model.md`](./data-model.md) | 数据库表结构、字段、枚举、关系 |
| [`api-reference.md`](./api-reference.md) | REST API 清单与请求 / 响应约定 |
| [`testing.md`](./testing.md) | 测试覆盖矩阵与下一阶段目标 |
| [`deploy-oidc.md`](./deploy-oidc.md) | OIDC 联邦 + Aliyun RAM + GitHub Secrets 完整规范 |
| [`DESIGN_CHARTER.md`](./DESIGN_CHARTER.md) | 后台 UI 设计规范 |
| [`code-cleanup-review.md`](./code-cleanup-review.md) | 2026-10-09 代码清理审查与候选清单 |

## 计划、历史与参考

| 文档 | 用途 |
| --- | --- |
| [`plans/ADMIN_UI_OPTIMIZATION_PLAN.md`](./plans/ADMIN_UI_OPTIMIZATION_PLAN.md) | 后台 UI 优化路线图，原状态记录于 2026-07-08 |
| [`plans/组件架构整改建议.md`](./plans/组件架构整改建议.md) | 组件归属、页面拆分和复用建议 |
| [`history/SYSTEM_OPTIMIZATION_REVIEW.md`](./history/SYSTEM_OPTIMIZATION_REVIEW.md) | 2026-07-10 系统评估历史快照 |
| [`references/YISHAN_ADMIN_ROUTE_ALIGNMENT.md`](./references/YISHAN_ADMIN_ROUTE_ALIGNMENT.md) | 新旧后台页面的字段与行为对照 |
| [`references/EDGEONE_DEPLOYMENT_POC.md`](./references/EDGEONE_DEPLOYMENT_POC.md) | 2026-11-09 EdgeOne 部署调研、线上实测与适配器构建 PoC |

## 与项目其它文档的关系

- `README.md`：仓库入口与快速开始
- `OWN.md`：架构分层约束与命名约定
- `deploy/fc/README.md`：FC3 部署细节
- `.github/README.md`：CI/CD / GitHub Actions 配置指引
- 本目录：以「实现现状」为视角的具体说明
