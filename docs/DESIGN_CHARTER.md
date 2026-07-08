# yishan-tan 设计宪章(DESIGN CHARTER)

> 本宪章是 yishan-tan 后台 UI 的**设计治理章程**,权威约束所有 admin UI 决策。与 `CLAUDE.md`(架构)/ `OWN.md`(分层)/ `admin-ui-plan.md`(实施方案)同级,后续将被 biome 与 arch:check 引用为硬约束。
>
> **底层方法**:本宪章源于对 Ant Design 设计规范(40 子页)的系统研读 + yishan-tan 现状盘点,完整研读材料见 `/home/dfy/.claude/plans/antd-https-ant-design-antgroup-com-docs-temporal-dream.md`。antd 规范是**设计参考**,不是迁移目标。

---

## 0. 立场与适用范围

### 0.1 三层立场(避免混淆)

| 层级 | 与 antd 的关系 |
|---|---|
| **价值观 / 设计原则 / 设计模式** | **完全采纳**(自然/确定性/意义感/生长性 + 10 条原则 + 反馈/导航/录入/展示/文案/按钮模式) |
| **设计令牌的组织原则**(HSB、12 套基础色板概念、8 倍数、4 层阴影、24 栅格) | **结构参考**,具体数值**项目自有** |
| **组件库 / Provider / 色板算法 / antd 全套 token** | **不引入** antd |

### 0.2 核心立场:颜色约束的本质是"通过 token 引用,不重复声明值"

- 宪章**不规定颜色该是什么颜色**(antd 的 `#1677ff` Daybreak Blue 是参考,不是目标)
- 宪章**不强制字阶 / 间距 / 圆角的具体数值**与 antd 对齐(项目自有 **基础 4 档字阶 + B 端扩展 3 档**、**6 档间距**、**基础 6 档圆角 + hero 扩展 1 档**是 B 端高密度定位的**刻意选择**,详见 §2.3 / §2.4 / §2.5)
- 宪章**硬约束的是**:业务组件内禁止裸 hex / 禁止字阶乱飞 / 禁止间距随意 — 任何颜色 / 字号 / 间距都必须先在 `src/styles/globals.css` 或 Tailwind 主题扩展中声明 token,然后通过 token 引用

### 0.3 技术栈

- **组件库**:shadcn/ui + Radix UI(`src/components/ui/` 原子层)
- **样式**:Tailwind v4 CSS-first `@theme inline`(token 集中在 `src/styles/globals.css`)
- **admin 复合组件**:`src/components/admin/`(业务一致的视觉决策收敛处;视觉决策**全部**在此层,基础组件保持纯展示)
- **图标**:lucide-react
- **表单**:react-hook-form + zod + @hookform/resolvers
- **不引入** antd / antd-style / ConfigProvider

### 0.4 适用范围

- `src/components/admin/` 全部组件
- `src/components/ui/` 的 admin 用法(基础组件的 admin 层扩展)
- `src/routes/admin/` 全部页面
- `src/styles/globals.css`(设计令牌集中点)

### 0.5 与现有文档的引用关系

- `CLAUDE.md`:「UI 一致性约束见 `docs/DESIGN_CHARTER.md`」
- `OWN.md`:「分层与硬约束见本文;**UI 规约见 DESIGN_CHARTER.md**」
- `admin-ui-plan.md`:叙事性方案;**强制约束以 DESIGN_CHARTER.md 为准**
- biome.json / arch:check 引用宪章章节号(如 §9.1)

---

## 1. 设计价值观(完全采纳 antd)

### 1.1 自然(Natural)

- **感知自然**:约 80% 外界信息通过视觉获取,视觉要素(布局/色彩/插画/图标)应充分汲取自然界规律,降低认知成本
- **行为自然**:理解用户、系统角色、任务目标关系,场景化组织系统功能和服务

### 1.2 确定性(Certainty)

- **设计者确定**:模块化设计、面向对象方法、保持克制(能做但想清楚了不做)
- **用户确定**:跨产品 / 跨终端 / 跨系统保持良好确定性

### 1.3 意义感(Meaningfulness)

- **结果意义**:明确目标、即时反馈
- **过程意义**:挑战适中、全情投入

### 1.4 生长性(Growth)

- **价值连接**:建立系统设计思维,洞悉产品功能价值
- **人机共生**:把用户和系统作为动态发展的共同体

---

## 2. 设计令牌(Design Tokens)

> **原则**:项目自有令牌体系不替换;antd 的色板 / 字阶 / 间距**仅作"为什么这样组织"的结构参考**,具体数值以本节为准。

### 2.1 颜色

- **项目自有选型**;参考 antd 的色板组织原则(HSB 模型、12 套基础色板概念、文本透明度色板)
- 浅色:`brand-50…950`(锚点 `#1677ff`)+ 中性 5 档 + 文字 3 档(`text-strong/soft/mute`)+ 边框 / 分割线 + 图表 5 色
- 暗黑:`.dark` 类触发,锚点 `--primary: #3b82f6`,具体色值见 globals.css
- **硬约束(不论数值是否与 antd 相近)**:新增颜色必须先在 `globals.css` 声明 token,业务组件内**禁止裸 hex**

### 2.2 字体

