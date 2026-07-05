import { z } from "zod";

export const attachmentCategorySchema = z.enum(["image", "video", "document", "audio", "other"]);

export type AttachmentCategory = z.infer<typeof attachmentCategorySchema>;

const SEARCH_TERM = z.string().trim().optional();

export const attachmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: SEARCH_TERM,
  mime: SEARCH_TERM,
  category: attachmentCategorySchema.optional(),
  uploaderId: z.string().uuid().optional(),
  storageId: z.string().uuid().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
});

export type AttachmentListQuery = z.infer<typeof attachmentListQuerySchema>;

export const attachmentIdSchema = z.object({
  id: z.string().uuid(),
});

/**
 * 服务端根据 mime 推断 category：image / video / audio 走主类名；
 * text 与 application 视为 document；其它归 other。
 * 单独导出便于 service 复用 + 单测覆盖边界。
 */
export function categorizeByMime(mime: string | undefined | null): AttachmentCategory {
  if (!mime) return "other";
  const normalized = mime.trim().toLowerCase();
  if (!normalized) return "other";
  if (normalized.startsWith("image/")) return "image";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("audio/")) return "audio";
  if (normalized.startsWith("text/")) return "document";
  if (normalized.startsWith("application/")) return "document";
  return "other";
}

/**
 * 记录上传结果 schema（用于 server-fn，driver 完成上传后调用入库）。
 */
export const recordAttachmentInputSchema = z.object({
  storageId: z.string().uuid().nullable().optional(),
  storageKey: z.string().min(1).max(1024),
  url: z.string().min(1).max(2048),
  name: z.string().min(1).max(255),
  mime: z.string().min(1).max(255),
  size: z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  width: z.coerce.number().int().min(0).nullable().optional(),
  height: z.coerce.number().int().min(0).nullable().optional(),
  category: attachmentCategorySchema,
  uploaderId: z.string().uuid().nullable().optional(),
});

export type RecordAttachmentInput = z.infer<typeof recordAttachmentInputSchema>;
