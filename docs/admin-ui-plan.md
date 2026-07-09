# 后台 UI 实施方案

> **强制约束以 [`docs/DESIGN_CHARTER.md`](./DESIGN_CHARTER.md) 为准**;本文档为叙事性方案,不构成权威约束。如发现本文与宪章冲突,以宪章为准并在 PR 中引用宪章章节号(§12.4)。

> 目标：为 `yishan-tan` 设计一套适合国内后台用户、符合大厂后台设计习惯、并与当前 `TanStack Start` 架构一致的管理界面方案。

## 1. 文档信息

- 项目：`yishan-tan`
- 范围：后台管理前端 UI 与交互方案
- 参考实现：`/home/dfy/workspace/products/yishan/apps/yishan-admin`
- 相关文档：
  - `docs/base-capabilities.md`
  - `docs/api-reference.md`
  - `docs/data-model.md`

## 2. 结论

本项目适合使用 `shadcn/ui`，但定位应当是“可定制基础组件层”，不是“完整后台模板”。

当前 admin UI 的落地基准页是 `src/routes/admin/users.tsx`。后续资源页优先对齐它的结构和交互，再考虑资源自身差异。

推荐方案：

- `shadcn/ui` 负责基础组件
- `TanStack Router` 负责后台路由与布局骨架
- `@tanstack/react-query` 负责数据查询与缓存
- 现有 `createServerFn` 负责数据访问
- 本地封装一层 `admin` 规范组件，承接国内后台通用交互

不建议：

- 直接引入一套重型后台模板
- 把 `shadcn/ui` 当成 `Ant Design Pro` 替代品直接使用
- 每个页面各自设计交互模式，导致后台风格不统一

## 3. 为什么选择 shadcn/ui

结合当前仓库现状，`shadcn/ui` 的主要优势是：

- 与当前 `Vite + React + Tailwind` 兼容，接入成本低
- 组件源码可控，方便按国内后台习惯调整样式和交互
- 能与 `lucide-react`、`@radix-ui/react-slot`、全局 CSS 变量体系自然协作
- 更适合构建项目自己的后台设计系统，而不是依赖外部组件库的默认风格

当前仓库已具备的条件：

- `@tanstack/react-router`
- `@tanstack/react-query`
- `tailwindcss`
- `lucide-react`
- `@/*` 与 `~/*` 路径别名
- `src/styles/globals.css` 全局样式入口

## 4. 为什么不能只靠 shadcn/ui 原子组件

参考项目 `yishan-admin` 使用的是 `Ant Design Pro` 体系，已经自带较完整的后台页面范式，例如：

- 顶层统一布局
- 侧边导航与面包屑
- `PageContainer`
- `ProTable`
- `ModalForm`
- 树选择与批量操作

而 `shadcn/ui` 提供的是基础组件，不会直接给出这些后台范式。因此本项目需要在 `shadcn/ui` 之上补一层“后台规范组件”。

## 5. 参考项目中应保留的交互习惯

从 `yishan-admin` 提炼出来、适合继续保留的模式如下：

### 5.1 统一后台壳层

- 固定侧边栏
- 顶部工具栏
- 面包屑
- 当前用户菜单
- 页面级标题和操作区

### 5.2 服务端驱动菜单

- 菜单树由服务端权限结果驱动
- 页面可见性与菜单授权一致
- 不在前端重复维护一份静态菜单真相源

### 5.3 列表页统一范式

- 顶部筛选栏
- 中部表格
- 右上角主操作按钮
- 行操作
- 批量操作
- 删除前确认
- 操作完成反馈

以当前用户管理页为准，具体落地形态应为：

- 页头仅保留标题，不追加解释性描述
- 筛选区使用 `draft + submit/reset`，避免输入即请求
- 表格工具栏左侧为资源名，右侧先放批量操作，再放主按钮
- 行操作常显 `编辑`、`启用/禁用`，危险动作进入 `更多`
- `禁用` 需要二次确认，`启用` 可以直接执行
- 新增 / 编辑统一进入 `ResponsiveFormLayer`

### 5.4 编辑操作统一使用弹层

- 简单表单使用弹窗
- 字段较多或存在树形选择时优先使用抽屉
- 移动端优先回退到抽屉样式

