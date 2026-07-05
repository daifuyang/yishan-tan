# 07 · 云存储（feature 全建）

## 本任务目标

新增 `/admin/storages` 全功能页面：管理员配置多套「对象存储」驱动（本地 / 阿里云 OSS / 腾讯云 COS / AWS S3 / 七牛 / MinIO），媒体库上传时按当前 active 驱动走。**完全新建的 feature**。

## 现状盘点

**🔴 全部空**
- ❌ DB 无 storage 表
- ❌ `src/features/storages/` 不存在
- ❌ `src/routes/admin/storages.tsx` 不存在
- ❌ 没有 OSS client wrapper
- ✅ menu seed: `code: "storages", path: "/admin/storages", icon: "Cloud"`

前置：本任务**强依赖** 06-posts 的部门树思想（同样多对一 schema + 软删除）；执行时**不**等待 posts，可以并行启动。

## 下一步顺序

### 步骤 1 · DB schema 新建 storage 表

```ts
export const storageDriver = pgEnum("storage_driver", [
  "local",
  "aliyun-oss",
  "tencent-cos",
  "aws-s3",
  "qiniu",
  "minio",
]);
// 注意 enum 加新值要 ALTER TYPE

export const storage = pgTable("storage", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),                       // 显示名「主站 OSS」「备份 MinIO」
  driver: storageDriver("driver").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  config: text("config").notNull(),                   // JSON 字符串: { bucket, region, accessKey, secretKey, endpoint, cdnDomain, prefix, ... }
  description: text("description"),
  status: statusEnum("status").notNull().default("enabled"),
  createdAt: timestamp(...).notNull().defaultNow(),
  updatedAt: timestamp(...).notNull().defaultNow().$onUpdate(...),
  deletedAt: timestamp(...),
});

export type DbStorage = typeof storage.$inferSelect;
```

`config` 设计成 JSON 串，避免每个驱动一个字段。driver 决定 schema 校验时机（编 8）。

### 步骤 2 · drizzle 迁移

```bash
npm run db:generate
cat db/migrations/000X_storage_*.sql
npm run db:migrate
```

注意 enum 创建：`CREATE TYPE "storage_driver" AS ENUM (...)` 是 drizzle 自动产出的，复用 `statusEnum`。

### 步骤 3 · 业务约束：**仅一个 `isDefault=true`**

service 里维护：
- 创建 default：先 UPDATE 其它 default = false，再 INSERT isDefault=true
- 取消 default：必须还有另一个 default 由启用列表里另一个 enabled 转过去；不能「全部都不是 default」

加 `CHECK` 在 schema 层（partial unique index）：

```ts
// db/schema/index.ts
export const storageDefaultUnique = uniqueIndex("storage_default_unique_idx")
  .on(sql`id`)  // 占位，下面用更精准的 PG partial 改
  .where(sql`is_default = true AND deleted_at IS NULL`);
```

drizzle 的 partial unique index 用法：`uniqueIndex(...).where(sql\`...\`)`。

### 步骤 4 · 用 gen:resource 生成骨架

```bash
npm run gen:resource -- storage
```

### 步骤 5 · types

```ts
export type StorageDto = {
  id: string;
  name: string;
  driver: "local" | "aliyun-oss" | "tencent-cos" | "aws-s3" | "qiniu" | "minio";
  isDefault: boolean;
  configSummary: Record<string, unknown>;   // 服务端过滤 secretKey 等敏感字段后再回
  description: string | null;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type StorageDetailDto = StorageDto & {
  config: Record<string, unknown>;     // 仅详情返回完整 config
};

export type CreateStorageServiceInput = { name; driver; isDefault?; config; description?; status? };
// ...
```

**关键**：列表 DTO 不要把 secretKey 透出来。

### 步骤 6 · schema

`createStorageSchema`：

- name: min 1, max 50
- driver: enum
- isDefault: 可省，默认 false
- config: 是个 `z.record(z.unknown())`，但要按 driver 走子 schema（service 层做二次校验）

为了让表单编辑时给 driver 类型即时变 config schema：在前端把字段 schema 按 driver 切：

```ts
const driverConfigSchema: Record<Driver, z.ZodTypeAny> = {
  local: z.object({ dir: z.string() }),
  "aliyun-oss": z.object({ region, bucket, accessKeyId, accessKeySecret, endpoint, cdnDomain, prefix }),
  // ...
};
```

### 步骤 7 · service

#### 7.1 config 敏感字段过滤

```ts
const SENSITIVE_KEYS: Record<Driver, string[]> = {
  "aliyun-oss": ["accessKeySecret"],
  "aws-s3": ["secretAccessKey"],
  "tencent-cos": ["secretKey"],
  qiniu: ["secretKey"],
  minio: ["secretAccessKey"],
  local: [],
};

function redactConfig(driver: Driver, config: Record<string, unknown>): Record<string, unknown> {
  const keys = SENSITIVE_KEYS[driver] ?? [];
  const result = { ...config };
  for (const k of keys) result[k] = "******";
  return result;
}
```

