# 08 · 媒体库（feature 全建）

## 本任务目标

新增 `/admin/attachments` 全功能页面：上传、列出、按目录 / 类型筛选、删除附件。上传走「当前默认 storage 驱动」（依赖 07-storages）。

## 现状盘点

**🔴 全部空**
- ❌ DB 无 attachment 表
- ❌ `src/features/attachments/` 不存在
- ❌ `src/routes/admin/attachments.tsx` 不存在
- ❌ `/api/uploads` API 不存在
- ✅ menu seed: `code: "attachments", path: "/admin/attachments", icon: "Image"`

**强依赖**：07-storages 必须完成（默认 storage = 当前上传驱动）。

## 下一步顺序

### 步骤 1 · DB schema

```ts
export const attachmentCategory = pgEnum("attachment_category", ["image", "video", "document", "audio", "other"]);

export const attachment = pgTable("attachment", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploaderId: uuid("uploader_id").references(() => user.id, { onDelete: "set null" }),
  storageId: uuid("storage_id").references(() => storage.id, { onDelete: "set null" }),
  storageKey: text("storage_key").notNull(),            // path/key within driver
  url: text("url").notNull(),                            // 公开访问 URL
  name: text("name").notNull(),                          // 原始文件名
  mime: text("mime").notNull(),
  size: integer("size").notNull(),                       // bytes
  width: integer("width"),                                // image/video 才填
  height: integer("height"),
  category: attachmentCategory("category").notNull().default("other"),
  createdAt: timestamp(...).notNull().defaultNow(),
  updatedAt: timestamp(...).notNull().defaultNow().$onUpdate(...),
});

export type DbAttachment = typeof attachment.$inferSelect;
```

### 步骤 2 · drizzle 迁移 + db:migrate

### 步骤 3 · API：上传接口（独立于 actions）

> TanStack Start 的 server-fn 适合做 RPC，但上传**二进制**麻烦。直接走 `<form action="/api/uploads" method="post" enctype="multipart/form-data">` 简单。

新建 `src/routes/api/uploads.ts`：

```ts
import type { APIEvent } from "@tanstack/start";
import { unstable_parseMultipartFormData } from "@tanstack/start";
import { auth } from "~/lib/auth.server";
// ...

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }: APIEvent) => {
        const ctx = await contextFromRequest(request.headers);
        if (!ctx) return new Response("Unauthorized", { status: 401 });

        const defaultStorage = await getDefaultStorageService();
        if (!defaultStorage) return new Response("No default storage", { status: 503 });

        const form = await request.formData();
        const file = form.get("file") as File | null;
        if (!file) return new Response("Missing file", { status: 400 });

        const buf = Buffer.from(await file.arrayBuffer());
        const key = `${dayjs().format("YYYY/MM/DD")}/${randomUUID()}-${file.name}`;
        const url = await putObject(defaultStorage.driver, key, buf, file.type);

        const created = await createAttachmentService({
          storageId: defaultStorage.id,
          storageKey: key,
          url, name: file.name, mime: file.type, size: buf.length,
          uploaderId: ctx.userId,
          category: categorizeByMime(file.type),
        });
        return Response.json(created);
      },
    },
  },
});
```

注意：这个端点不是 server-fn，先 GET 必须鉴权。配合 form lib 用 `<UploadAttachment />`。

### 步骤 4 · types/schema/service/policy/actions

```ts
export type AttachmentDto = {
  id, uploaderId, uploaderName?, storageId, storageName?,
  url, name, mime, size, width?, height?, category,
  createdAt,
};

export type ListAttachmentsService = (input: {
  page; pageSize; keyword?; mime?; category?; uploaderId?; storageId?;
}) => Promise<{ items; total }>;
```

### 步骤 5 · 删除策略

- 任何附件删除需：要 admin（与 storages 一致 `assertCanManageAttachments`）
- 删除 service：先从 driver 删对象（容错：driver 调用失败也不阻断 DB 记录删除，记 error 进 result）
- 软删除 attachment 记录（数据库）还是物理删除？建议：物理删除（媒体库是临时资源）

### 步骤 6 · queries + use-mutations

```ts
attachmentsQueryKey = { all, lists, list, details, detail };
useAttachmentsList, useAttachmentDetail, useDeleteAttachment
```

### 步骤 7 · admin 页面

**布局**：
- title="媒体库" description="管理站点图片 / 文档 / 视频等附件"
- 上传组件放在 toolbar 右侧
- 6 字段 filterBar：文件名 / 类型（MIME 类别）/ 分类 / 上传者 / 存储 / 创建起 / 创建止

**风格**：可以考虑卡片网格视图（缩略图）+ 表格视图两种；本期**只做表格视图**，与其它页面保持一致

**表格列**：
| 列 | 宽 | 内容 |
|---|---|---|
| 缩略图 | 80 | 50x50 image/video icon，文/视频显示 file 图标 |
| 文件名 | 240 | name + 角标（mime 主类型） |
| 分类 | 100 | CategoryBadge（image/video/document/audio） |
| 大小 | 100 | 格式化为 KB / MB |
| 存储驱动 | 120 | storageName truncate |
| 上传者 | 100 | username |
| 上传时间 | 170 | formatDateTime |
| 操作 | 200 | sticky right |

操作列：「复制链接 / 下载 / 更多（删除）」

**复制链接** → Clipboard API

### 步骤 8 · 上传组件

`src/components/admin/attachments/upload-attachment.tsx`：

```tsx
function UploadAttachment({ onUploaded }: { onUploaded?: () => void }) {
  return (
    <input
      type="file"
      multiple
      onChange={async (e) => {
        for (const file of Array.from(e.target.files ?? [])) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/uploads", { method: "POST", body: fd, credentials: "include" });
          if (!res.ok) toast.error(`上传失败：${file.name}`);
        }
        onUploaded?.();
        e.target.value = "";
      }}
    />
  );
}
```

本期 toast 用 `alert/errorMessage` 透传即可，不引新依赖。

### 步骤 9 · 单测

- attachments.service.test.ts：delete 时 driver 调用失败也能完成 DB 删除

### 步骤 10 · 验证

```bash
npm run typecheck && lint && arch:check && test
npm run db:reset  # 跑新 seed
npm run dev
```

特别验：
- 跑通：先建一个 local default storage，再上传一张图，列表应见
- mime 与 category 推断正确（image/png → image 类）
- 删除：复制 URL 在新窗口打开，应 404（已删）

### 完成记录

- 日期：2026-07-05
- commit：`4b04862`（`chore: bootstrap yishan-tan base`，无新 commit；subagent 未授权提交）
  - schema migration：`db/migrations/0006_aromatic_rhodey.sql`（`attachment_category` enum + `attachment` 表）
  - feature：`src/features/attachments/{attachments.schema,attachments.types,attachments.service,attachments.policy,attachments.actions,attachments.queries,attachments.use-mutations}.ts` + 三份单测
  - API：`src/routes/api/uploads.ts`（multipart/form-data → putObject → 入库）
  - admin：`src/routes/admin/attachments.tsx`（8 列 + sticky right + 5 字段 filter + 上传按钮）
  - 组件：`src/components/admin/attachments/upload-attachment.tsx`
  - 验证：`typecheck OK / lint 1 warning(noConsole) / arch:check OK / 287 tests pass`