- **字体家族**:PingFang SC / Hiragino Sans GB / Microsoft YaHei(中文优先)
- **数字字**:`font-variant-numeric: tabular-nums`(参考 antd 数字字建议,启用数字等宽)
- **字重**:regular 400 / medium 500 / semibold 600(组件层显式声明,不要散用 `font-medium` 等隐式类)

### 2.3 字阶(**基础 4 档 + B 端扩展 3 档**,B 端高密度定位)

**基础 4 档**(token: `text-h1 / text-h2 / text-body / text-caption`):

| 档位 | 像素 | 用途 |
|---|---|---|
| h1 | 18 | 页面主标题(`PageHeader` md) |
| h2 | 16 | 区块标题 / 卡片标题 |
| body | 13 | 正文 / 表格内容 / 控件文字 |
| caption | 12 | 描述 / 提示 / 元数据 |

**B 端扩展 3 档**(仅详情页 / 弹层 / 营销页,PR 必引用 §2.3):

| 扩展档 | 像素 | 典型场景 |
|---|---|---|
| ex-14 | 14 | 表单辅助说明 / 详情字段值 |
| ex-15 | 15 | 弹层标题(`FormDialog` / `FormSheet` title) |
| ex-24 | 24 | 营销页 hero / 空状态标题 |

- **B 端高密度定位,刻意不照搬 antd 10 档**;跨场景不可混用(列表页 body=13 不能写到详情页改 14)
- 全部字阶必须通过 token(`text-h1` / `text-body` 等)或扩展 token 引用,业务组件内**禁止**裸 `text-[Npx]`(宪章 §2.3 + §13 反模式清单);arch:check `check-ui-tokens`(§12.2)机械校验

### 2.4 间距(**6 档基础 + 3 档扩展**,8 倍数)

**基础 6 档**(对齐 antd 8 倍数原则):

| 档位 | 像素 |
|---|---|
| 1 | 4 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |
| 6 | 24 |
| 8 | 32 |

> **档位编号语义**:`档位号 = 像素 / 4`(1=4px,2=8px,3=12px,4=16px,6=24px,8=32px)。5/7 档刻意省略以保持 4 倍数与 8 倍数集合;业务组件禁止使用 `p-?` / `gap-?` 等 Tailwind 默认档(0.5/1.5/2.5)与 `py-1.5` 等 1.5 倍数值。

**B 端扩展 3 档**(Phase 3 第 3 条,仅 hero / 落地页,PR 引用 §2.4):

| 扩展档 | 像素 |
|---|---|
| 10 | 40 |
| 12 | 48 |
| 16 | 64 |

- **8 倍数原则对齐 antd**
- 这组数字与"弹层宽度"无关(§10.2 Dialog 5 档是 `max-w-*`,不与本节挂钩)

### 2.5 圆角(**基础 6 档 + hero 扩展 1 档**)

**基础 6 档**(基于 `--radius: 0.375rem` 派生):

| 档位 | px | rem | 典型场景 |
|---|---|---|---|
| `rounded-sm` | 4 | 0.25 | 标签 / Tag / 小徽标 |
| `rounded-md` | 6 | 0.375 | **表单控件 / 输入框 / 默认控件** |
| `rounded-lg` | 8 | 0.5 | 卡片 / 弹层 / 抽屉 |
| `rounded-xl` | 12 | 0.75 | 大卡片 / 主弹层 |
| `rounded-2xl` | 16 | 1 | 详情页大图 |
| `rounded-3xl` | 24 | 1.5 | 极端大圆角(罕见) |

**hero 扩展 1 档**(仅 hero / 落地页,PR 引用 §2.5):

| 档位 | px | rem | 典型场景 |
|---|---|---|---|
| `rounded-4xl` | 32 | 2 | hero 卡片 |

- 徽标 / Tag:**`rounded-[3px]`**(刻意比 sm 档更小,表达"非交互元素")
- 业务组件禁止使用 `rounded-[7px]` / `rounded-[10px]` 等非档位值;arch:check `check-ui-tokens`(§12.2)机械校验

### 2.6 阴影(5 层,含按钮特例)

| 层 | token | 用途 |
|---|---|---|
| 0 | (无) | 紧贴地面 / 输入框(antd 同款) |
| 1 | `shadow-card` | 卡片默认 |
| 2 | `shadow-card-hover` | 卡片 hover |
| 3 | `shadow-brand` | 弹层 / 浮层 / 下拉 |
| - | `shadow-button = none` | 按钮默认无阴影(避免视觉干扰);**反模式见 §13.16** |

- **层数对齐 antd**,具体值项目自有
- 按钮无阴影是硬约束,例外需 PR 引用 §2.6

### 2.7 网格

- **栅格列数**:24 列(参考 antd)
- **主区宽度**:`max-w-[1280px]`(不强制对齐 antd 1440px 画板)
- **断点**:sm 640 / md 768 / lg 1024 / xl 1280(对齐 Tailwind 默认)

### 2.8 暗黑模式

- 触发:`.dark` 类挂 `<html>` 根节点(触发机制文档化见 §11)
- 设计原则:**内容舒适性**(避免强对比)+ **信息一致性**(与浅色模式层级一致)

---

## 3. 文字与排版规则

### 3.1 文案风格

