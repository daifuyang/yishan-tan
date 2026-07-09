# Admin UI 优化路线图

> 参照基准:`src/routes/admin/users.tsx` 与 `src/routes/admin/roles.tsx`(后者本轮已删除 `id` 列)。
> 上位规约:`docs/DESIGN_CHARTER.md` 优先于本文件;本文件提出对宪章的补充条款,落地前需合入宪章。
> 状态口径:**全部结论以工作区当前实际代码为准**(2026-07-08 复核)。10 个 admin 文件处于 `M` 状态,意味着本路线图所列大量"违规项"已经在工作区被修复,本版只列**仍真实存在**的缺口。
> 写法约定:每个动作标 `priority`(`P0` 本周必做 / `P1` 月内 / `P2` 季度内),并标注触达文件。

---

## 0. Context — 为什么需要这份路线图

最近一轮 `roles.tsx` 移除 `id` 列触发了我们对 11 个 admin 页面的统一审视。三个并行的摸底(页面 / 宪章 / 组件库)给出以下结论:

1. **宪章规约够吗?** §3 / §4 / §7 / §9 / §13 覆盖了大部分规则,但有 **8 处明确的缺口**(见 §2),导致开发者"按规约写"时找不到规约,最终自造规则(典型如 `portals.tsx` 早先的内联 hex 黄色徽章、`login-logs.tsx` 自造 `Sheet` + `DetailRow`)。
2. **跨页面一致吗?** **自上次合入 `tokens.ts` / `classes.ts` / `DateRangePicker` 后,大部分不一致已经修好**。剩余的真实不一致集中在 4 个页面(roles / users / attachments / departments / login-logs),详见 §1.1 与 §4。
3. **组件库够吗?** 大部分抽象已就位(`ResourcePage` / `ResourceTable` / `FilterBar` / `QueryFormItem` / `StatusBadge` / `ResponsiveFormLayer` / `Popconfirm` / `DateRangePicker`)。缺口集中在 P1 基础件(`switch` / `radio-group` / `form` / `toast` / `alert`,均在 `src/components/ui/` 下,不在 admin 层)。

**预期产出**:把"把剩下 5 个未对齐页面修到 users/roles / dicts / portals 一致"拆成 3 个 Phase,从宪章补全到治理守卫,每一步都有可验证制品。

---

## 1. 现状快照(2026-07-08 复核)

### 1.1 11 个 admin 页面 — 实测模式矩阵

| 页面 | ID 列 | font-mono token | 日期范围控件 | Filter 模式 | filterCollapsible+DefaultCollapsed | 启停 Popconfirm | tokens.ts import | classes.ts import | 备注 |
|---|---|---|---|---|---|---|---|---|---|
| users | ✗ | n/a | n/a | **draft+commit** | ✓+✓ | ✓ | ✗ (3 本地) | ✗ | **本地仍有 3 个 CLASS 常量**(待清) |
| **roles**(基准) | ✗ | n/a | ✓ `DateRangePicker` | **draft+commit** | ✓+✓ | ✓ | ✗ (4 本地) | ✗ | **本地仍有 4 个 CLASS 常量**(待清) |
| attachments | ✗ | 11px 本地字符串 | ✗ 2× `datetime-local` | **单态** | ✗+✓ | n/a | ✗ (3 本地) | ✗ | **filter 单态** + `filterCollapsible` 缺 + 用 2× datetime-local + mime chip 仍写 `font-mono text-[11px]` 而非 `MONO_CHIP` |
| departments | ✗ | n/a | n/a | **单态** | ✗+✓ | n/a | ✗ (3 本地) | ✗ | **filter 单态** + `filterCollapsible` 缺 + `Popconfirm` 真实触发元素锚定未统一 + 页面级 destructive banner |
| dicts | ✗ | `MONO_CELL` | ✓ `DateRangePicker` | draft+commit | ✓+✓ | ✓ | ✓ | ✓ | ✅ 已对齐 |
| dicts/$typeCode | ✗ | — | ✗ 2× `datetime-local` | 单态 | — | n/a | — | — | **仍用 datetime-local**(子页面未跟进) |
| login-logs | ✗ | 12px 本地 | ✗ 2× `<Input type="date">` | **单态** | ✓+✗ | n/a(只读) | ✗ (2 本地) | ✗ | **自造 `Sheet` + `DetailRow`** + 用 `<Input type=date>` 丢精度 + filter 单态 + 无 `filterDefaultCollapsed` |
| menus | ✗ | `MONO_CELL` | n/a | draft+commit | ✓+✓ | ✓ | ✓ | ✓ | ✅ 已对齐 |
| portals | ✗ | `MONO_CELL` | ✓ `DateRangePicker` | draft+commit | ✓+✓ | ✓ | ✓ | ✗ | **themeMode / 默认已用 StatusBadge**;StatusBadge 已是默认 |
| posts | ✗ | n/a | ✓ `DateRangePicker` | draft+commit | ✓+✓ | ✓ | ✓ | ✗ | ✅ 已对齐 |
| storages | ✗ | `MONO_CELL` | ✓ `DateRangePicker` | draft+commit | ✓+✓ | ✓ | ✓ | ✓ | **默认 Star 已用 StatusBadge**;✅ 已对齐 |
| settings | n/a | n/a | n/a | n/a(卡片) | n/a | n/a | n/a | n/a | 每卡 `保存本组`,独立卡片布局,不在列表页规约范围 |
| admin/index | — | — | — | — | — | — | — | — | 仍有 `/admin/system-options` 死链(2 处) |

