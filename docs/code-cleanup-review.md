# 代码清理审查

审查日期：2026-10-09。基于当前工作区与已安装依赖；本轮仅增加报告，没有删除业务代码或升级依赖。

## 结论

可清理项主要集中在闲置组件、兼容导出、未接入的工具、旧计划文档和工程配置。当前业务域的 service / actions / queries / REST 入口都有实际用途，不能仅凭“有两套入口”判定重复。

建议先恢复可用的质量门禁，再删无调用代码、移除相关依赖，最后归并文档与重复业务工具。依赖升级单独进行，避免把删除、格式化、框架升级混在一个改动中。

## 审查方法与边界

- 用 TypeScript AST 解析本地 import、export 和动态 import，沿 routes、router、scripts、seed、Vite 配置追踪依赖。
- 结合全仓符号搜索核实 barrel 重导出，区分“被 index.ts 导出”和“被业务调用”。
- 对 CSS import、Pino transport、框架约定入口和部署脚本额外检查，不以 JS import 搜索结果直接删依赖。
- 运行 typecheck、arch:check、test 和 lint；通过 npm outdated 查询当前 registry 的升级候选。
- 无调用是当前仓库的静态证据，不代表外部项目没有复制或使用这些底座能力。未验证删除后的生产构建及部署。

## 1. 优先删除候选

| 文件 / 符号 | 证据 | 清理方式 |
| --- | --- | --- |
| `src/lib/audit.ts` | `getActorId` 无调用，只返回 `ctx.userId` | 删除文件；需要时直接读上下文字段 |
| `src/lib/entity.ts` | `TimestampFields` / `SoftDeleteFields` / `BaseEntity` 无引用 | 删除未使用类型文件 |
| `src/components/admin/form/confirm-action.tsx` | `ConfirmAction` 只在 form/index.ts 重导出，没有页面调用 | 删除组件及重导出；当前页面使用 Popconfirm |
| `src/components/admin/form/use-confirm.tsx` | `useConfirm` 只在 form/index.ts 重导出，没有调用 | 删除组件及重导出 |
| `src/components/admin/form/multi-select.tsx` | `MultiSelect` 只有声明及重导出，业务页面使用 SearchMultiSelect 等组件 | 删除旧组件及对应类型重导出；同步更新旧文档引用 |
| `src/components/ui/scroll-area.tsx` | 没有源码消费方 | 若底座不保留预置组件，删除并移除 `@radix-ui/react-scroll-area` |
| `src/components/ui/separator.tsx` | 没有源码消费方 | 若底座不保留预置组件，删除并移除 `@radix-ui/react-separator`；dropdown/select 的 separator 不依赖它 |
| `src/components/admin/layout/admin-nav-config.ts` 中 `ADMIN_NAV_ITEMS` / `AdminNavItem` | 已标记 `@deprecated`，为历史 import 保留，未发现实际消费方 | 删除兼容导出及相关 barrel；保留 `FALLBACK_NAV_ITEMS` |
| `src/lib/classes.ts` 中 `MONO_FIELD` | 没有引用 | 删除该常量；保留使用中的 MONO_CELL / MONO_CHIP |
| `src/lib/copy.ts` 中 `buttonCopy` | 没有调用 | 删除闲置词典，或在明确统一文案的任务中接入 |
| `src/lib/storage-driver/index.ts` 中 `isDriverImplemented` | 没有调用 | 删除闲置导出；保留被调用的 putObject |

上表组件删除需同时去掉 index.ts 的重导出，并跑类型检查、测试及生产构建。没有消费方的底座预置组件可以保留，但应明确其用途，而不是混作已实现业务能力。

## 2. 不宜直接删，但需要作出取舍

### 结构化日志

`src/lib/logger.server.ts` 没有接入运行入口，因此 `pino` / `pino-pretty` 没有实际被应用日志链路使用。选择之一：接入请求、业务错误与迁移日志；另一选择：删除闲置 logger 及两项直接依赖。配置了脱敏规则不等于实际日志已经脱敏。

### 分页工具

`src/lib/pagination.ts` 只有自己的测试消费，业务域自行定义分页 schema。应选择统一复用公共分页规则，或删除该工具及配套测试；保留一套仅被自身测试验证的实现没有业务收益。

### 鉴权与数据库工具