### 5.5 树形权限交互

- 展开 / 折叠
- 全选 / 全不选
- 父子联动
- 清晰的加载状态

这些交互是国内后台用户熟悉的，不应因为换组件库而丢失。

## 6. 不建议照搬的部分

以下内容不建议从参考项目原样迁移：

- 过重的 `ProTable` 一体化模式
- 过于依赖大型表单容器组件
- 偏展示型、装饰性较强的背景与视觉元素
- 默认字段密度过高、导致页面压迫感明显

应当保留的是交互逻辑，不是 Ant Design Pro 的技术实现方式。

## 7. 推荐的前端分层

建议采用以下结构：

```txt
src/
  routes/
    login.tsx
    admin/
      _layout.tsx
      index.tsx
      users.tsx
      roles.tsx
      departments.tsx
      menus.tsx
      dicts.tsx
      settings.tsx
      profile.tsx
  components/
    ui/
    admin/
    resource/
  features/
    auth/
    users/
    roles/
    departments/
    menus/
    dicts/
    system-settings/
```

职责划分：

- `components/ui`：`shadcn/ui` 原子组件与轻定制
- `components/admin`：后台壳层与后台通用组件
- `components/resource`：资源页模板组件
- `features/*`：领域 actions、schema、types 与页面所需适配逻辑
- `routes/admin/*`：页面装配层，不承载业务规则

## 8. 推荐引入的基础组件

优先引入以下 `shadcn/ui` 组件：

- `button`
- `input`
- `textarea`
- `select`
- `checkbox`
- `radio-group`
- `badge`
- `table`
- `tabs`
- `dialog`
- `drawer`
- `dropdown-menu`
- `popover`
- `tooltip`
- `sheet`
- `separator`
- `skeleton`
- `alert-dialog`

这些组件足以支撑后台第一阶段页面。

## 9. 必须补的一层：admin 规范组件

建议在 `shadcn/ui` 上方封装以下后台规范组件：

- `AdminShell`
- `AdminSidebar`
- `AdminHeader`
- `PageHeader`
- `FilterBar`
- `ResourceTable`
- `ResourcePagination`
- `StatusBadge`
- `ConfirmAction`
- `FormDialog`
- `ResponsiveFormLayer`
- `PermissionTreeField`
- `EmptyState`
- `LoadingState`

其中最关键的是：

- `AdminShell`
- `ResourceTable`
- `ResponsiveFormLayer`
- `PermissionTreeField`

这几项决定后台风格是否统一。

## 10. 页面类型规范

后台页面建议统一成三类，不再按页面各自发散设计。

### 10.1 列表资源页

适用：

- 用户管理
- 角色管理
- 字典类型
- 字典数据

统一结构：

- 页面标题区
- 筛选区
- 表格区
- 分页区
- 行操作区
- 批量操作区

### 10.2 树形资源页

适用：

- 部门管理
- 菜单管理

统一结构：

- 树表一体或左树右表单
- 新增同级 / 新增下级
- 删除前结构约束提示
- 右侧编辑面板或抽屉

### 10.3 配置页

适用：

- 系统设置

统一结构：

- 按业务分组
- 表单式编辑
- 批量保存
- 脏状态提示

配置页不建议用 CRUD 表格模拟。

## 11. 各模块页面建议

### 11.1 登录页

- 居中单卡片
- 主操作按钮明确
- 错误提示贴近字段
- 登录成功后跳后台首页

### 11.2 用户管理

- 筛选项:用户名、姓名、昵称、邮箱、手机号、状态;默认折叠,桌面 3 列,提交后才更新查询
- 主体:ResourcePage + ResourceTable,表格列保持中高信息密度;行操作使用文字按钮,危险操作用 Popconfirm
- Popconfirm:锚定真实触发元素,常显动作包 `<Button>`,下拉动作包 `<DropdownMenuItem>`;优先使用 `placement`,需要指向性时传 `arrow`
- 新增:桌面使用 `dialogSize="full"` 的两列弹窗,移动端走 Sheet;长文本备注跨两列
- 编辑:桌面使用 `dialogSize="full"` 的两列弹窗,移动端走 Sheet;字段顺序和新增对齐,不可直接编辑的账号 / 邮箱 / 密码用禁用输入展示
- 组织字段:归属部门用 TreeSelect,岗位用 SearchSelect,业务角色用 SearchMultiSelect;三者字段容器必须同 grid 宽度,trigger 与下拉弹层必须同宽
- 状态字段:编辑态使用 Select;新增态可用可见 radio,便于快速比较启用 / 禁用
- 批量操作:支持批量停用等状态操作;批量按钮使用 outline,新增按钮保持主按钮