- **人称**:用"你/我"不用"您";不要在同一句式中混用"你"和"我"
- **客观**:报错用"无法完成"而非"失败";系统造成用"抱歉",用户造成不能用
- **鼓励性**:多给支持与鼓励,不用"不能/不要/请勿";出错不责怪用户
- **不极端**:不用"绝不"等绝对表述
- **数字**:统计数据使用阿拉伯数字(用户感知更快)
- **标点**:全角 / 半角搭配时加空格(如"两个""2 个""50%");句末文字链不用句号;句号「。」不在按钮 / 标题;省略号用半角「…」

### 3.2 按钮文案

- 必须动词(下拉按钮除外)
- 默认"确定 / 取消"在弹层可用;"发布 / 登录 / 注册"语义更优
- 用语简练,不重复已知事实

### 3.3 占位文案(企业 中台惯例)

> **项目首选 = 企业 中台惯例**:简洁、统一、可读性高。
> **AntD 哲学作为更高质量备选**:给具体示例能降低用户理解成本。
>
> PR 默认走企业 中台惯例;若使用 AntD 风格(`如:XXX`),必须在 PR 描述引用 §3.3 说明选择 AntD 的理由。

**企业 中台惯例(项目默认)**:

| 控件类型 | placeholder 写法 | 示例 |
|---|---|---|
| **Input / Textarea**(主体输入) | `请输入` | label="用户名" → `placeholder="请输入"` |
| **Input**(格式敏感:邮箱/手机/日期/API Key) | 格式示例(无前缀) | label="邮箱" → `placeholder="example@email.com"` / label="手机号" → `placeholder="138 0000 0000"` |
| **Select / SelectValue**(单选下拉) | `请选择` | `placeholder="请选择"` |
| **MultiSelect**(多选下拉) | `请选择(可多选)` | `placeholder="请选择(可多选)"` |
| **搜索框 / 关键字过滤** | 语义引导 | `placeholder="搜索附件名"` / `placeholder="搜索用户"` |
| **DatePicker / RangePicker** | `请选择日期` / `请选择区间` | `placeholder="请选择日期"` |

**AntD 风格备选(可选,PR 引用 §3.3)**:

| 类型 | 写法 | 示例 |
|---|---|---|
| 输入格式引导 | `如:XXX` | `如:[email protected]` / `如:138 0000 0000` |
| 内容示例引导 | `如:XXX` | `如:zhangsan` / `如:系统最高权限` |

**硬约束(不论选哪种风格都生效)**:

- ❌ **禁止重复 label 内容**:`placeholder="请输入姓名"` 当 label="姓名" — 不论是企业惯例还是 AntD,这条都违反
- ❌ **禁止承载规则说明**:放 help text / tooltip
- ❌ **禁止作为唯一信息来源**:label / help text 必须独立存在
- ❌ **禁止冗余话术**:`placeholder="请输入搜索内容进行搜索"`

**正反示例**(label="邮箱"为例):

| placeholder | 风格 | 判定 |
|---|---|---|
| `请输入` | 企业 中台惯例 | ✅ 正确(默认) |
| `example@email.com` | 企业 中台格式示例 | ✅ 正确(邮箱 / 手机 / API Key 等格式敏感字段) |
| `如:[email protected]` | AntD 备选 | ✅ 正确(PR 引用 §3.3) |
| `请输入邮箱` | 重复 label | ❌ 禁止 |
| `请填写与身份证一致的邮箱地址` | 规则说明 | ❌ 应放 help text |
| `name@example.com` | 格式示例(无前缀,符合企业惯例) | ✅ 正确 |

**Rule(机械化检查)**:

```text
RULE: Placeholder must NOT duplicate label or help text.

DEFAULT (企业中台):
  - Input / Textarea → "请输入"
  - Format-sensitive (email/phone/apiKey) → "example@email.com" / "138 0000 0000" / "sk-xxxxxx"
  - Select → "请选择"
  - Search → "搜索 XXX"
  - DatePicker → "请选择日期"

OPTIONAL (AntD, 需 PR 引用 §3.3):
  - "如:XXX" 前缀的格式 / 内容示例

INVALID (一律禁止):
  - "请输入 XXX" 重复 label
  - 规则说明 / 校验规则 / help text 内容
  - 冗余话术("请输入搜索内容进行搜索" 等)
```

**项目约定**:

- ✅ 默认统一用企业 中台惯例,跨路由 / 跨表单风格一致
- ⏸ AntD 风格 `如:XXX` 仅在"具体示例能显著降低用户理解成本"时使用,需 PR 引用 §3.3 说明
- ❌ 同一路由内禁止两种风格混用
- ❌ 字段下方有 help text 时,placeholder 可以省略,但**禁止重复 label**

### 3.4 空状态文案

- 三段式:**状态描述 + 原因 + 建议操作**
- 标题 ≤14 字,描述 ≤30 字
- 操作引导建议 ≤2 项

### 3.5 错误文案

- 集中点:`src/lib/errors.ts` 七条 ServerError 文案(`请先登录` / `权限不足` / `资源不存在` / `资源已存在` / `邮箱或密码错误` / `参数不合法` / `请求过于频繁,请稍后再试` / `服务暂时不可用`)
- UI 错误统一走 `useToast()` 或 `<EmptyState>`,**不直接 `alert()`**
- 错误条样式:`border-destructive/30 bg-destructive/5 text-destructive`

