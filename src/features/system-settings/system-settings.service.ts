import { and, eq, inArray, isNull } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  BatchGetSystemOptionsService,
  BatchSetSystemOptionsService,
  GetSystemOptionService,
  SetSystemOptionService,
  SystemOptionDto,
} from "./system-settings.types";

function toDto(row: typeof schema.systemOption.$inferSelect): SystemOptionDto {
  return {
    key: row.key,
    value: row.value,
    description: row.description,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const getSystemOptionService: GetSystemOptionService = async (key) => {
  const rows = await getDb()
    .select()
    .from(schema.systemOption)
    .where(and(eq(schema.systemOption.key, key), isNull(schema.systemOption.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toDto(row);
};

export const batchGetSystemOptionsService: BatchGetSystemOptionsService = async (keys) => {
  if (keys.length === 0) return [];
  const rows = await getDb()
    .select()
    .from(schema.systemOption)
    .where(and(inArray(schema.systemOption.key, keys), isNull(schema.systemOption.deletedAt)));
  return rows.map(toDto);
};

export const setSystemOptionService: SetSystemOptionService = async ({
  key,
  value,
  description,
}) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.systemOption)
    .where(eq(schema.systemOption.key, key))
    .limit(1);
  if (existing[0]) {
    const rows = await db
      .update(schema.systemOption)
      .set({ value, description: description ?? existing[0].description, deletedAt: null })
      .where(eq(schema.systemOption.key, key))
      .returning();
    const row = rows[0];
    if (!row) throw Errors.internal("更新失败");
    return toDto(row);
  }
  const rows = await db
    .insert(schema.systemOption)
    .values({ key, value, description: description ?? null })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建失败");
  return toDto(row);
};

export const batchSetSystemOptionsService: BatchSetSystemOptionsService = async ({ items }) => {
  const results: SystemOptionDto[] = [];
  let updatedCount = 0;
  for (const item of items) {
    const dto = await setSystemOptionService(item);
    results.push(dto);
    updatedCount += 1;
  }
  return { updatedCount, results };
};
