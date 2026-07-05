# 05 · 站点配置

## 本任务目标

落地 `/admin/settings` 页面：KV 形式系统配置（`sys_option` 表），按业务分组展示（如「站点信息 / 登录策略 / 上传限制」），支持单个修改与批量保存。

## 现状盘点

**后端 ✅ 完整**
- `src/features/system-settings/system-settings.schema.ts`（含 `setSystemOptionSchema` / `batchSetSystemOptionSchema`）
- `src/features/system-settings/system-settings.service.ts`（K-V 读写 + 批量更新）
- `src/features/system-settings/system-settings.types.ts`（5 个服务签名）
- `src/features/system-settings/system-settings.actions.ts`（4 个 server-fn：get / batchGet / set / batchSet）
- `src/features/system-settings/system-settings.policy.ts`（489B，已有逻辑）
- `src/features/system-settings/system-settings.policy.test.ts`（7 tests）
- `src/features/system-settings/system-settings.schema.test.ts`（12 tests）

**前端 ⚠️ placeholder**
- `src/routes/admin/settings.tsx` 919B — 注意：`src/components/admin/layout/admin-nav-config.ts` 里 `/admin/settings` 的菜单名是「系统设置」，seed 也叫 `settings`，但老系统截图叫「**站点配置**」。此处**保留**老页面 / 路由，仅改文案。

**DB seed**：`sys_option` 表已建，但 seed 没插数据，需 subagent 在 `db/seed.ts` 末尾加一个 `ensureSystemOptions(seedOptions)` 段（同 ensureMenuItem 模式），示例：

```ts
const SYSTEM_OPTIONS_SEED = [
  { key: "site.name", value: JSON.stringify("移山后台"), description: "站点名称" },
  { key: "site.logo", value: JSON.stringify(""), description: "站点 Logo URL" },
  { key: "auth.login.maxRetries", value: JSON.stringify(5), description: "登录失败最大次数" },
  { key: "upload.maxSizeMb", value: JSON.stringify(20), description: "上传文件最大尺寸（MB）" },
  // ... 后续按需扩
];
```

## 下一步顺序

### 步骤 1 · 路由文件重写

`src/routes/admin/settings.tsx` 占位删除。

**布局**：
- title="站点配置" description="按业务分组的系统配置 KV 表"
- 不走 6 字段 filterBar（KV 没有「搜」，改成「按组分类」）
- 主体：分组折叠面板（如 shadcn Accordion 或自写 Card 折叠），每组一组配置项

**结构范式**：

```tsx
<div className="space-y-4">
  {groups.map(group => (
    <Card key={group.code}>
      <CardHeader>
        <h3>{group.name}</h3>
        <p>{group.description}</p>
      </CardHeader>
      <CardContent>
        {group.options.map(opt => (
          <RowEditField
            key={opt.key}
            option={opt}
            type={dictByKey(opt.inputType)} // 例如从 dict 拉 input type
            onChange={(value) => setFormData(d => ({...d, [opt.key]: value}))}
          />
        ))}
        <Button onClick={() => saveGroup(group.code)}>保存本组</Button>
      </CardContent>
    </Card>
  ))}
</div>
```

### 步骤 2 · 分组定义 + Seed

`src/features/system-settings/system-settings.groups.ts`（新建）：

```ts
export type SystemOptionGroup = {
  code: string;
  name: string;
  description: string;
  options: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "switch" | "select" | "textarea";
    description?: string;
    dictCode?: string; // 走 dicts.useDictDataByCode
  }>;
};

export const SYSTEM_OPTION_GROUPS: SystemOptionGroup[] = [
  {
    code: "site",
    name: "站点信息",
    description: "站点基础信息",
    options: [
      { key: "site.name", label: "站点名称", type: "text", description: "显示在浏览器标题与登录页" },
      { key: "site.logo", label: "Logo", type: "text", description: "PNG/SVG URL" },
    ],
  },
  // ... 后续扩
];
```

`db/seed.ts` 末尾加 ensureSystemOptions 函数 + 默认 seed（同 ensureMenuItem 套路）。

### 步骤 3 · use-queries 暴露 useSystemOptionGroup

`src/features/system-settings/system-settings.queries.ts`（新建）：

```ts
export const systemSettingsQueryKey = { all: ["system-settings"], group: (code: string) => ["system-settings", code] };

export const useSystemOptionGroup = (groupCode: string) =>
  useQuery({
    queryKey: systemSettingsQueryKey.group(groupCode),
    queryFn: async () => {
      // 一次性拿这组所有 key，再 batchGet
      const group = SYSTEM_OPTION_GROUPS.find(g => g.code === groupCode);
      const keys = group.options.map(o => o.key);
      return batchGetSystemOptions({ data: { keys } });
    },
    staleTime: 30_000,
  });

export const useSaveSystemOptionGroup = () => useMutation({
  mutationFn: ({ groupCode, items }) => batchSetSystemOptions({ data: { items } }),
  onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: systemSettingsQueryKey.group(vars.groupCode) }),
});
```