### 1.2 已就绪的共享抽象

**目录层(已落地)**:

| 资产 | 路径 | 状态 |
|---|---|---|
| `TABLE_ACTION_CLASS` / `TABLE_DANGER_ACTION_CLASS` / `FILTER_CONTROL_CLASS` / `TEXTAREA_CLASS` | `src/components/admin/data-table/tokens.ts` | ✅ 已新建 |
| `MONO_CELL` / `MONO_CHIP` / `MONO_FIELD` | `src/lib/classes.ts` | ✅ 已新建 |
| `ResourcePage` / `ResourceTable` / `FilterBar` / `QueryFormItem` | `src/components/admin/{layout,data-table}/*` | ✅ |
| `StatusBadge` / `StatusTone` | `src/components/admin/display/status-badge.tsx` | ✅ |
| `ResponsiveFormLayer` / `FormDialog` / `FormSheet` | `src/components/admin/form/*` | ✅ |
| `Popconfirm`(真实触发元素锚定 + `placement` / 可选 `arrow`) | `src/components/admin/form/popconfirm.tsx` | ✅ |
| `DateRangePicker` / `DatePicker` | `src/components/admin/form/date-range-picker.tsx` | ✅ |
| `SearchSelect` / `SearchMultiSelect` / `TreeSelect` / `MenuTree` | `src/components/admin/form/*.tsx` | ✅ |
| `EmptyState` / `UserAvatar` | `src/components/admin/display/*.tsx` | ✅ |

**仍缺**(宪章 §5.3 P1 / P2):

| 缺口 | 路径 | 优先级 |
|---|---|---|
| `switch` | `src/components/ui/switch.tsx` | P1(宪章 §5.3 / Phase 2 第 3 条) |
| `radio-group` | `src/components/ui/radio-group.tsx` | P1(Phase 2 第 4 条) |
| `form` / `FormField` | `src/components/ui/form.tsx` | P1(Phase 2 第 5 条) |
| `toast` + `lib/sonner.ts` | `src/components/ui/toast.tsx` | P1(Phase 2 第 2 条) |
| `alert` | `src/components/ui/alert.tsx` | P1(Phase 2 第 1 条) |
| `lib/copy.ts` | `src/lib/copy.ts` | P1(Phase 2 第 6 条) |
| `lib/format.ts` | `src/lib/format.ts` | P1(Phase 2 第 7 条;目前各页自造 `formatDateTime`) |
| `arch:check check-ui-tokens` | `scripts/arch/check-ui-tokens.mjs` | P1(宪章 §12.2) |
| `arch:check check-ui-naming` | `scripts/arch/check-ui-naming.mjs` | P2(宪章 §12.2) |
| biome `noRestrictedImports` 禁 antd | `biome.json` | P2(宪章 §12.3) |
| `steps` / `tabs` / 独立 `pagination` | `src/components/ui/*` | P2(宪章 §5.3) |

### 1.3 真实剩余的跨页不一致(已筛过)

