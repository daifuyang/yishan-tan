import { randomUUID } from "node:crypto";

import { createFileRoute } from "@tanstack/react-router";
import { assertCanUploadAttachment } from "~/features/attachments/attachments.policy";
import { categorizeByMime } from "~/features/attachments/attachments.schema";
import { createAttachmentService } from "~/features/attachments/attachments.service";
import { getDefaultStorageService } from "~/features/storages/storages.service";
import { Errors, isServerError } from "~/lib/errors";
import { putObject } from "~/lib/storage-driver";
import { contextFromRequest, requireRequestContext } from "~/server/request-context";

function dayPrefix(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * 上传端点：走 multipart/form-data，前端用 fetch 直接调，
 * 不走 server-fn（server-fn 序列化二进制较麻烦）。
 *
 * 流程：
 *   1. 解析请求 → ServiceContext，要求超级管理员
 *   2. 取默认 storage 驱动
 *   3. 读 multipart file
 *   4. 调用 putObject 写对象 → 拿到 URL
 *   5. INSERT 一条 attachment 记录
 *   6. 返回 DTO
 */
export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          await assertCanUploadAttachment(ctx);

          const defaultStorage = await getDefaultStorageService();
          if (!defaultStorage) {
            throw Errors.internal("未配置默认存储，请先在「云存储」中启用默认驱动");
          }

          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) {
            throw Errors.invalid("缺少文件字段 file");
          }

          const buf = Buffer.from(await file.arrayBuffer());
          const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
          const safeBase = file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "file";
          const datePrefix = dayPrefix(new Date());
          const key = `${datePrefix}/${randomUUID()}-${safeBase}${ext}`;

          const url = await putObject(defaultStorage.driver, key, buf, defaultStorage.config);

          const dto = await createAttachmentService({
            uploaderId: ctx.userId,
            storageId: defaultStorage.id,
            storageKey: key,
            url,
            name: file.name,
            mime: file.type || "application/octet-stream",
            size: buf.length,
            category: categorizeByMime(file.type),
          });

          return Response.json({ ok: true, data: dto });
        } catch (err) {
          if (isServerError(err)) {
            return Response.json(
              { ok: false, code: err.code, error: err.message },
              { status: err.statusCode },
            );
          }
          const message = err instanceof Error ? err.message : "上传失败";
          return Response.json({ ok: false, code: "INTERNAL", error: message }, { status: 500 });
        }
      },
      // GET 仅作 health 探活，校验鉴权链可用
      GET: async ({ request }) => {
        const ctx = await contextFromRequest(request);
        if (!ctx) {
          return Response.json({ ok: false, code: "UNAUTHENTICATED" }, { status: 401 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