---

## 4. 布局与栅格

### 4.1 栅格

- **24 列**(参考 antd)
- 后续封装 `Grid/Row/Col` 复合组件(P2)

### 4.2 页面骨架

- **三段式**:Header(标题 / 摘要 / 导航)+ Body(具体内容)+ Footer(补充信息和工具栏)

### 4.3 后台主区

- `max-w-[1280px]` 居中
- 左右内边距 `px-4 sm:px-6 lg:px-8`

### 4.4 列表页骨架

- **`ResourcePage(PageHeader + FilterBar + ResourceTable)`** 三件套
  - 三件套分别来自 `src/components/admin/data-table/`(`ResourceTable`、`FilterBar`)与 `src/components/admin/layout/`(`PageHeader`);跨目录组合由 admin 路由页组装
- FilterBar 列数默认 3,可调 4-6
- 工具栏右对齐"新增 / 上传"

### 4.5 详情 / 表单 4 梯度

1. **基础布局**(单列纵向,最高效)
2. **弱分组**
3. **区域内分组**
4. **卡片分组**(页面内容 > 两屏且可分类归纳时)

**资源表单例外**:后台资源新增 / 编辑弹层可在桌面端使用两列 grid,用于用户管理这类字段密度较高的管理表单。规则:

- 移动端 / Sheet 仍为单列;`sm` 及以上可切两列
- 同一区域内字段必须进入同一个 `grid grid-cols-1 sm:grid-cols-2`,禁止一部分字段在 grid 内、一部分字段在 grid 外造成控件宽度不齐
- 备注、长文本、复杂树选择可用 `sm:col-span-2` 跨两列
- grid item 必须允许收缩:字段外层使用 `min-w-0`,输入 / 选择器内部文本使用截断或 `min-w-0`,避免长岗位名 / 角色名撑破列宽
- 可搜索选择器 / 树选择器的下拉弹层宽度必须等于 trigger 宽度,优先使用 Radix 变量 `width: var(--radix-popover-trigger-width)`,禁止依赖一次性 JS 测量值作为最终宽度

**禁止**:在同一表单区域里混用两列字段和全宽字段,除非全宽字段显式 `sm:col-span-2`

---

## 5. 组件 API 规约

### 5.1 基础组件

shadcn/ui 基础组件 16 个(落地于 `src/components/ui/`),使用 `data-slot` 暴露 stable hooks:

| # | 组件 | 用途 |
|---|---|---|
| 1 | `alert-dialog` | 模态确认 / 重要操作确认(高优先级反阻断) |
| 2 | `badge` | 静态徽标 / 标签(状态展示) |
| 3 | `button` | 触发动作 |
| 4 | `card` | 容器(分组) |
| 5 | `checkbox` | 多选 / 单一开关(无独立 `switch` 时退化) |
| 6 | `collapsible` | 可折叠区域 |
| 7 | `dialog` | 居中模态 |
| 8 | `dropdown-menu` | 下拉菜单 |
| 9 | `input` | 单行文本输入 |
| 10 | `label` | 表单 label 关联 |
| 11 | `scroll-area` | 滚动区域(替代原生滚动条) |
| 12 | `select` | 单选下拉 |
| 13 | `separator` | 分隔线 |
| 14 | `sheet` | 抽屉 / 侧滑 |
| 15 | `table` | 表格原语(被 `ResourceTable` 封装) |
| 16 | `tooltip` | 悬停提示 |

- 命名:PascalCase,无前缀(`Button` / `Dialog` / `Sheet` 而非 `YishanButton`)
- 缺失待补(P1,见 §5.3 / Phase 2):`switch` / `radio-group` / `form` / `toast` / `alert`

### 5.2 复合组件(admin/ 下)

- 全部视觉决策收敛此处
- 必须有 `displayName`、必须有 `data-slot`、props 类型用 `import type`

### 5.3 缺失组件优先级(P1 / P2 待补)

| 优先级 | 组件 | 替代方案 |
|---|---|---|
| P1 | `switch` | 替代 `OptionRow` 中 `checkbox` 的开关用法 |
| P1 | `radio-group` | 当前完全缺失,Form 表单需要 |
| P1 | `form` / `FormField` | 基于 react-hook-form + zod,封装 label + 校验 + 必填星号 + 错误展示;**对齐 shadcn FormField 命名**(不用 `Form.Item` 这种 antd 风格名) |
| P1 | `toast` / `message` | 顶部居中 3s,基于 `sonner` 或自研 |
| P1 | `alert` | 非模态顶部条 |
| P2 | `date-picker` | 列表 / 表单筛选条件常需要 |
| P2 | `steps` | 适用复杂流程如安装向导 |
| P2 | `tabs` | 详情页内多视图切换 |
| P2 | `pagination`(独立组件) | 当前由 `ResourceTable` 自绘 |

---

## 6. 反馈与消息

### 6.1 选型矩阵

| 场景 | 选型 |
|---|---|
| 简短成功反馈 | Message / Toast(顶部居中,3 秒) |
| 重要成功结果(不打断) | Modal(全屏结果页) |
| 失败反馈(留在原地) | Modal(重要) / Toast(一般) / 表单校验提示 |
| 失败反馈(跳转) | 独占式 Inline Text & Illustration |
| 后台操作 | Notification(右上角) / 通知中心 |
| 行级轻量确认 | Popconfirm(气泡) |
| 全屏轻量确认 | `useConfirm()`(Modal.confirm 风格) |
| 表单校验反馈 | 紧跟说明区块,**不自动消失** |