| # | 类型 | 触达 | 状态 |
|---|---|---|---|
| 1 | 4 个 CLASS 常量未抽到 `tokens.ts` | `roles.tsx` (4) + `users.tsx` (3) + `attachments.tsx` (3) + `departments.tsx` (3) + `login-logs.tsx` (2) | 真实存在 |
| 2 | filter 单态,未用 draft+commit | `attachments.tsx` + `departments.tsx` + `login-logs.tsx` + `dicts/$typeCode.tsx` | 真实存在 |
| 3 | `filterCollapsible` 缺 | `attachments.tsx` + `departments.tsx` | 真实存在 |
| 4 | 2× `datetime-local` 自造日期范围 | `attachments.tsx` + `dicts/$typeCode.tsx` | 真实存在 |
| 5 | 2× `<Input type="date">`(丢精度) | `login-logs.tsx` | 真实存在 |
| 6 | `Popconfirm` 仍未按真实触发元素锚定规则统一 | `departments.tsx` | 真实存在(需对齐 users/roles) |
| 7 | 页面级 destructive banner(`destructive/5`) | `departments.tsx` | 真实存在(其他页走 Popconfirm 内部) |
| 8 | 自造 `Sheet` + `DetailRow` 缺 `DetailSheet` 抽象 | `login-logs.tsx` | 真实存在 |
| 9 | `font-mono text-[11px]` 仍写本地字符串而非 `MONO_CHIP` | `attachments.tsx` | 真实存在 |
| 10 | 死链 `/admin/system-options` | `admin/index.tsx` (line 110, 138) | 真实存在 |

**已修复,不再列为 P0**(避免重复):
- portals / storages 内联 hex 黄色"默认"徽章 → `StatusBadge` ✅
- dicts code 列用 `<code>+bg-muted` → `MONO_CELL` ✅
- dicts / menus / portals / posts / storages 启停缺 Popconfirm → 全部已用 `disablePopconfirmRowId` 模式 ✅
- menus path/permission `text-[12.5px]` off-scale → `MONO_CELL`(12px)✅
- dicts / portals / posts / storages 4 页用 `DateRangePicker` 替换 2× datetime-local ✅
- 6 页已 import `tokens.ts`(dicts/menus/portals/posts/storages)✅
- 3 页已 import `classes.ts` 的 `MONO_CELL`(dicts/menus/storages)✅

---

## 2. 宪章补充条款(本轮合入)

以下条款为本路线图建议合入 `docs/DESIGN_CHARTER.md` 的内容;每条标注将插入的章节号与已落地证据。

### 2.1 §7.7 新增「ID 列规约」(P0)

> 列表页**禁止**展示资源 ID;业务资源在列表中以业务字段(名称/编码)为主键。如确需 ID(导出 / API 联调 / 复制链接),仅在以下场景展示:
> 1. **详情页**:`DetailSheet` / `DetailPage` 内部,小字 `font-mono text-[12px] text-text-soft` + `Copyable` 控件;
> 2. **行操作下拉**:"复制 ID" 菜单项;
> 3. **API 文档/CLI 输出**:不渲染。
>
> 证据:`roles.tsx` 本轮已删除 `id` 列,与 `users.tsx` / `dicts.tsx` / 等 10 页一致。
> 违反此条视为 §13 反模式新增条目「13.X 列表页展示资源 ID」。

### 2.2 §7.8 新增「列宽与对齐约定」(P0)

> - **文本列**:`align="left"`,主字段(`名称`)宽 140–180px,描述列 220–240px;
> - **数值列**:`align="right"`,必须 `font-variant-numeric: tabular-nums`(已写进 `@layer base`),宽度按内容 `min-w-[80px]`;
> - **状态列**:`align="center"`,宽 90–110px;
> - **时间列**:`align="left"`,固定 `width="170px"`,格式 `YYYY-MM-DD HH:mm`;
> - **动作列**:`align="right" sticky="right"`,固定 `width="200px"`,多于 3 个按钮折叠到 `更多` 下拉;
> - **首列**(主字段)不 sticky-right,业务主键列不允许截断关键信息。
>
> 证据:实测 11 个页面里时间列一律 170px,动作列 200/220/260/120px 不一(其中 220/260/120 偏离需 review)。

### 2.3 §7.9 新增「工具栏与按钮顺序」(P0)

> `ResourcePage` 工具栏从左到右:`toolbarTitle` 左侧,`toolbarActions` 右侧。`toolbarActions` 内部顺序(单选框内填):
>
> 1. 批量操作类(存在选中时显示,样式 `variant="outline"`,icon 居左,文本格式 `"批量 <动作> (n)"`);
> 2. 导入 / 导出 / 列设置(icon + text);
> 3. 刷新(icon-only `size-8` 方按钮,带 Tooltip);
> 4. 主操作(新增 / 上传 / 同步),`variant="default"`,**每个 area 限 1 个**(承接 §9.1)。
>
> `IconButton`(icon-only)必须配 `Tooltip`;同一 area 内不允许混合 icon-only 与 text+icon。
>
> 证据:仅 `users.tsx` 实现了批量操作(承接 §9.1 合规),其他 8 个列表页批量操作缺位。