`requireSelfOrAdmin` 在当前业务链路中未使用，但有行为测试且属于底座权限能力。`isDatabaseConfigured` 当前无调用，可以接入未配置环境的明确错误处理，也可以删除。不要把 `getDbClient` 等模块内部正在使用的函数误删：没有外部调用只说明可能不需要 export。

### 仅供测试的导出

`admin-sidebar.tsx` 与 `use-nav-state.ts` 的 `__testing` 没有找到消费测试。可以移除这些导出；这不意味着整份 sidebar 或 nav-state 文件可以删除。

### 依赖

- `drizzle-zod` 没有找到代码引用，是直接依赖删除候选。
- `isbot` 没有找到应用源码直接引用，但涉及框架默认入口能力，需检查框架依赖和生产构建后决定。
- `react-dom` 属于 React 运行依赖，不能按源码没有直接 import 就删。
- `tw-animate-css` 被 `src/styles/globals.css` 导入，应保留。
- `pino-pretty` 通过 transport 字符串引用，应随 logger 的取舍处理。
- `scripts/db-migrate.ts` 直接导入 `@better-auth/utils/password`，却没有声明直接依赖；`scripts/build-fc.mjs` 直接调用 esbuild 二进制，也依赖传递安装。应补齐明确依赖或替换为已声明的 API。

## 3. 可以归并的重复实现

- 11 个 admin 页面各自定义 `formatDateTime`：建议统一到一个工具，先核对时区、空值、非法日期与显示精度是否一致。
- 多个 feature 重复定义 page / pageSize / keyword schema：与公共 pagination 工具一并决策，避免仅新增另一份公共实现。
- 业务 feature 的 schema 与 OpenAPI DTO 存在维护重叠，可逐项共用契约，但 HTTP 输出和业务输入并非天然相同，不能直接合并所有 schema。
- `ConfirmAction`、`useConfirm`、`Popconfirm` 是多种确认方式；当前前两者无调用，适合收敛到现有页面采用的模式。
- `routes/api/v1/users.ts` 的 POST 与 `users/index.ts` 的 GET 各自提供不同方法，不是两份相同 CRUD。若统一路由，需要验证尾斜杠行为和 OpenAPI，不能直接删除其中之一。

## 4. 已过时的文档与配置

| 位置 | 当前问题 | 建议 |
| --- | --- | --- |
| `todo/README.md` 及旧迁移清单 | 仍把岗位、存储、附件、门户描述为“无 feature”，把多个已存在页面描述为 placeholder | 逐项核对未完成的验收要求，再归档已完成清单；更新总览 |
| `todo/00-users.md` | 指向不存在的 `0001_strange_ikaris.sql`，测试数和实现描述陈旧 | 移到历史目录或更新为当前范式 |
| `docs/testing.md` | 写 16 文件 / 115 用例和全门禁通过；当前为 39 文件 / 318 用例，部分门禁失败 | 更新统计与真实验证状态 |
| `docs/base-capabilities.md` | 仍排除“完整后台前端页面”，声称业务使用统一 pagination，且引用缺失计划文档 | 按运行代码重写能力现状 |
| `docs/history/SYSTEM_OPTIMIZATION_REVIEW.md` | 2026-07-10 历史评估，仍将已通过的 typecheck 写为失败 | 标明历史快照并归档；不要直接当作当前任务清单 |
| `docs/plans/ADMIN_UI_OPTIMIZATION_PLAN.md` / `docs/plans/组件架构整改建议.md` / `docs/references/YISHAN_ADMIN_ROUTE_ALIGNMENT.md` | 已分别归入 plans / references；部分项目已落地，仍有有价值的设计/验收条目 | 归位已完成；继续核对未完成条目 |
| `docs/admin-ui-plan.md` | 与 DESIGN_CHARTER、根目录多个 UI 计划重叠 | 合并仍有效的说明，明确 DESIGN_CHARTER 为 UI 规范入口 |
| `README.md` | 仍写 Vinxi/Nitro 兼容，当前配置直接使用 Nitro | 更新栈说明；基础设施版本用环境或部署配置为准 |
| `package.json` | npm lockfile 与 CI 使用 npm，但 db:reset 链路仍调用 pnpm | 统一包管理器；重置脚本是破坏性操作，本轮未执行 |
| `package.json` | build 使用 POSIX 的 `NODE_ENV=production` 语法，Windows PowerShell 下不能直接运行 | 使用跨平台启动脚本；本轮未执行生产构建 |
| `.vscode/settings.json` | 内容是一份旧 Biome 配置，含过时的 `fc-deploy/code`，并非编辑器 settings 结构 | 替换为真正的 VS Code 设置，Biome 配置只保留根目录一份 |
| `CLAUDE.md` / `OWN.md` | 要求单引号，但当前 Biome 默认和多数代码为双引号 | 统一书面规约和自动格式器 |