### 11.3 角色管理

- 列表页展示角色基础信息
- 编辑层包含菜单权限树
- 行操作里的删除 Popconfirm 锚定删除按钮;`更多 → 禁用` 的 Popconfirm 锚定禁用菜单项,不要锚定 `更多` trigger
- 简单场景可用弹窗，复杂场景优先抽屉

### 11.4 部门管理

- 树表展示
- 行内支持新增下级
- 编辑放右侧表单面板

### 11.5 菜单管理

- 树表展示
- 明确显示 `type / path / permission / status`
- 图标可视化
- 支持状态切换

### 11.6 字典管理

- 建议主从布局
- 左侧字典类型
- 右侧当前类型的数据项列表

### 11.7 系统设置

- 采用分组配置表单
- 提供保存全部
- 配置说明靠近字段展示

### 11.8 个人中心

- 修改密码
- API Key 管理
- 登录日志

## 12. 数据与权限实现建议

本项目已经有完整的 `createServerFn` 动作层，后台前端应直接复用：

- `src/features/auth/auth.actions.ts`
- `src/features/users/users.actions.ts`
- `src/features/roles/roles.actions.ts`
- `src/features/departments/departments.actions.ts`
- `src/features/menus/menus.actions.ts`
- `src/features/dicts/dicts.actions.ts`
- `src/features/system-settings/system-settings.actions.ts`

建议原则：

- 读操作：`useQuery`
- 写操作：`useMutation`
- 成功后精准失效对应缓存
- 不再额外封一套 REST SDK

权限建议：

- 侧边导航：基于授权菜单树生成
- 路由访问：基于授权路径判断
- 真实安全边界：以后端 action / service 校验为准

## 13. 视觉与交互规范

目标风格：国内企业后台，而不是展示型站点。

建议：

- 中性色为主，品牌色适度强调
- 边框与分区清晰
- 信息密度中高，但不过度堆叠
- 表格行高、筛选区、卡片留白稳定一致
- 危险操作统一红色
- 状态反馈清晰
- 优先优化桌面端体验，移动端保证基本可用

应避免：

- 过强视觉装饰
- 大面积插画或背景图
- 过度松散的留白
- 为追求“现代感”而牺牲可扫读性

## 14. 建议补充的工具

虽然不是必须，但为了提升实现效率，建议补充：

- `TanStack Table`：表格能力
- `react-hook-form`：表单状态管理
- `sonner` 或等价 toast：统一反馈

其中：

- `TanStack Table` 优先级高
- `react-hook-form` 在表单页增多后收益明显

## 15. 实施顺序

建议按以下顺序落地：

1. 接入 `shadcn/ui` 基础设施
2. 建立 `AdminShell`
3. 建立 `PageHeader / FilterBar / ResourceTable / FormDialog`
4. 实现登录页
5. 实现用户管理页
6. 实现角色管理页
7. 实现部门与菜单管理页
8. 实现字典管理页
9. 实现系统设置页
10. 实现个人中心页

这个顺序能先把壳层、范式和最关键的后台资源页稳定下来。

## 16. 接入 shadcn/ui 的仓库约束

结合当前仓库，应按以下约束接入：

- 组件样式变量落到 `src/styles/globals.css`
- 路径别名沿用现有 `@/*` 与 `~/*`
- UI 组件放到 `src/components/ui`
- 后台规范组件放到 `src/components/admin` 与 `src/components/resource`
- 页面仍通过 `TanStack Router` 文件路由管理

## 17. 第一阶段非目标

本阶段不追求：

- 可视化拖拽后台搭建器
- 复杂仪表盘大屏
- 多主题高度自定义中心
- 插件运行时级别的后台扩展体系
- 一次性把所有业务后台页面补齐

第一阶段目标是建立一套稳定、统一、可扩展的后台壳层和资源页范式。