### 6.2 加载

- **操作 > 2 秒必须给 loading**(参考 antd 阈值)
- 长加载必须给"取消"按钮
- 表格加载用 5 行骨架屏(ResourceTable 已实现)

### 6.3 提交反馈

- **成功**:3-5 秒 Toast(P1 实现后)或 inline 高亮
- **失败**:Modal(重要失败,避免遗漏)/ Toast(一般)

### 6.4 悬停覆盖层

- **延迟 0.5 秒触发**(参考 antd 数值)
- 移出立即关闭

### 6.5 二次确认

- 优先 Popconfirm(行级)或 `useConfirm()`(全屏)
- **不用 Modal 做轻量确认**(参考 antd "狼来了"反例)

---

## 7. 表格与列表

### 7.1 列对齐

- **文本**:左对齐
- **数值**:右对齐(参考 antd 数据格式)
- **状态**:居中
- **操作**:右对齐(sticky-right)

### 7.2 无数据占位

- **统一 `--`**(参考 antd 数据格式)
- 或 `EmptyState` 组件
- **不允许** `-` / `空` / `暂无` 混用

### 7.3 分页

- **不足一页不展示分页器**(参考 antd)
- pageSize 选项:`[10, 20, 50, 100]`
- **>5 页**提供快速跳转(参考 antd)
- 显示"第 N-M 条 / 总共 N 条"

### 7.4 操作列(模板化)

- 模板:**"编辑 / 启停(切换文字)/ 更多下拉(放危险动作+popconfirm)"**
- 按钮:`variant="link" text-[13px]` + `text-brand-600` 或 `text-destructive`
- 间距 `gap-3`

### 7.5 行选中

- 与操作冲突时,Checkbox 列 `e.stopPropagation()` 阻断行点击
- 选中行:`data-[state=selected]:bg-brand-50`

### 7.6 列冻结

- `sticky: "left" | "right"`,仅在必要列用(操作列默认 sticky-right)

### 7.7 加载与错误

- 骨架屏:5 行 `max-w-[180px] animate-pulse rounded bg-line-soft`
- 错误条:只对"有旧数据但拉新失败"展示,不因空数据 + 错误清屏

---

## 8. 表单与录入

### 8.1 表单骨架

- `FormDialog`(居中模态)+ `FormSheet`(抽屉)+ `ResponsiveFormLayer`(768px 切 Dialog↔Sheet)
- 基于 react-hook-form + zod + @hookform/resolvers
- **API 风格**:FormDialog / FormSheet 内部使用 `FormField` + react-hook-form `Controller`(对齐 shadcn 标准,不用 antd `Form.Item` 风格;命名规则详见 §5.3)

### 8.2 Label 摆放

- **默认左侧 92px**(参考 antd QueryFilter 思路)
- 过长或英文环境可上方,**同系统需统一**

### 8.3 校验反馈

- 紧跟说明区块,**不自动消失**(参考 antd 录入反馈)
- 用户交互后才消失

### 8.4 录入控件选型

| 控件 | 数量阈值 | 说明 |
|---|---|---|
| **Radio** | 2 < 个数 < 5 | 参考 antd,默认可见便于比较 |
| **Select** | 选项 > 5 时使用 | 按逻辑排序,尽量显示完整 |
| **SearchSelect** | 选项 > 10 或选项文本较长时使用 | 单选可搜索,如岗位;trigger 与 popover 必须同宽 |
| **TreeSelect** | 层级数据选择 | 如归属部门;单选可搜索,树节点按层级缩进 |
| **Switch** | 内联标签(禁用 / 启用) | 立即生效无需配合按钮(P1 替换当前 Checkbox 用法) |
| **MultiSelect / SearchMultiSelect** | 选中 > 3 用 `+N` 折叠 | 角色等多选;chip 必须可截断,不能撑宽控件 |
| **DatePicker** | P2 待补 | — |
| **Slider** | 连续值,精准值可搭配 Input | — |

**选择器宽度规则**:

- Select / SearchSelect / SearchMultiSelect / TreeSelect 默认 `w-full`,宽度由表单 grid 列控制
- 字段外层必须 `min-w-0`,控件根节点和输入文本层也必须允许收缩
- Popover 类下拉内容必须使用 `width: var(--radix-popover-trigger-width)` 对齐 trigger;Select 原语使用 `w-[var(--radix-select-trigger-width)]`
- 下拉项长文本必须在可用宽度内 truncate,不得反向撑开弹层或表单列

### 8.5 文件上传

- **三要素**(参考 antd):大小 + 格式 + 进度
- 当前 `UploadAttachment` 仅按钮,**缺进度条 / 拖拽**(P1 待补,详见 Phase 2 第 9 条)

---

## 9. 按钮层级

### 9.1 主按钮唯一(硬约束)

- **同一按钮区主按钮最多 1 个**(参考 antd)
- 表格工具栏"新增"默认主按钮;"批量停用"必须改 `variant="outline"`(2026-07 审计:仅 `users.tsx` 1 处存在,已合规;其余 5 个资源无批量停用功能,见 Phase 1 第 3 条)