### 2.4 §7.10 新增「动作列下拉项分隔」(P0)

> 动作列下拉(`<DropdownMenuContent>`)的项分组:
> 1. **常用操作**(编辑 / 查看 / 启停)— 无前缀;
> 2. **次要操作**(复制 ID / 导出此行)— 无前缀;
> 3. **危险操作**(删除 / 停用)— 用 `text-destructive`,与上面用 `<DropdownMenuSeparator>` 分隔;
> 4. **禁用项**(`disabled` + `opacity-40`),不下沉到二级菜单。
>
> "更多" trigger 一律 `ChevronDown` 图标 + "更多" 文案 + `variant="link"`,与其他动作列按钮同高同色。
>
> 证据:实测 8 页的"更多"下拉结构(roles / dicts / menus / portals / posts / storages 等)未使用 `<DropdownMenuSeparator>`,危险项(`删除`)直接并列,违反分组规约。

### 2.5 §11.5 新增「StatusBadge 颜色 / 字号规约」(P0)

> 列表页**所有**状态、布尔、分类标识必须用 `StatusBadge`,禁止内联 hex / 自造 span chip。映射规则:
>
> | 语义 | tone | label 示例 |
> |---|---|---|
> | 启用 / 成功 / 正常 | `success` | "启用"、"成功"、"正常" |
> | 禁用 / 失败 / 异常 | `danger` | "已禁用"、"失败" |
> | 信息 / 进行中 / 默认值 | `info` | "系统"、"启用中" |
> | 警告 / 即将停用 / 仅本人 | `warning` | "默认"、"即将过期" |
> | 自定义 / 中性 | `neutral` | "自定义"、"备用" |
>
> 字号 `text-[12px]`、内边距 `px-2 py-0.5`、圆角 `rounded-[3px]`(已在 `StatusBadge` 中实现);**禁止**在 `cell` 内写裸 `<Badge>` 或 `<span className="rounded bg-... text-...">`。
>
> 证据:`portals.tsx` line 233 / 276 与 `storages.tsx` line 243 全部已用 `StatusBadge tone="warning" label="默认" icon={Star}` 与 `StatusBadge tone="neutral" label={...}`,反模式已清。
>
> **新增强制反模式 13.X**:内联 hex 黄色 / 蓝色徽章,典型如 `border-[#ffd591] bg-[#fff7e6] text-[#d46b08]`。

### 2.6 §8.6 新增「DetailSheet 规约」(P1)

> 只读详情视图使用 `DetailSheet`,由 `ResponsiveFormLayer` 派生(`mode="view"` 标志)或独立组件。内部用 `DescriptionList` 模式:标签列 92px(同 §8.2),值列 `text-text-soft text-[13px]`。
>
> - 不允许出现 `Input` / `Select` / `Button`(除关闭按钮);
> - 标题 = `资源名 · ${name}`,描述 = 当前状态(`StatusBadge`);
> - `Esc` / overlay 关闭,焦点恢复到触发行(承接 §13.9);
> - 字段顺序:**基础信息 → 关联信息 → 元信息(createdAt / updatedAt)**。
>
> 反例:`login-logs.tsx`(line 370+)自造 `LoginLogDetailSheet` + 内联 `DetailRow`,应替换为通用 `DetailSheet` 抽象。

### 2.7 §2.9 新增「Mono 字体 token」(P1)

> 等宽文本统一走 `src/lib/classes.ts` 已有的三个常量(已落地):
>
> | 用途 | 常量 | 字号 |
> |---|---|---|
> | 表格内的 code / id / ip | `MONO_CELL = "font-mono text-[12px] text-text-soft"` | 12px |
> | 单元格内辅助标(MIME tag、driver chip) | `MONO_CHIP = "font-mono text-[11px] text-text-mute"` | 11px |
> | 表单值(secret / apiKey / token) | `MONO_FIELD = "font-mono text-[13px]"` | 13px |
>
> 禁止 `text-[12.5px]`(off-scale,违反 §2.3 锚点表)。
>
> 证据:已 3 页(dicts/menus/storages)用 `MONO_CELL`;`attachments.tsx` 仍写本地字符串 `font-mono text-[11px]`,待改为 `MONO_CHIP`。