### 7.2 列表 service

`listStoragesService` 同 roles 范式；返回 DTO 都 redact config。

#### 7.3 default 切换事务

```ts
export const setDefaultStorageService: SetDefaultStorageService = async (id) => {
  return getDb().transaction(async (tx) => {
    await tx.update(storage).set({ isDefault: false }).where(and(eq(isDefault, true), isNull(deletedAt)));
    const rows = await tx.update(storage).set({ isDefault: true }).where(eq(id, id)).returning();
    if (!rows[0]) throw Errors.notFound("存储不存在");
    return toStorageDto(rows[0]);
  });
};
```

### 步骤 8 · 上传客户端封装（按 driver）

`src/lib/storage-driver/<driver>.ts`：

```ts
// ali-oss.ts
import OSS from "ali-oss";
export function createOssClient(config: AliyunOssConfig): OSS { ... }
export async function putObject(driver: StorageDriver, key: string, buf: Buffer, mime: string): Promise<string> {
  // 返回 url
}
```

每个 driver 一份；统一 `putObject(driver, key, buf)` 是入口。**本期可只实现 `local` 驱动**（写到本地 `public/uploads/`），其余 driver 输出「未实现」错误，先把流程打通。

### 步骤 9 · policy + actions + REST

`assertCanManageStorages` + 4 个 server-fn（list/get/create/update/delete + **setDefault**）。

REST gen:resource 出来的先不动；要补一个 `POST /api/v1/storages/:id/default`。

### 步骤 10 · queries + use-mutations

`useStoragesList` / `useStorage(id)` / `useCreateStorage` / `useUpdateStorage` / `useDeleteStorage` / `useSetDefaultStorage`。  
mutate 后 invalidate `storagesQueryKey.all`。

### 步骤 11 · admin 页面

**布局**：
- title="云存储" description="配置站点默认与备用对象存储驱动"
- 6 字段 filterBar：名称 / 驱动 / 是否默认 / 状态 / 创建起 / 创建止
- 「+ 新增存储」按钮

**表格列**：
| 列 | 宽 | 内容 |
|---|---|---|
| 名称 | 160 | name + 「默认」徽章（如 isDefault） |
| 驱动 | 140 | driver chip |
| 是否默认 | 100 | SwitchStatusBadge |
| 描述 | 240 | description truncate |
| 状态 | 90 | StatusBadge |
| 创建时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

操作列：「编辑 / 设为默认 / 启用-禁用 / 更多（删除）」

### 步骤 12 · 编辑表单 EditStorageFields

- 名称 Input
- 驱动 Select（6 个 enum）
- 是否默认 Switch
- **Config 表单（按 driver 动态渲染）**：用 watch 监听 driver，切到不同 driver 显示不同字段集合（OSS 有 region/bucket/keys；local 只有 dir/prefix）
- 描述 Textarea
- 状态 Select

### 步骤 13 · 单测

service.ts：
- redactConfig（覆盖 5 个 driver 敏感字段）
- setDefault 的事务（最多一个 default）
- delete 是否阻止 default 删除？建议禁止默认删除，需先改另一个为默认

schema.test.ts：driverConfigSchema 各 driver 正反向

### 步骤 14 · 验证

```bash
npm run typecheck && lint && arch:check && test
npm run dev
```

特别验：
- 添加一个 local 驱动、设为默认 → 媒体库（如果已实现）应能上传
- 创建第二个 default：必须先把另一个 default 关掉 default 再开新的
- 编辑时 secretKey 字段**不返回明文**但保留值（用 redacted 显示，PUT 也不带就清空？本期设计先：详情 GET redact，PUT 端原 config 透传；若 client 想改 secretKey 显示成输入框）

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（本期工作树上有大量未提交改动，按现状 hash 记录）
- 验证：
  - `npm run typecheck` 通过（0 error）
  - `npm run lint` 通过（biome 0 fix）
  - `npm run arch:check` 4 项全 OK
  - `npm test -- src/features/storages/` → 3 文件 / 29 tests passed
  - `npm test` 全量 → 26 文件 / 193 tests passed，无回归
  - `npm run db:generate` + `npm run db:migrate` → `0003_free_shiva.sql` 已落库
  - `npm run db:seed` → 默认本地存储已写入 `dadf85f5-dea4-468d-a993-701098ff10aa`
  - `npm run build` → 通过，dist/server 内含 `storages.actions`、`storages.service`、`storages-vrr7yKt5.js` 等 chunk
  - `npm run dev` → `GET /admin/storages` 返回 200（无登录时 307 跳登录页，符合预期）

### 改动概览