### 9.2 顺序

- **左正右险**(参考 antd):推荐操作在左,风险 / 撤回操作在右,折叠内容始终在最右
- CTA 一屏一个

### 9.3 图标按钮

- **必须 Tooltip**(参考 antd)

### 9.4 文字按钮

- 表格行操作 `variant="link" text-[13px]`

### 9.5 危险按钮

- `variant="destructive"`,搭配 Popconfirm
- Popconfirm 默认 `side="top" align="end" sideOffset={6}`,**打开时焦点落在取消按钮**(防误触)
- Tab 顺序 = Cancel → Confirm → 关闭(ESC),符合危险操作防御性 UX(参考 antd)

---

## 10. 响应式与断点

### 10.1 断点

| 断点 | 像素 | 用途 |
|---|---|---|
| sm | 640 | (预留) |
| md | 768 | `ResponsiveFormLayer` 切换阈值 |
| lg | 1024 | 侧栏切换阈值 |
| xl | 1280 | (预留) |

### 10.2 弹层切换

- `ResponsiveFormLayer` 在 768px 切 **Dialog ↔ Sheet**
- Dialog 5 档宽度:
  - `sm:max-w-sm`(360px) — 仅展示 / 单字段
  - `max-w-md`(448px) — 普通表单
  - `max-w-lg`(512px) — 中等复杂表单(少量字段编辑)
  - `max-w-2xl`(672px) — 多字段表单 / 列表选择
  - `max-w-[min(96vw,840px)]` — 大内容弹层(两列资源新增 / 编辑 / 详情预览 / 仪表盘嵌入,如用户新增与编辑)
- **联动**:含 1-2 项操作引导(§3.4)的弹层推荐 ≥`max-w-md`;仅展示类可用 `max-w-sm`
- 桌面设计基准以 `1920x1080` 校验:两列资源表单的同列控件、跨列字段、Popover 弹层必须在该尺寸下宽度一致且不被长文本撑开

### 10.3 侧栏切换

- `lg` 以下侧栏转 Sheet(`w-72 max-w-[85vw]`)
- 收起宽度 64px / 展开 256px

### 10.4 顶栏

- 固定 `h-12`(48px)
- 移动端折叠为汉堡菜单

### 10.5 主区容器

- `max-w-[1280px]` 居中
- `px-4 sm:px-6 lg:px-8`

---

## 11. 暗黑模式

### 11.1 触发

- `.dark` 类挂 `<html>` 根节点(`@custom-variant dark` 已在 `src/styles/globals.css` 配置)
- **当前选择 = 选项 B(用户偏好切换,默认跟随系统)**;预留 A/C 接口为 P3
- 实施细节见 `docs/dark-mode.md`:
  - 默认值:首次访问时读取 `prefers-color-scheme: dark`,为真则启用暗色
  - 切换入口:顶部 Header 加切换按钮(用户偏好持久化到 localStorage)
  - A/C 接口位:P3(系统强制 / 管理员配置)
- 决策时间:2026-07 Phase 1 修订

### 11.2 颜色

- 完整 `dark:` 前缀映射
- 浅色 → 暗色色板映射关系见 `globals.css`
- 锚点:`--primary: #3b82f6`(亮蓝)

### 11.3 设计原则(参考 antd)

- **内容舒适性**:避免强对比
- **信息一致性**:与浅色模式层级一致

---

## 12. 治理与守卫

### 12.1 现有 arch:check 守卫(不动)

- `check-routes`:routes 不得直接 import db/auth/redis
- `check-actions`:actions 不得 import db/drizzle
- `check-services`:services 不得 import React/routes/components
- `check-naming`:feature 文件前缀 + REST 复数

### 12.2 新增 arch:check 守卫(P1 / P2)

| 守卫 | 触发 | 检查内容 | 阶段 |
|---|---|---|---|
| `check-ui-tokens` | P1 立即 | 禁止 `src/components/admin/**` 出现裸 hex(除 token 文件外);禁止字阶乱飞(只允许 `text-h1/h2/body/caption` + 扩展档 14/15/24);禁止圆角 / 间距 / 圆角 / 字号使用非档位值 | Phase 2 第 8 条 |
| `check-ui-naming` | P2 短期 | admin 复合组件必须 PascalCase、必须有 `data-slot`、必须有 `displayName` | Phase 3 第 5 条 |

### 12.3 biome 新增规则(P2)

- `noRestrictedImports`:禁止 admin 组件 import antd

### 12.4 PR 治理

- 重大 UI 改动须更新本宪章
- PR 描述必须引用宪章章节号(如 `DESIGN_CHARTER §9.1`)
- 每季度审一次宪章与 antd 规范的偏差

---

## 13. 反模式清单(显式禁止)

