# 04 · 字典管理

## 本任务目标

落地 `/admin/dicts` 页面（双层）：第一层是「字典类型」列表（dict_type），点击进入第二层是「字典数据」列表（dict_data）。两个层都用 6 字段 filterBar + 表格 + 编辑弹窗的范式。

## 现状盘点

**后端 ✅ 完整**
- `src/features/dicts/dicts.schema.ts`：listDictTypesSchema / createDictTypeSchema / updateDictTypeSchema / listDictDataSchema / createDictDataSchema / updateDictDataSchema
- `src/features/dicts/dicts.service.ts`：双层 CRUD，含 status enum 控制
- `src/features/dicts/dicts.types.ts`：`DictTypeDto` + `DictDataDto` + 6 个服务签名
- `src/features/dicts/dicts.actions.ts`：6 个 server-fn + 双层 list
- `src/features/dicts/dicts.schema.test.ts`（8 tests）
- `src/features/dicts/dicts.policy.ts`（157B stub）

**前端 ⚠️ placeholder**
- `src/routes/admin/dicts.tsx` 910B

**DB**：dict_type + dict_data 两表，typeCode 在 dict_data 关联（不是 FK！）。status enum 是 `statusEnum` 与其它表共用。

**特别约束**：字典是「枚举源」，下游 settings / 角色管理 可能要拉取这里的数据作为 Select 选项源。需要把 `useDictType` / `useDictDataByCode` 暴露成 hooks。

## 下一步顺序

### 步骤 1 · policy stub 扩

```ts
export function assertCanManageDicts(ctx: ServiceContext): void {
  if (!isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅系统管理员可管理字典");
  }
}
```

### 步骤 2 · actions 钩入 policy

6 个 server-fn 都加 `await assertCanManageDicts(ctx)`。

### 步骤 3 · 暴露跨 feature query

新建 `src/features/dicts/dicts.queries.ts`：

```ts
export const dictsQueryKey = {
  all: ["dicts"] as const,
  types: () => [...dictsQueryKey.all, "types"] as const,
  typeList: (input: DictTypeListQuery) => [...dictsQueryKey.types(), input] as const,
  datas: () => [...dictsQueryKey.all, "datas"] as const,
  dataList: (input: DictDataListQuery) => [...dictsQueryKey.datas(), input] as const,
};

export const dictTypesListQueryOptions = (input) => queryOptions({...});
export const useDictTypesList = (input) => useQuery(...);

export const useDictDataByCode = (code: string) =>
  useQuery({
    queryKey: [...dictsQueryKey.datas(), { code }],
    queryFn: () => listDictData({ data: { typeCode: code, page: 1, pageSize: 100, status: "enabled" } }),
    enabled: Boolean(code),
    staleTime: 5 * 60_000, // 字典数据不常变，缓存久一点
  });
```

`useDictDataByCode` 后续给 settings / role 表单的 Select 选项源用。

### 步骤 4 · use-mutations

`src/features/dicts/dicts.use-mutations.ts`（6 hooks：dictType × 3 + dictData × 3）。

invalidate key 切分：
- 创建/更新/删除 `dict_type` → `dictTypes → all`
- 创建/更新/删除 `dict_data` → `dictsQueryKey.datas()` 全清（连带 `useDictDataByCode` 的缓存）

### 步骤 5 · admin 页面（双层）

**第一层：/admin/dicts**
- title="字典管理" description="维护字典类型与字典数据"
- 表格 = 字典类型
- 6 字段 filterBar（与 users 完全一致风格）：
  - 名称 / 编码 / 描述 / 状态 / 创建起 / 创建止
- 表格列：

| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 160 | name truncate |
| 编码 | 160 | code monospace 灰 |
| 描述 | 240 | description truncate |
| 字典数据 | 100 | N 项（dict_data 聚合） |
| 状态 | 90 | StatusBadge |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

操作列：「编辑 / 启用-禁用 / 更多（删除 / **管理字典数据**）」

点「管理字典数据」→ `navigate({ to: "/admin/dicts/$typeCode", params: { typeCode } })`

**第二层：/admin/dicts/$typeCode.tsx**
- title="{typeName}" description="字典数据 - {code}"
- 表格 = 字典数据
- 6 字段 filterBar：
  - 标签 / 值 / 描述（extra）/ 状态 / 创建起 / 创建止
- 表格列：

| 列 | 宽 | 内容 |
|---|---|---|
| 标签 | 160 | label |
| 值 | 160 | value monospace |
| 排序 | 70 | 数值居中 |
| 描述 | 240 | extra truncate |
| 状态 | 90 | StatusBadge |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

### 步骤 6 · 编辑表单

**EditDictTypeFields**：名称 / 编码 / 描述 / 状态
**EditDictDataFields**：类型编码（只读、auto-fill）/ 标签 / 值 / 排序 / 描述（extra JSON）/ 状态

### 步骤 7 · 单测

- dicts.policy.test.ts：assertCanManageDicts 两个分支

### 步骤 8 · 验证

```bash
npm run typecheck && lint && arch:check && test -- src/features/dicts/
```

特别验：
- seed 没有字典数据，手动建一个 `user_status = enabled/disabled`，再进 `/admin/dicts`，应能新增 dict_type / dict_data
- 在第二层删除一个 dict_data，再回到第一层，**字典数据列的计数应 -1**（invalidation 生效）
- 检查 useDictDataByCode 在 settings / role 表单里的可用性（如本任务附带回退 tests）

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（改动未提交；dicts 子任务全部完成，后续 subagent 共用基线 hash）
