# 后台资源列表规范

自 2026-10-09 起，所有新增与修改的后台资源列表必须遵循本规范。架构以 OWN.md 为准，视觉细节遵循 DESIGN_CHARTER；本规范约束列表结构和查询行为。

## 页面结构

固定顺序：页面标题 → 搜索卡片 → 表格卡片。

表格卡片内部顺序：列表标题与工具栏 → 表格 → 分页。使用 `ResourcePage` 组合这些区域，不在路由内重复实现搜索与表格容器。

| 职责 | 组件 / 参数 |
| --- | --- |
| 页面标题、搜索卡片、表格卡片 | ResourcePage |
| 搜索字段、标签与控件对齐 | QueryFormItem |
| 查询、重置、展开收起 | ResourcePage 内部的 FilterBar |
| 数据列、加载、错误、空结果、选中、冻结列、分页 | ResourceTable，通过 tableProps 配置 |
| 新增、批量操作、导出 | toolbarActions |
| 编辑、只读详情、危险操作 | ResponsiveFormLayer / DetailSheet / Popconfirm |

搜索区与表格区是两张独立卡片。不得只保留表格、把搜索塞进列表工具栏，或用卡片网格代替标准资源列表。只读列表也必须有真实可用的搜索条件。

## 搜索行为

- 默认 `filterColumns={3}`、可折叠且默认折叠。由 FilterBar 管理展开状态，折叠时首行最后一格为按钮区。不是每个页面都必须凑满固定数量字段；按资源的真实查询能力配置。
- 字段使用 QueryFormItem，label 关联真实控件 ID；Input / Select 统一使用已有控件 token，控件宽度随字段容器收缩。时间范围用 DateRangePicker。
- 输入值保存为 draft；filters 只在查询和重置时更新。请求参数和 query key 从 filters、page、pageSize 构造。
- 点击“查询”或在搜索表单内按 Enter：提交 draft，并立即将 page 置为 1。若条件未变，可复用查询缓存；刷新已有数据使用刷新操作。
- 点击“重置”：将 draft 和 filters 同时恢复 DEFAULT_FILTERS，page 置为 1，清除与旧结果绑定的选中状态。
- 修改 draft、清空某个输入或展开/收起搜索区，不应触发列表查询、重置当前分页或丢失未提交输入。不要监听 draft 的 effect 去改变 page。
- 翻页和修改 pageSize 只使用已提交 filters；修改 pageSize 回到第一页。查询结果改变后不能保留会误操作的旧选中项。
- 搜索、分页、total 必须使用同一数据范围。服务端分页的数据不能仅在当前页做过滤却继续展示原总数。全量客户端树表格可对完整树过滤，保留必要祖先以表达层级。

## 表格与操作

- rowKey 使用稳定业务 ID，不用数组下标。
- 文本、时间左对齐，数值右对齐，状态居中，操作右对齐并 sticky-right。列宽和时间格式见设计宪章 §7.8。
- 列表不展示资源 ID 列；通过详情或行菜单复制 ID。空字段统一 `--`。
- 工具栏左侧是列表标题，右侧依次是批量操作、导入导出等辅助操作、刷新、主操作。批量操作有选中项才显示，同区域最多一个主按钮。
- 行操作参考用户管理：编辑、启用/禁用、更多。删除放更多中的危险分组；危险状态切换与删除必须确认，确认框锚定实际触发元素。
- 复用 ResourceTable 的 loading、error、empty 和分页参数，不自行绘制第二套分页器。已有服务端分页继续保留；树形列表可完整展示树表格，不能伪造分页总数。
- 写操作成功后通过 feature 的 mutation 更新或失效相关查询；错误保持可见，不能吞掉异常后关闭弹层宣称成功。

## 最小接入方式

以下为组件接入示意，columns、items、total、查询 hook 与控件由对应 feature 提供：

```tsx
const [draft, setDraft] = React.useState(DEFAULT_FILTERS);
const [filters, setFilters] = React.useState(DEFAULT_FILTERS);
const [page, setPage] = React.useState(1);
const [pageSize, setPageSize] = React.useState(10);

// 查询 hook 只消费已提交的 filters、page、pageSize。
const handleQuery = () => {
  setFilters({ ...draft });
  setPage(1);
};
const handleReset = () => {
  setDraft(DEFAULT_FILTERS);
  setFilters(DEFAULT_FILTERS);
  setPage(1);
};

<ResourcePage
  title="资源管理"
  filterColumns={3}
  filterCollapsible
  filterDefaultCollapsed
  filter={
    <QueryFormItem label="名称" htmlFor="filter-name">
      <Input
        id="filter-name"
        value={draft.keyword}
        onChange={(event) => setDraft((prev) => ({ ...prev, keyword: event.target.value }))}
      />
    </QueryFormItem>
  }
  filterValues={draft}
  onFilterSubmit={handleQuery}
  onFilterReset={handleReset}
  filterLoading={list.isFetching}
  toolbarTitle="资源列表"
  toolbarActions={actions}
  tableProps={{
    columns,
    data: items,
    rowKey: (row) => row.id,
    loading: list.isFetching,
    error: list.isError ? "无法加载列表" : undefined,
    emptyTitle: "没有匹配的资源",
    page,
    pageSize,
    total,
    onPageChange: setPage,
    onPageSizeChange: (next) => {
      setPageSize(next);
      setPage(1);
    },
  }}
/>
```

## 当前页面与参考范围

本轮源码检查：11 个资源列表均已使用 ResourcePage，提供 filter、filterValues、提交/重置回调及 tableProps。

| 页面 | 类型 / 参考点 |
| --- | --- |
| users、roles | 标准管理列表；搜索、表格工具栏、行操作 |
| departments、menus | 层级资源，搜索 + 树表格 |
| dicts、dicts/$typeCode | 字典类型及字典数据列表 |
| posts、storages、attachments、portals | 岗位、存储、附件、门户资源列表 |
| login-logs | 只读列表及详情 |
| index（/admin） | 工作台概览，不是列表 |
| settings | 配置表单，不是列表 |
| route | 后台布局与鉴权入口，不是资源页 |

结构符合不代表交互全部达标。当前 login-logs 页面仍通过 draft 的 effect 重置 page，并只在当前页过滤 IP / User Agent；这些是待修正行为，不是可照抄的标准。其它参考页的局部细节同样以本规范为准。

## 检查与验收

`npm run arch:check:lists` 检查默认资源路由是否使用公共 ResourcePage，是否提供搜索内容、受控条件、提交/重置、列表标题与 tableProps。该检查已接入 arch:check，CI 会执行。

静态检查不能证明回调有实际效果，也不能验证接口字段、分页范围、权限和移动端行为。与改动有关的交互还需浏览器验收：

- 输入条件后结果和页码保持不变；查询后结果应用条件且回第一页。
- Enter 与查询按钮一致；重置恢复字段和查询条件。
- 翻页保持已提交条件，修改 pageSize 回第一页。
- 空结果、加载和错误有明确展示；危险操作确认、编辑保存与查询刷新按规范执行。
- 搜索折叠不丢字段，表格在窄屏可横向滚动，新增/详情弹层可操作。

新增非列表页面应在 `scripts/arch/check-list-pages.mjs` 中注明类型与理由，并同步本规范的范围说明；不能为缺少搜索的资源列表添加豁免。