| # | 反模式 | 正确做法 | 规约章节 |
|---|---|---|---|
| 13.1 | 一屏多个主按钮(同区 >1 个 `variant="default"`) | 主按钮 ≤1,其余 outline / ghost | §9.1 |
| 13.2 | 文案混用"您"与"你/我" | 全项目统一"你/我" | §3.1 |
| 13.3 | 颜色使用裸 hex 而非 token | 走 `globals.css` 声明的 CSS 变量或 Tailwind 语义类 | §2.1 |
| 13.4 | placeholder 重复 label(如"请输入姓名")或承载规则说明 | 走 §3.3 企业 中台惯例(`请输入` / `请选择` / 格式示例);AntD 风格 `如:XXX` 需 PR 引用 §3.3 | §3.3 |
| 13.5 | 表格无数据用 `-` 而非 `--` | 统一 `--` 或 `EmptyState` | §7.2 |
| 13.6 | 文件上传缺"大小 / 格式 / 进度"任一项 | 三要素齐全 | §8.5 |
| 13.7 | 状态徽标与 link 按钮同行混用 | StatusBadge 显示状态,link 按钮触发动作 | §7.4 |
| 13.8 | Modal 做轻量二次确认 | 改 Popconfirm(行级)或 `useConfirm()` | §6.5 |
| 13.9 | 弹层外 keydown 无 Esc 关闭 / 无遮罩点击关闭 | Dialog/Sheet 默认支持 Esc + Overlay 点击 | §5.1 |
| 13.10 | 图表 / 插画硬编码 hex | 走 CSS 变量 / theme 色板 | §2.1 |
| 13.11 | "请稍候" 而非骨架屏作为加载占位 | 骨架屏 / Spinner | §6.2 |
| 13.12 | 一行多列表单 | 4 梯度选型,禁止同区多列 | §4.5 |
| 13.13 | 表格操作列放 4 个以上文字按钮 | 折叠到"更多" DropdownMenu | §7.4 |
| 13.14 | 一致性不引用宪章新增组件 | PR 必须引用宪章章节号 | §12.4 |
| 13.15 | 按钮文案用"确定 / 取消"(与 §3.2 重复表述) | 改为"发布 / 保存 / 删除"等动作动词;§3.2 与 §13.15 协同生效 | §3.2 |
| 13.16 | 按钮带默认阴影 | 走 `shadow-none`(§2.6 第 5 行硬约束),例外需 PR 引用 §2.6 | §2.6 |

---

## 14. 加载占位与进度规范(P2 规划)

> §6.2 已规定"操作 > 2 秒必须给 loading"与"骨架屏 5 行",本节为后续展开:Spinner 尺寸 / 位置 / 动画时长、按钮内 loading 三态(idle / loading / success)、上传进度条样式。Phase 3 实施,本期宪章先列占位章节。

---

## 15. 面包屑与导航层级

- **层级上限**:≤3 层(参考 antd 导航;**少于 3 层不展示面包屑**)
- **分隔符**:`/>`(右尖括号)或 `chevron-right`(lucide-react);统一全项目,不得混用
- **当前页**:末项文字色 `text-soft`,**不可点击**
- **可点击项 hover**:`text-brand-600`(沿用 §9.4 文字按钮 token)
- **可点击项最末折叠**:超过 3 层时,中间项折叠为"…",展开后显示完整路径
- **位置**:列表页 / 详情页固定在 `PageHeader` 上方,详情页可省略(`PageHeader` 自带标题)
- **空状态**:无面包屑时隐藏容器,避免出现"空白一栏"

---

## 附录 A:数值锚点速查表(参考 antd,具体值以本项目为准)

| 维度 | 数值 | 来源 |
|---|---|---|
| 字阶(基础 4 档 + B 端扩展 3 档) | 基础 18 / 16 / 13 / 12;扩展 14 / 15 / 24 | §2.3 |
| 间距(基础 6 档,8 倍数) | 4 / 8 / 12 / 16 / 24 / 32 | §2.4 |
| 圆角(基础 6 档 + hero 扩展 1 档) | 基础 4 / 6 / 8 / 12 / 16 / 24;扩展 32 | §2.5 |
| 阴影(5 层,含 button = none) | shadow-card / card-hover / brand / none | §2.6 |
| 加载触发阈值 | 2 秒 | §6.2 |
| 成功 Toast 停留 | 3 秒 | §6.3 |
| 悬停覆盖层延迟 | 0.5 秒 | §6.4 |
| 主按钮数 | 同区最多 1 个 | §9.1 |
| Radio 选项数 | 2 < 个数 < 5 | §8.4 |
| Select 选项数 | >5 时使用 | §8.4 |
| 分页 pageSize | [10, 20, 50, 100] | §7.3 |
| 分页快速跳转阈值 | >5 页 | §7.3 |
| 面包屑层级 | ≤3,少于 3 不展示 | §15 |
| 弹层切换断点 | 768px | §10.2 |
| 侧栏切换断点 | lg(1024px) | §10.3 |
| 顶栏高度 | 48px(h-12) | §10.4 |
| 主区宽度 | 1280px(max-w-[1280px]) | §10.5 |

---

## 附录 B:与 antd 规范的三层关系(立场汇总)

### B.1 完全采纳(价值观 / 原则 / 模式)

- **设计价值观**(4 条):自然 / 确定性 / 意义感 / 生长性 — §1
- **设计原则**(10 条):亲密性 / 对齐 / 对比 / 重复 / 直截了当 / 足不出户 / 简化交互 / 提供邀请 / 巧用过渡 / 即时反应
- **设计模式**(全局规则):反馈(§6)/ 导航(§10)/ 录入(§8)/ 展示(§7)/ 文案(§3)/ 按钮(§9)
- **设计原则核心 3 条**:对齐 / 对比 / 即时反应(覆盖静态视觉 / 信息层级 / 动态沟通)

