# 系统优化评估

> 评估日期：2026-07-10  
> 项目：`yishan-tan`  
> 范围：当前代码、根目录文档、`docs/` 文档、工程脚本与质量门禁。

## 1. 当前结论

当前系统已经具备较完整的企业后台基座能力：

- 架构分层清晰：`routes` / `features` / `lib` / `server` / `db` 边界明确。
- 工程守卫已落地：`arch:check` 覆盖 routes、actions、services、naming。
- 测试基础较好：当前实际测试为 38 个测试文件、315 个用例。
- Admin UI 已有共享模式：`ResourcePage`、`ResourceTable`、`FilterBar`、`StatusBadge`、`DateRangePicker`、`Popconfirm` 等组件已经形成统一基础。
- 文档体系较完整：`README.md`、`OWN.md`、`docs/*`、`ADMIN_UI_OPTIMIZATION_PLAN.md`、`组件架构整改建议.md` 覆盖了架构、UI、测试和部署。

主要风险不在“大功能缺失”，而在以下几类：

- 质量门禁存在断点：`typecheck` 当前失败。
- 文档与实际代码存在漂移：测试统计、UI 缺口状态等已有变化。
- Admin 页面仍偏厚，存在重复格式化函数和页面级编排逻辑。
- UI 规约还缺自动化守卫，仍主要依赖人工 review。
- Bundle、安全审计、依赖升级还没有形成稳定治理流程。

## 2. 验证结果