## 5. 生成文件与必须保留的内容

- `openapi.generated.json` 虽在 .gitignore 中，仍被 Git 跟踪；ignore 不会取消已有跟踪。
- `src/routeTree.gen.ts` 是路由生成产物，启动后可能变化。可决定是否跟踪，但不能删除生成机制或当作人工维护的业务文件。
- `.output`、`dist`、部署 code 目录是可再生成的构建产物；当前无需清除 node_modules 或运行服务所需文件。
- `db/migrations` 和 meta 快照是迁移历史，不能按“生成文件”删除。
- `src/router.tsx.d.ts` 包含类型扩展，通过 tsconfig include 生效，不能按“没有 import”判为废文件。
- `FALLBACK_NAV_ITEMS` 被 sidebar 使用，是接口失败时的兜底；仅旧别名可清理。
- `public/login/login-bg.svg` 被 CSS URL 使用，属于有效资源。
- `public/favicon.svg` 没有找到匹配的页面链接，根路由引用的是不存在的 `/favicon.ico`。应修正资源引用，而不是把已有 SVG 直接丢掉。
- `deploy/fc/certs/private.key` 与 `fullchain.cer` 被 Git 跟踪，并由 s.yaml 引用。私钥应迁出仓库、改用凭证注入，并评估换发及历史处理；直接删除会破坏当前部署。
- storage-driver 的云厂商分支未实现，仅 local 可用。它们是未完成能力，应明确限制或后续实现，不应和已无用途代码混为一类。

## 6. 本轮质量门禁结果

| 检查 | 结果 | 解释 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | 当前源码可以通过 TS 检查 |
| `npm test` | 通过 | 39 个文件 / 318 个用例 |
| `npm run arch:check` | 失败 | naming 报 19 项；_shared 输出 `/` 路径，check-naming 按 Windows path.sep 拆分，导致把 users/index 等当成顶级资源名 |
| `npm run lint:check` | 失败 | 291 errors / 1 warning；包含大量 CRLF 与格式、import 整理差异，不能算作 291 个业务逻辑错误 |
| 关闭 formatter 与 organize-imports 后的 Biome 检查 | 1 warning | `db/schema/index.ts:167` 的显式 any；没有发现未使用 import/变量错误 |
| 生产 build / 部署 | 未验证 | 本轮审查不触发发布，也没有尝试 Windows 不兼容的现有 build 命令 |

core.autocrlf 当前为 true。建议配置 .gitattributes / .editorconfig 统一换行，再做一次独立格式化提交，避免逻辑清理和全仓换行变更混合。

## 7. 依赖升级与“过时”的区别

npm outdated 查到多个升级候选，包括 Biome、Vite、Vitest、TypeScript、Nitro 等。存在新版本不代表当前版本可丢弃，也不代表安全漏洞已确认。本轮没有执行依赖升级或安全审计。

建议删除确定无用依赖后，再分别处理工具链大版本迁移、框架与 Nitro 兼容性、认证相关包的协调升级。保留 lockfile，逐批跑测试和生产构建。

## 8. 建议实施顺序

1. 修复架构检查的跨平台路径问题、build 的跨平台启动方式，以及 db:reset 的包管理器混用。
2. 统一换行和编辑器配置，恢复 lint 门禁；格式提交与业务变更分开。
3. 删除优先候选及 barrel 重导出，移除对应直接依赖；每批跑类型检查、测试与构建。
4. 决定日志和公共分页工具的接入或删除，统一日期格式化。
5. 更新能力、测试文档，归档旧计划但保留尚未完成的要求。
6. 整理生成文件跟踪策略、部署凭证注入与显式脚本依赖。
7. 独立执行依赖升级与运行回归。