### 2.8 §13 新增反模式条目(P0)

> §13.X 内联 hex 黄色 / 蓝色徽章(典型 `border-[#ffd591] bg-[#fff7e6] text-[#d46b08]`)。违反 §2.1 / §11.5。**当前已修复**:`portals.tsx` / `storages.tsx` 已迁 `StatusBadge`。

---

## 3. 跨页共享抽象 — **剩余待办**

> 注:`tokens.ts` / `classes.ts` / `DateRangePicker` / `Popconfirm` 已落地,§3 描述"还差什么"。

### 3.1 [P1] 收尾:`tokens.ts` 5 页 import 替换(剩余 5 页)

`tokens.ts` 已就绪,5 页仍本地定义 4 个 CLASS 常量,改 import 即可:

- `roles.tsx`(4 个本地常量)— 基准页自身,改 import
- `users.tsx`(3 个本地常量)— 基准页自身,改 import
- `attachments.tsx`(3 个本地常量)
- `departments.tsx`(3 个本地常量)
- `login-logs.tsx`(2 个本地常量)

**注意**:`roles.tsx` 还有本地 `TEXTAREA_CLASS` 和 `SELECT_TRIGGER_LG`(`h-9` 比标准 `h-8` 高一档),前者合并到 `tokens.ts`,后者要么下沉到 `tokens.ts` 要么删除对齐(建议删除对齐)。

### 3.2 [P1] `classes.ts` 推广:attachments 的 mime chip 改 `MONO_CHIP`

`attachments.tsx` line 265 仍写本地字符串 `font-mono text-[11px] text-text-mute`,改为 import `MONO_CHIP`。

### 3.3 [P1] `DateRangePicker` 替换剩余 2 处

- `attachments.tsx`:2× `<Input type="datetime-local">` → `<DateRangePicker>`(参照 roles.tsx 实现)
- `dicts/$typeCode.tsx`:同上
- `login-logs.tsx`:2× `<Input type="date">` → `<DateRangePicker`>(如需时分秒,扩 `withTime` prop)

### 3.4 [P1] `DetailSheet` 抽象(新组件)

新建 `src/components/admin/form/detail-sheet.tsx`,API 模仿 `ResponsiveFormLayer` 但去 FormData / submit / loading,内部用 `DescriptionList`(`<dl>` + `<dt>`/`<dd>`)。`login-logs.tsx` 第一个迁入(替换自造 `LoginLogDetailSheet` + 内联 `DetailRow`)。

### 3.5 [P1] `ResourceBulkBar` 组件(宪章 §7.9 第 1 类)

提取 `users.tsx` 的"批量停用"逻辑为 `<ResourceBulkBar selectedKeys={...} total={...} actions={[{label, onSelect, icon, tone}]}>`,挂到 `ResourceTable` 的 `toolbar` 槽位,让其他页面按需启用(承接宪章 §7.9)。

### 3.6 [P1] `arch:check` 补 `check-ui-tokens`(宪章 §12.2 P1)

新建 `scripts/arch/check-ui-tokens.mjs`,规则(基于 AST 字符串扫描,复用 `_shared.mjs` 的 `extractImports`):

1. `src/components/admin/**` + `src/routes/admin/**` 禁止内联 hex(`#[0-9a-fA-F]{3,8}`);
2. 禁止 `text-[` 后接非规约字号(允许 11/12/13/14/15/16/18/24);
3. 禁止 `rounded-[` 后接非规约圆角(允许 3/4/6/8/12/16/24/32);
4. 禁止 `Input type="datetime-local"` / `Input type="date"`(强制走 `DateRangePicker`)。

挂到 `check-all.mjs`,跑通后写入 `CLAUDE.md` 与 `OWN.md` 的"CI 前置门槛"段。

### 3.7 [P2] `arch:check` 补 `check-ui-naming` + biome 禁 antd

宪章 §12.2 P2 / §12.3。`check-ui-naming.mjs` 校验 `src/components/admin/**/*.tsx` 满足:`PascalCase` 文件名 + 导出组件有 `displayName` + `data-slot`。biome.json 加 `noRestrictedImports` 禁 `antd` / `@ant-design/*` / `antd-style`。

---

## 4. 逐页整改清单 — **仅剩 5 页**

