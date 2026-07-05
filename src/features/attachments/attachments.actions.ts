import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { contextFromRequest } from "~/server/request-context";
import { assertCanManageAttachments } from "./attachments.policy";
import {
  attachmentCategorySchema,
  attachmentIdSchema,
  attachmentListQuerySchema,
  categorizeByMime,
  recordAttachmentInputSchema,
} from "./attachments.schema";
import {
  createAttachmentService,
  deleteAttachmentService,
  getAttachmentService,
  listAttachmentsService,
} from "./attachments.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertCanManageAttachments(ctx);
  return ctx;
}

export { categorizeByMime };

/**
 * 上传完成后由 `/api/uploads` 调用：把 driver 返回的 url/key 入库。
 * 不直接被前端 server-fn 调用，但保留 server-fn 形式以便后续扩展直接上传入口。
 */
export const recordUploadedAttachment = createServerFn({ method: "POST" })
  .validator(recordAttachmentInputSchema)
  .handler(async ({ data }) => {
    const ctx = await adminCtx();
    return createAttachmentService({
      storageId: data.storageId ?? null,
      storageKey: data.storageKey,
      url: data.url,
      name: data.name,
      mime: data.mime,
      size: data.size,
      width: data.width ?? null,
      height: data.height ?? null,
      category: data.category,
      uploaderId: data.uploaderId ?? ctx.userId,
    });
  });

export const listAttachments = createServerFn({ method: "GET" })
  .validator(attachmentListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listAttachmentsService(data);
  });

export const getAttachment = createServerFn({ method: "GET" })
  .validator(attachmentIdSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    const result = await getAttachmentService(data.id);
    if (!result) throw new Error("NOT_FOUND");
    return result;
  });

export const deleteAttachment = createServerFn({ method: "POST" })
  .validator(attachmentIdSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return deleteAttachmentService(data.id);
  });

export const attachmentCategories = createServerFn({ method: "GET" }).handler(async () => {
  await adminCtx();
  return attachmentCategorySchema.options;
});