### B.2 结构参考(组织原则参考,数值项目自有)

- **颜色**:HSB 模型 / 12 套基础色板概念 / 文本透明度色板(具体值用 `globals.css` 现有 token)
- **间距**:8 倍数原则(具体档位 4/8/12/16/24/32 项目自有)
- **阴影**:4 层原则(具体值项目自有)
- **网格**:24 列(主区宽度 1280 而非 antd 1440)
- **字阶**:基础 4 档 + B 端扩展 3 档原则(项目 4 + 3,刻意 B 端高密度)
- **圆角**:基础 6 档 + hero 扩展 1 档原则(基础值 0.375rem ≠ antd 2px)

### B.3 不引入(明确排除)

- antd 组件库本身
- ConfigProvider 体系
- antd 全套 token / 色板算法
- antd-style / antd-mobile
- Ant Motion / G2Plot / AntV 整套(可视化模块仅做"按需引入")

---

## 附录 C:迁移落地路径(分阶段)

### Phase 0 — 立宪章(本轮交付)

- ✅ 落地 `docs/DESIGN_CHARTER.md`(本文档)
- ✅ 在 `CLAUDE.md` / `OWN.md` 加引用行
- 不动任何业务代码

### Phase 1 — P0 立即对齐(预计 1 周)

> **2026-07 当前进度**:1/5 已完成(文案"您"→"你/我"),其余 4 项本轮修订一并落地。

1. ⏳ `globals.css` 加 `font-variant-numeric: tabular-nums` 到 `@layer base`(本轮代码合规修复)
2. ⏳ 裸 hex 收敛(`StatusBadge` 11 个 hex + `AdminHeader` 2 个 + `ResourceTable` 2 个 → Tailwind 语义色 + 新增 token):**仅去裸 hex,不改色值**(本轮代码合规修复)
3. ✅ 工具栏"批量停用" outline 化:仅 `users.tsx` 1 处存在,已 `variant="outline"`;其余 5 个资源无批量停用功能,不违例
4. ✅ 文案"您" → "你/我" 全量审计:`grep -rE '您' src/**/*.{ts,tsx}` 0 处命中
5. ⏳ 无数据占位 `--` 统一到 `ResourceTable` 与所有列表页(本轮代码合规修复)

### Phase 2 — P1 新组件(预计 2 周)

> **2026-07 当前进度**:0/9 已完成,均为 P1 待启动。`check-ui-tokens` 已从 Phase 3 提前到 Phase 2 第 8 条(对齐 §12.2)。

1. `src/components/ui/alert.tsx`(基础 Alert,非模态顶部条)
2. `src/components/ui/toast.tsx` + `src/lib/sonner.ts`(顶部居中 3s,基于 sonner)
3. `src/components/ui/switch.tsx`(替换 `OptionRow` 中的 Checkbox 开关用法)
4. `src/components/ui/radio-group.tsx`(补缺失)
5. `src/components/ui/form.tsx`(封装 **FormField** + label + 校验 + 必填星号 + 错误展示,基于 react-hook-form + zod;对齐 shadcn,不用 antd `Form.Item` 命名)
6. `src/lib/copy.ts`(文案集中点;**本轮先建空架子**,常用占位与按钮文案常量化)
7. `src/lib/format.ts`(时间 / 数字格式化)
8. **新增** arch:check `check-ui-tokens`(§12.2,P1):禁裸 hex + 禁字阶乱飞 + 禁圆角 / 间距 / 字号使用非档位值
9. **新增** `src/components/admin/attachments/upload-attachment.tsx` 改造(§8.5):进度条 + 拖拽 + 三要素齐全

### Phase 3 — P2 扩展(预计 1-2 月)

> **2026-07 当前进度**:0/7 已完成,均为 P2 待启动。已补齐 §5.3 提到的 4 个 P2 组件(DatePicker / Steps / Tabs / Pagination 独立)。

1. 24 列栅格封装 `Grid/Row/Col`
2. 字阶扩展 14/15/24(详情 / 弹层 / 营销页;token 化为 `text-ex-14 / ex-15 / ex-24`,§2.3 基础 + 扩展二分法)
3. 间距扩展 40/48/64(§2.4 表格 token 化为 `--spacing-10/12/16`,仅 hero / 落地页)
4. 暗黑模式触发机制 + 用户偏好开关(**§11.1 已决策 = 选项 B**;实施细节见 `docs/dark-mode.md`)
5. arch:check 新增 `check-ui-naming`(§12.2,P2):admin 复合组件必须 PascalCase + `data-slot` + `displayName`
6. biome 新增 `noRestrictedImports` 禁止 antd(§12.3)
7. **新增** §5.3 P2 组件落地:`date-picker` / `steps` / `tabs` / `pagination`(独立)

### Phase 4 — 持续治理

- 每次新增 admin 页面 / 组件,PR 必须引用宪章章节号(§12.4)
- 每季度审一次宪章与 antd 规范的偏差
- 设计变更需在 §13 反模式清单追加新条目
- §12.5 季度审计 checklist(P2 待补,本宪章先列占位)