按"风险 × 改动量"排序,标 ⏳ / 🔄 / ✅。**只列当前真实未对齐的页**。

### 4.1 [P1] `login-logs.tsx` — 综合整改(3 类问题)

- **未对齐**:
  1. 自造 `LoginLogDetailSheet` + 内联 `DetailRow`,无 `DetailSheet` 抽象;
  2. 2× `<Input type="date">` 丢精度;
  3. filter 单态(无 draft+commit);
  4. `filterCollapsible` 缺 `filterDefaultCollapsed`;
  5. 仍本地定义 2 个 CLASS 常量。
- **改动**:
  1. 用新建的 `<DetailSheet>` 替换自造实现(§3.4);
  2. 2× `<Input type="date">` → `<DateRangePicker>`(考虑 `withTime` prop 扩展,§3.3);
  3. `filters` 单态 → `draft + filters` 双态(参照 roles.tsx 模式);
  4. 补 `filterDefaultCollapsed`;
  5. 删除本地 CLASS 常量,改 import `data-table/tokens.ts`;
  6. `actions` 列 `width="120px"` → `width="160px"`(给"查看详情"留位置)。
- **估算**:~80 行 diff。

### 4.2 [P1] `attachments.tsx` — 综合整改(4 类问题)

- **未对齐**:
  1. 2× `<Input type="datetime-local">`;
  2. filter 单态;
  3. 缺 `filterCollapsible`;
  4. 本地 3 个 CLASS 常量;
  5. mime chip 写本地 `font-mono text-[11px]`,未用 `MONO_CHIP`。
- **改动**:对应 §4.1 的 1/3/4/5,加 §3.2 的 `MONO_CHIP` 替换。
- **估算**:~60 行 diff。

### 4.3 [P1] `departments.tsx` — 树表细节对齐

- **未对齐**:
  1. 本地 3 个 CLASS 常量;
  2. filter 单态;
  3. 缺 `filterCollapsible`;
  4. `Popconfirm` 触发锚点未按真实触发元素规则统一;
  5. 页面级 destructive banner(`destructive/5` 背景)— 其他页走 Popconfirm 内部。
- **改动**:
  1. 改 import `tokens.ts`;
  2. 改 draft+commit 模式(树表 client 过滤对响应性敏感,见 §8 决策 4);
  3. 补 `filterCollapsible`;
  4. `Popconfirm` 改真实触发元素锚定模式(常显动作包 Button,下拉动作包 DropdownMenuItem);
  5. 删除页面级 banner,Popconfirm 内置错误展示即可。
- **估算**:~60 行 diff。

### 4.4 [P1] `roles.tsx` — 收尾(自身也未 import tokens)

- **未对齐**:本地 4 个 CLASS 常量(含 `SELECT_TRIGGER_LG`)。
- **改动**:
  1. 删除本地常量,改 import `tokens.ts`;
  2. `SELECT_TRIGGER_LG = "h-9 ..."`(高度比其他页高一档)— 决定是下沉到 `tokens.ts` 还是删除对齐 `h-8`(建议删除对齐,宪章 §4.5 一致性优先)。
- **估算**:~10 行 diff。

### 4.5 [P1] `users.tsx` — 收尾(自身也未 import tokens)

- **未对齐**:本地 3 个 CLASS 常量。
- **改动**:删除本地常量,改 import `tokens.ts`。
- **估算**:~10 行 diff。

### 4.6 [P1] `dicts/$typeCode.tsx` — 子页面跟进

- **未对齐**:2× `<Input type="datetime-local">`。
- **改动**:换成 `<DateRangePicker>`。
- **估算**:~20 行 diff。

### 4.7 [P1] `admin/index.tsx` — 死链清理

- **未对齐**:工作台 `QuickActionCard` 仍有 `/admin/system-options` 死链(line 110 + 138)。
- **改动**:删 `system-options` 项,或改链到 `/admin/settings`(后者已存在)。
- **估算**:~5 行 diff。

### 4.8 [P1] `attachments.tsx` — `UploadAttachment` 升级(宪章 §8.5 P2 第 9 条)

- 独立于以上整改;现 `src/components/admin/attachments/upload-attachment.tsx` 只实现"选文件 → 上传"按钮,缺:
  1. **三要素显示**:文件大小 + 格式校验提示 + 进度条;
  2. 拖拽上传;
  3. 失败重试。
- **估算**:~150 行 diff(含子组件)。

---

## 5. 阶段化交付(roadmap)