### 步骤 4 · 字段类型组件

`src/components/admin/settings/option-row.tsx`（新建）：

```tsx
type Props = { option: OptionDef; value: unknown; onChange: (next: unknown) => void; };
export function OptionRow({ option, value, onChange }: Props) {
  switch (option.type) {
    case "switch":   return <Switch checked={Boolean(value)} onCheckedChange={onChange} />;
    case "select":   return <DictSelect dictCode={option.dictCode!} value={value} onChange={onChange} />;
    case "number":   return <Input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} />;
    case "textarea": return <Textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "text":
    default:         return <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  }
}
```

**Select 联动**：若 `option.dictCode` 非空，复用 04-dicts 的 `useDictDataByCode(option.dictCode)` 拉枚举。

### 步骤 5 · 单测

- settings.queries.test.ts：queryKey 推导、staleTime 不为 0
- 重点：mutate 后的 onSuccess 是否 invalidate 正确 key

### 步骤 6 · 验证

```bash
npm run db:reset               # 跑新 seed（站点设置条目进表）
npm run typecheck && lint && arch:check && test
npm run dev
```

特别验：
- 进 `/admin/settings`，每个分组的表单字段都有合理 default（来自 DB）
- 改一个值，点「保存本组」→ 应只 invalidate 这一组，其他 group 不重查
- 切换字典 type 的选项（dictData 在 dicts 那边改后这里下拉自动刷新）

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（任务执行期间未做新提交，工作树改动保留在主分支上）

#### 实施摘要

新增文件：
- `src/features/system-settings/system-settings.groups.ts`：分组 + 字段定义（site / auth / upload / ui 四组）+ `serialize/deserializeOptionValue` 助手
- `src/features/system-settings/system-settings.queries.ts`：`systemSettingsQueryKey` + `useSystemOptionGroup`
- `src/features/system-settings/system-settings.use-mutations.ts`：`useSaveSystemOptionGroup`，mutate 后只 invalidate 本组
- `src/components/admin/settings/option-row.tsx`：按 type 渲染 text / number / switch / select / textarea
- `src/features/system-settings/system-settings.groups.test.ts`：14 tests（分组定义、序列化/反序列化）
- `src/features/system-settings/system-settings.queries.test.ts`：7 tests（queryKey 派生、staleTime、enabled 行为）
- `src/features/system-settings/system-settings.use-mutations.test.ts`：3 tests（queryKey 隔离、不影响其他分组）

修改文件：
- `src/routes/admin/settings.tsx`：placeholder → 真实页面（Collapsible 卡片 + 每组一保存 + 字段水合）
- `src/features/system-settings/system-settings.schema.ts`：新增 `systemOptionGroupCodeSchema`
- `src/features/system-settings/system-settings.schema.test.ts`：新增 groupCode 用例（21 tests）

未触碰：`db/seed.ts`（按约束不新增 ensureSystemOptions）、`db/migrations/`、`src/features/system-settings/system-settings.{service,policy,types,actions}.ts`、`db/schema/index.ts`。

验证：
- `npm run typecheck` 通过
- `npm run lint` 0 error
- `npm run arch:check` 四项全 OK
- `npm test -- src/features/system-settings/` 52 tests pass
- 全量 `npm test` 226 tests pass，无回归

Gotcha：
- shadcn 当前没有 Switch 组件，switch 类型用 Checkbox 顶替（label 在右，a11y 完整）；如果后续补 Switch，可平滑替换
- `serializeOptionValue` 对 `boolean` 显式走 `"true"/"false"`，避免被 JSON.stringify 后变成字符串 `"true"`/`"false"`；`number` 走 JSON 是为了浮点精度可控
- `useSaveSystemOptionGroup` 的 `onSuccess` 只 invalidate `systemSettingsQueryKey.group(variables.groupCode)`，与 query 的命名层级一致，确保跨组不互相影响
- settings 页面 draft 状态采取「首次水合后不再被远端覆盖」策略，避免用户编辑时因 invalidate 重查被冲掉
- 该任务由 subagent 在已有未提交改动基础上继续推进，**未做 git commit**（per 强约束）

### 后续可拓展

- 加 `useGetSystemOption(key)` 单点消费，方便 navbar 显示站点名
- 把 navbar / login page 改读 `systemOptionByKey('site.name')`，当下发配置改了不用重启