本次执行过的检查：

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npm run typecheck` | 失败 | `src/routes/admin/attachments.tsx:289` 使用了不支持的 `Badge variant="neutral"` |
| `npm run arch:check` | 通过 | routes / actions / services / naming 检查均通过 |
| `npm test` | 通过 | 38 个测试文件、315 个用例通过 |
| `npm run lint:check` | 有 warning | `db/schema/index.ts:167` 存在显式 `any` |
| `npm run build` | 通过 | Vite client + SSR 构建成功 |
| `npm audit --omit=dev` | 未完成 | 当前 `npmmirror` registry 不支持 npm audit endpoint |
| `npm outdated --depth=0` | 有可升级依赖 | Biome、Vite、Vitest、lucide、Radix 等存在新版本 |

## 3. P0：必须优先处理

### 3.1 修复 TypeScript 类型错误

位置：`src/routes/admin/attachments.tsx:289`

当前问题：

```tsx
<Badge variant="neutral" ...>
```

`Badge` 组件实际只支持：

```ts
"default" | "secondary" | "soft" | "outline" | "destructive" | "glow"
```

建议处理：

- 若只是 MIME chip，改为 `variant="outline"`。
- 若语义上属于状态/分类标识，改用 `StatusBadge tone="neutral"`。

### 3.2 增加统一质量脚本

当前 `npm run build` 可以通过，但 `npm run typecheck` 失败。建议在 `package.json` 增加统一检查入口：

```json
{
  "scripts": {
    "check": "npm run typecheck && npm run lint:check && npm test && npm run arch:check"
  }
}
```

后续 CI / 发布前统一跑 `npm run check`，避免构建通过但类型失败。

### 3.3 修复 Drizzle schema 中的显式 `any`

位置：`db/schema/index.ts:167`

当前问题：

```ts
leaderId: uuid("leader_id").references((): any => user.id, { onDelete: "set null" }),
```

这是 lint warning，也说明 schema 循环引用/类型推导处理不干净。建议用 Drizzle 推荐方式或局部结构调整消除 `any`。

## 4. P1：近期优化项目

### 4.1 合并 Admin 路由鉴权请求

位置：`src/routes/admin/route.tsx`

当前 `beforeLoad` 先调用 `getCurrentUser()`，再调用 `getAuthorizedMenuPaths()`。这会形成请求瀑布，也可能造成重复鉴权。

建议新增一个 server function，一次返回：

```ts
{
  user,
  authorizedPaths
}
```

收益：

- 减少 admin 子页面进入时的请求数量。
- 鉴权逻辑更集中。
- 后续可扩展返回菜单树、权限点、用户偏好等上下文。

### 4.2 增加 UI Token 架构守卫

现有 `ADMIN_UI_OPTIMIZATION_PLAN.md` 已提到 `check-ui-tokens`，但脚本尚未落地。

建议新增：

```txt
scripts/arch/check-ui-tokens.mjs
```

建议检查规则：

- `src/routes/admin/**` 和 `src/components/admin/**` 禁止裸 hex 颜色。
- 禁止非规约字号，如 `text-[12.5px]`。
- 禁止直接使用 `Input type="datetime-local"` 或 `Input type="date"`，统一走日期组件。
- 禁止自造状态 chip，优先使用 `StatusBadge`。

### 4.3 统一时间格式化能力

多个 admin 页面存在本地 `formatDateTime`。建议抽到：

```txt
src/lib/format.ts
```

统一提供：

- `formatDateTime`
- `formatDate`
- `formatFileSize`
- 后续可扩展时区、空值兜底、相对时间等。

### 4.4 文档与代码状态自动同步

`docs/testing.md` 中仍记录 16 个文件 / 115 个用例，但当前实际为 38 个文件 / 315 个用例。

建议：

- 增加测试统计脚本。
- 或在文档中去掉易漂移数字，只保留覆盖策略和检查命令。
- 重要状态由脚本输出，不手工维护。

### 4.5 Bundle 分析

构建结果中 client 入口 chunk 约：

```txt
437.25 kB / gzip 136.42 kB
```

建议先增加 bundle 分析工具，再决定是否拆分：

- 分析 Radix、lucide、日期组件、共享 UI 是否进入首屏。
- 对重组件做懒加载或路由级拆分。
- 避免在未定位来源前做盲目优化。

## 5. P2：中期治理项目

### 5.1 分批依赖升级

`npm outdated --depth=0` 显示以下类型的升级机会：

- 小版本：Radix 系列、react-hook-form、tsx 等。
- 大版本：Biome 1 → 2、Vite 7 → 8、Vitest 3 → 4、lucide 0 → 1、pino 9 → 10。

建议策略：

- 先升级小版本依赖。
- Biome、Vite、Vitest 单独开分支处理。
- 每批升级都跑 `npm run check`。

### 5.2 安全审计流程

当前 `npm audit` 因 registry 使用 `npmmirror` 无法执行：

```txt
[NOT_IMPLEMENTED] /-/npm/v1/security/* not implemented yet
```

建议：

- CI 中使用官方 npm registry 跑 audit。
- 或引入独立 SCA 工具。
- 本地开发可继续使用镜像，但安全审计不要依赖镜像 registry。

### 5.3 Admin 页面瘦身

`组件架构整改建议.md` 中指出页面职责偏重，这个判断仍然成立。

建议逐步把页面拆成：

```txt
src/features/<domain>/components/
src/features/<domain>/hooks/
```

优先拆：

- `users`
- `roles`
- `menus`
- `storages`

拆分方向：

- 页面只保留 route、loader、顶层组合。
- 筛选状态、表格列、表单、批量操作下沉到 feature 内部。
- 通用模式继续放在 admin pattern/component 层。

### 5.4 测试继续补强

当前测试数量已较多，但仍以 schema、policy、纯函数为主。下一步建议：

- service + 数据库集成测试。
- route 级 API 集成测试。
- TanStack server function 鉴权和参数校验测试。
- 上传、存储、删除等副作用路径测试。

## 6. 建议执行顺序

建议按以下顺序推进：

1. 修复 `attachments.tsx` 类型错误。
2. 修复 `db/schema/index.ts` 显式 `any`。
3. 新增 `npm run check`。
4. 新增 `check-ui-tokens` 并接入 `arch:check`。
5. 抽取 `src/lib/format.ts`。
6. 合并 Admin 鉴权上下文请求。
7. 更新或自动化生成测试状态文档。
8. 增加 bundle 分析。
9. 分批升级依赖。
10. 开始拆分厚 admin 页面。

## 7. 相关文档

- `README.md`：项目入口与快速开始。
- `OWN.md`：架构分层和所有权约束。
- `docs/base-capabilities.md`：基座能力现状。
- `docs/testing.md`：测试覆盖策略。
- `docs/DESIGN_CHARTER.md`：Admin UI 设计规约。
- `ADMIN_UI_OPTIMIZATION_PLAN.md`：Admin UI 优化路线图。
- `组件架构整改建议.md`：组件架构长期整改建议。