按依赖关系与收益排序,每阶段结束都有可验证制品。

### Phase 1 — 宪章补全(P0,预计 0.5 周)

- [ ] 合入 §2.1–§2.8 八条宪章补充(`docs/DESIGN_CHARTER.md`)
- [ ] **验收**:`git diff` 仅触及 `DESIGN_CHARTER.md`;`npm run arch:check` 全绿;`npm run typecheck` 全绿;`npm test` 全绿(115 cases)。

### Phase 2 — 5 个未对齐页收尾(P1,预计 1 周)

- [ ] `roles.tsx` / `users.tsx` 改 import `tokens.ts`(§4.4 / §4.5)
- [ ] `attachments.tsx` 综合整改(§4.2)
- [ ] `departments.tsx` 综合整改(§4.3)
- [ ] `login-logs.tsx` 综合整改(§4.1)
- [ ] `dicts/$typeCode.tsx` 替换 datetime-local(§4.6)
- [ ] `admin/index.tsx` 死链清理(§4.7)
- [ ] 新建 `DetailSheet` 组件,迁移 login-logs(§3.4)
- [ ] 新建 `ResourceBulkBar` 组件(§3.5)
- [ ] **验收**:
  - `grep -r 'type="datetime-local"\|type="date"' src/routes/admin` 返回 0 行
  - `grep -r 'DetailRow\|LoginLogDetailSheet' src/routes/admin` 返回 0 行
  - `grep -rE 'TABLE_ACTION_CLASS \| TABLE_DANGER_ACTION_CLASS \| FILTER_CONTROL_CLASS \| TEXTAREA_CLASS' src/routes/admin` 仅在 import 语句出现
  - `grep -rE 'border-\[#\|bg-\[#\|text-\[#[0-9a-fA-F]' src/routes/admin src/components/admin` 返回 0 行

### Phase 3 — 治理守卫(P1/P2,预计 0.5 周)

- [ ] `scripts/arch/check-ui-tokens.mjs`(§3.6)挂到 `check-all.mjs`
- [ ] `scripts/arch/check-ui-naming.mjs`(§3.7)
- [ ] `biome.json` 加 `noRestrictedImports` 禁 antd(§3.7)
- [ ] 更新 `CLAUDE.md` 与 `OWN.md` 的"CI 前置门槛"段,把 4 → 6 个守卫
- [ ] **验收**:故意在 `users.tsx` 加一行 `text-[#ff0000]`,`npm run arch:check` 必须 fail 并指向具体文件行号。

### Phase 4 — P1 新基础件(预计 1 周,可与 Phase 2 并行)

- [ ] `src/components/ui/switch.tsx`(替换 `OptionRow` 里的 Checkbox,§8.4)
- [ ] `src/components/ui/radio-group.tsx`
- [ ] `src/components/ui/form.tsx`(`FormField`,shadcn 风格,禁 antd `Form.Item`)
- [ ] `src/components/ui/toast.tsx` + `src/lib/sonner.ts`(顶部 3s,承接宪章 §3.5 / §6.3)
- [ ] `src/components/ui/alert.tsx`
- [ ] `src/lib/copy.ts`(集中文案:placeholder / 空态 / 错误 / 按钮动词)
- [ ] `src/lib/format.ts`(`formatDateTime` / `formatNumber` / `formatBytes`,吸收 login-logs 的本地 `formatDateTime`)
- [ ] `src/components/admin/attachments/upload-attachment.tsx` 升级(§4.8)
- [ ] **验收**:users/roles 把 `errorMessage` 与 `Popconfirm` 的失败提示改用 `useToast` 顶部 toast;`/admin/settings` 用 `<Switch>` 替 Checkbox;`/admin/users` 编辑表单用 `<FormField>` 包 RHF。

### Phase 5 — P2 收尾(季度内)

- [ ] 暗黑模式触发 + 用户偏好切换(宪章 §11 / `docs/dark-mode.md`)
- [ ] 类型 / 间距 / 圆角 extension token 化(宪章 §2.3 / §2.4)
- [ ] 24 列 `Grid/Row/Col` 抽象(宪章 §4.1 P2 第 1 条)
- [ ] `steps` / `tabs` / 独立 `pagination` 组件(宪章 §5.3 P2)

---

## 6. 验证清单