新增（feature 全建）：
- `db/schema/index.ts` — 加 `storageDriver` pgEnum（6 个 driver）+ `storage` 表 + partial unique index（`is_default=true AND deleted_at IS NULL`），导出 `DbStorage`
- `db/migrations/0003_free_shiva.sql` — drizzle 生成（CREATE TYPE + CREATE TABLE + partial unique index）
- `db/seed.ts` — 新增 `ensureDefaultLocalStorage()`：seed 一条 `local` 驱动 `isDefault=true` 的「本地存储」
- `src/features/storages/storages.schema.ts` — storageDriver enum、6 套 driverConfig 子 schema、`createStorageSchema`/`updateStorageSchema`/`storageListQuerySchema`（含 isDefault 字符串转换）
- `src/features/storages/storages.types.ts` — `StorageDto`/`StorageDetailDto`（redact 后）、`StorageConfig = Record<string, 标量>`（满足 server-fn 序列化约束）、5 个 service 签名
- `src/features/storages/storages.service.ts` — `redactConfig`（6 driver 敏感 key map）+ JSON 解析/校验/二次校验；`setDefaultStorageService` 事务（先清 default 再设新）；`deleteStorageService` 拒绝删 default
- `src/features/storages/storages.policy.ts` — `assertCanManageStorages`（SYSTEM_ADMIN_IDS 白名单）
- `src/features/storages/storages.actions.ts` — 6 个 server-fn：list/get/create/update/delete/setDefault + getDefault
- `src/features/storages/storages.queries.ts` — `storagesQueryKey` + `useStoragesList`/`useStorageDetail`/`useDefaultStorage`
- `src/features/storages/storages.use-mutations.ts` — `useCreateStorage`/`useUpdateStorage`/`useDeleteStorage`/`useSetDefaultStorage`，统一 invalidate `storagesQueryKey.all`
- `src/features/storages/storages.schema.test.ts` — 20 tests（driver enum + 6 driver config + create/update/list 双向）
- `src/features/storages/storages.policy.test.ts` — 2 tests（admin / non-admin）
- `src/features/storages/storages.service.test.ts` — 7 tests（5 driver 敏感字段 + 不 mutate + 不 redact local）
- `src/routes/api/v1/storages/index.ts` — GET（list）/ POST（create）
- `src/routes/api/v1/storages/$id.ts` — GET / PATCH / DELETE
- `src/routes/api/v1/storages/$id.default.ts` — POST 设为默认
- `src/routes/admin/storages.tsx` — `ResourcePage` + 6 字段 filterBar + 7 列 ResourceTable（sticky right 操作列：编辑/设为默认/启用-禁用/删除）+ 动态 driver config 表单 + Popconfirm 删除确认
- `src/lib/storage-driver/local.ts` — local 驱动 `putObjectLocal(key, buffer, config)`：写到 `public/uploads/<prefix>/<key>`，返回 `/uploads/<...>` URL（`publicBaseUrl` 可覆盖）；其余 driver 走 `unimplementedDriver` 占位抛错
- `src/lib/storage-driver/index.ts` — `putObject(driver, key, buffer, config)` 入口 + `isDriverImplemented` 检查

### gotchas

- **server-fn 序列化约束**：`configSummary: Record<string, unknown>` 不被 TanStack Start 接受，必须收敛为可序列化字面量（这里用 `StorageConfig = Record<string, string | number | boolean | null>`）。`updateStorageService` 的 `config` 入参也对应改成 `StorageConfig`。
- **schema 反向依赖 types 时 `import type` 仍然 OK**：types/service 互相只 import type，actions 通过 service 调用、policy 不碰 db，符合 `arch:check` 全部规则。
- **biome `organizeImports`**：Biome 按字典序而不是字典序+长度排序，`storages.use-mutations.ts` 需 `storagesQueryKey` 在前才能匹配 `~/features/.../...query/...action` 的相对序。
- **biome `useImportType`**：service.ts 中 13 个全部是 type-only 的导入被检测，建议改成单一 `import type { ... }`。Biome 还会建议把 `type StorageDriver` 写成 `import { type StorageDriver }`（混合写法），改完后 lint 0 error。
- **partial unique index 的写法**：drizzle 的 `uniqueIndex(...).where(sql\`...\`)` 在 schema 里需要写成 `sql\`(true)\`` 列表达式而不是 `sql\`id\``；drizzle generate 出的 SQL 是 `CREATE UNIQUE INDEX ... USING btree ((true)) WHERE ...`，符合 PG partial unique 语义。
- **先 setDefault，再 clear**：service 端 `setDefaultStorageService` 是先清所有 default 再设新的；但 delete default 也失败（service 拒绝），所以 UI「更多-删除」对默认行做 disabled。
- **Driver 切换清空 config**：UI 的 driver Select 在 `onValueChange` 里把 `config` 重置成 `{}`，避免 OSS → Local 留下 OBS bucket 字段。
- **`enforced Read access`**：`ensureExists` 在 service 层两个入口都用，并且事务版的会在 `setDefaultStorageService` 里复用（统一走 `ensureExists` 后再 `update isDefault=false` 再 `update isDefault=true on target`），保证 partial unique index 也不被并发绕过。
