import { rm } from "node:fs/promises";
import path from "node:path";

import { type SQL, and, desc, eq, gte, isNull, like, lte, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  AttachmentDto,
  CreateAttachmentService,
  DeleteAttachmentService,
  GetAttachmentService,
  ListAttachmentsService,
} from "./attachments.types";

type AttachmentRow = typeof schema.attachment.$inferSelect;

function toDto(
  row: AttachmentRow,
  uploaderName: string | null,
  storageName: string | null,
): AttachmentDto {
  return {
    id: row.id,
    uploaderId: row.uploaderId,
    uploaderName,
    storageId: row.storageId,
    storageName,
    url: row.url,
    name: row.name,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/**
 * 批量取用户显示名 / 存储名，按 id 列表一次性 inArray，避免 N+1。
 */
async function buildNameMaps(ids: { uploaderIds: string[]; storageIds: string[] }): Promise<{
  uploaderMap: Map<string, string>;
  storageMap: Map<string, string>;
}> {
  const uploaderMap = new Map<string, string>();
  const storageMap = new Map<string, string>();
  const uploaderIds = Array.from(new Set(ids.uploaderIds.filter(Boolean)));
  const storageIds = Array.from(new Set(ids.storageIds.filter(Boolean)));

  if (uploaderIds.length > 0) {
    const rows = await getDb()
      .select({
        id: schema.user.id,
        name: schema.user.name,
        username: schema.user.username,
        displayName: schema.user.displayName,
      })
      .from(schema.user)
      .where(
        sql`${schema.user.id} IN (${sql.join(
          uploaderIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    for (const r of rows) {
      uploaderMap.set(r.id, r.displayName ?? r.name ?? r.username);
    }
  }

  if (storageIds.length > 0) {
    const rows = await getDb()
      .select({ id: schema.storage.id, name: schema.storage.name })
      .from(schema.storage)
      .where(
        sql`${schema.storage.id} IN (${sql.join(
          storageIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );
    for (const r of rows) {
      storageMap.set(r.id, r.name);
    }
  }

  return { uploaderMap, storageMap };
}

export const listAttachmentsService: ListAttachmentsService = async ({
  page,
  pageSize,
  keyword,
  mime,
  category,
  uploaderId,
  storageId,
  createdFrom,
  createdTo,
}) => {
  const where: SQL[] = [];
  if (keyword) {
    where.push(like(schema.attachment.name, `%${keyword}%`));
  }
  if (mime) {
    where.push(like(schema.attachment.mime, `${mime}%`));
  }
  if (category) {
    where.push(eq(schema.attachment.category, category));
  }
  if (uploaderId) {
    where.push(eq(schema.attachment.uploaderId, uploaderId));
  }
  if (storageId) {
    where.push(eq(schema.attachment.storageId, storageId));
  }
  const from = parseDate(createdFrom);
  if (from) where.push(gte(schema.attachment.createdAt, from));
  const to = parseDate(createdTo);
  if (to) where.push(lte(schema.attachment.createdAt, to));

  const offset = (page - 1) * pageSize;
  const baseWhere = where.length > 0 ? and(...where) : undefined;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.attachment)
      .where(baseWhere)
      .orderBy(desc(schema.attachment.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb().select({ count: sql<number>`count(*)::int` }).from(schema.attachment).where(baseWhere),
  ]);

  const uploaderIds = rows.map((r) => r.uploaderId).filter((v): v is string => Boolean(v));
  const storageIds = rows.map((r) => r.storageId).filter((v): v is string => Boolean(v));
  const { uploaderMap, storageMap } = await buildNameMaps({ uploaderIds, storageIds });

  return {
    items: rows.map((r) =>
      toDto(
        r,
        r.uploaderId ? (uploaderMap.get(r.uploaderId) ?? null) : null,
        r.storageId ? (storageMap.get(r.storageId) ?? null) : null,
      ),
    ),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export const getAttachmentService: GetAttachmentService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.attachment)
    .where(eq(schema.attachment.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const { uploaderMap, storageMap } = await buildNameMaps({
    uploaderIds: row.uploaderId ? [row.uploaderId] : [],
    storageIds: row.storageId ? [row.storageId] : [],
  });
  return toDto(
    row,
    row.uploaderId ? (uploaderMap.get(row.uploaderId) ?? null) : null,
    row.storageId ? (storageMap.get(row.storageId) ?? null) : null,
  );
};

export const createAttachmentService: CreateAttachmentService = async (input) => {
  const rows = await getDb()
    .insert(schema.attachment)
    .values({
      uploaderId: input.uploaderId,
      storageId: input.storageId,
      storageKey: input.storageKey,
      url: input.url,
      name: input.name,
      mime: input.mime,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      category: input.category,
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建附件记录失败");
  return toDto(row, null, null);
};

/**
 * 删除：先尝试调用 driver 删对象，driver 失败仅记录到 result 不阻断 DB 删除；
 * DB 物理删除附件记录。返回 storageKey 让调用方在 driver 失败时可以重试。
 */
export const deleteAttachmentService: DeleteAttachmentService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.attachment)
    .where(eq(schema.attachment.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw Errors.notFound("附件不存在");

  let driverError: string | null = null;
  if (row.storageId) {
    const storageRows = await getDb()
      .select()
      .from(schema.storage)
      .where(and(eq(schema.storage.id, row.storageId), isNull(schema.storage.deletedAt)))
      .limit(1);
    const storageRow = storageRows[0];
    if (storageRow) {
      try {
        const parsedConfig = (() => {
          try {
            const raw = JSON.parse(storageRow.config);
            return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          } catch {
            return {};
          }
        })() as Record<string, string | number | boolean | null>;
        await deleteObject(storageRow.driver, row.storageKey, parsedConfig);
      } catch (err) {
        driverError = err instanceof Error ? err.message : String(err);
        if (process.env.NODE_ENV !== "production") {
          // biome-ignore lint/suspicious/noConsole: dev-only observability for driver deletion failures
          console.warn(`[attachments] driver 删除失败 ${row.storageKey}: ${driverError}`);
        }
      }
    }
  }

  await getDb().delete(schema.attachment).where(eq(schema.attachment.id, id));

  if (driverError) {
    return { ok: true, storageKey: row.storageKey, storageId: row.storageId };
  }
  return { ok: true, storageKey: null, storageId: null };
};

/**
 * 按 driver 实际删除对象。本期只实现 local driver：
 *  - 读取 storage.config 解析出 dir 与 prefix
 *  - 把 storageKey 拼到磁盘路径后 unlink
 *  - 其它 driver 抛错并把错误冒泡给 service 记录
 */
async function deleteObject(
  driver: (typeof schema.storageDriver.enumValues)[number],
  key: string,
  config: Record<string, string | number | boolean | null>,
): Promise<void> {
  if (driver !== "local") {
    throw Errors.internal(`驱动 ${driver} 删除对象未实现`);
  }
  const dir =
    typeof config.dir === "string" && config.dir.trim() ? config.dir.trim() : "public/uploads";
  const prefix =
    typeof config.prefix === "string" ? config.prefix.trim().replace(/^\/+|\/+$/g, "") : "";
  const safeKey = key.replace(/^\/+/, "").replace(/\.\.+/g, "");
  const full = prefix ? path.join(dir, prefix, safeKey) : path.join(dir, safeKey);
  const abs = path.resolve(full);
  await rm(abs, { force: true });
}