每个 Phase 完成后必跑(在 `CLAUDE.md` "CI 前置门槛"已声明):

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # biome check .
npm run arch:check       # 4 个守卫(Phase 3 之后变 6 个)
npm test                 # vitest run,目前 115 cases
npm run build            # Vite + Nitro 构建,验证 FC3 包能产出
```

页面级 smoke test:

- 启 dev server,逐页打开 `/admin/{users,roles,departments,dicts,menus,portals,posts,storages,attachments,login-logs,settings,index}`;
- 校验点:
  1. **空状态**:清空 filter,看到 `<EmptyState>` 三段式文案 + 1 个清空筛选按钮(宪章 §3.4);
  2. **加载**:network throttle 到 Slow 3G,看到 5 行骨架(宪章 §6.2);
  3. **错误**:后端停掉,看到 `border-destructive/30 bg-destructive/5 text-destructive` 错误条 + 重试按钮(宪章 §3.5 / §7.7);
  4. **启停**:点"禁用"必弹 Popconfirm,焦点在取消按钮(宪章 §9.5);
  5. **批量**:users 多选后看到"批量停用 (n)" `variant="outline"` 按钮(宪章 §9.1);
  6. **响应式**:DevTools 切到 375px / 768px / 1280px,Dialog 自动变 Sheet,工具栏不溢出。

---

## 7. 关键文件索引

### 已存在(本路线图不动)

- `src/components/admin/data-table/tokens.ts`(4 CLASS 常量)— ✅
- `src/lib/classes.ts`(`MONO_CELL` / `MONO_CHIP` / `MONO_FIELD`)— ✅
- `src/components/admin/form/{date-range-picker,popconfirm,responsive-form-layer}.tsx` — ✅

### 待新增

- `src/components/admin/form/detail-sheet.tsx`(§3.4)
- `src/components/admin/data-table/resource-bulk-bar.tsx`(§3.5)
- `src/components/ui/{switch,radio-group,form,toast,alert}.tsx`(Phase 4)
- `src/lib/{copy,format}.ts`(Phase 4)
- `scripts/arch/check-ui-tokens.mjs`(§3.6)
- `scripts/arch/check-ui-naming.mjs`(§3.7)

### 待修改(本路线图)

- `docs/DESIGN_CHARTER.md`(§2.1–§2.8 八条)
- `scripts/arch/check-all.mjs`(挂两个新守卫)
- `biome.json`(`noRestrictedImports` antd)
- `CLAUDE.md` / `OWN.md`(CI 门槛段)
- 5 个 admin 路由页(`roles.tsx` / `users.tsx` / `attachments.tsx` / `departments.tsx` / `login-logs.tsx`)
- 1 个 admin 子页(`dicts/$typeCode.tsx`)
- 1 个工作台(`admin/index.tsx` 死链)

### 不在本路线图范围

- 后端 / 数据库改动(零)
- 非 admin 路由(零)
- `src/features/*` 业务逻辑(零,只可能因为 Phase 4 的 toast 接入而有 useToast 调用)
- 已对齐的 5 页(`dicts.tsx` / `menus.tsx` / `portals.tsx` / `posts.tsx` / `storages.tsx`)— 不动
- 测试用例新增(若 Phase 3 arch:check 守卫需要用例,补在 `scripts/arch/check-ui-tokens.test.mjs`)

---

## 8. 待你确认的关键决策

在动手 Phase 1 前,有 4 个问题需要拍板:

1. **宪章 §2.1 ID 列规约**:是禁止所有列表页展示 ID,还是允许"详情页可展示 + 行菜单"复制"?现行 11 页都没有 ID 列,与禁止方案一致。本路线图默认**禁止**(详情页走 `DetailSheet`,菜单加"复制 ID")。
2. **§2.7 mono 字号**:现有 3 个常量(11/12/13 px)够用,还是需要再补一档?本路线图默认**当前 3 档足够**,`text-[12.5px]` 视为 off-scale 禁止。
3. **`DateRangePicker` 时分秒精度**:当前组件只支持日精度;`login-logs` 等日志场景可能需要时分。本路线图默认**扩展 `withTime` prop**,而不是另造组件。
4. **filter 单态 vs draft+commit**:树表(`departments` / `menus`)对响应性敏感,filter 单态(client 端立即过滤)有体感优势;要不要为树表破例保留单态?本路线图默认**统一改 draft+commit**(宪章 §4.4 是统一范式,响应性可用 `useDeferredValue` 缓解)。

> 若以上 4 个决策你的选择与默认不一致,在 Phase 1 开始前告知我,我会调整 §2 / §3 的具体内容。
