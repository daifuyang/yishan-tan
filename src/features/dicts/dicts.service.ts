import { type SQL, and, asc, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  CreateDictDataService,
  CreateDictTypeService,
  DeleteDictDataService,
  DeleteDictTypeService,
  DictDataDto,
  DictTypeDto,
  DictTypeListItemDto,
  GetDictDataService,
  GetDictTypeService,
  ListDictDataService,
  ListDictTypesService,
  UpdateDictDataService,
  UpdateDictTypeService,
} from "./dicts.types";

function toTypeDto(row: typeof schema.dictType.$inferSelect): DictTypeDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDataDto(row: typeof schema.dictData.$inferSelect): DictDataDto {
  return {
    id: row.id,
    typeCode: row.typeCode,
    label: row.label,
    value: row.value,
    sort: row.sort,
    status: row.status,
    extra: row.extra,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const listDictTypesService: ListDictTypesService = async ({
  page,
  pageSize,
  keyword,
  status,
}) => {
  const where: SQL[] = [isNull(schema.dictType.deletedAt)];
  if (status) where.push(eq(schema.dictType.status, status));
  if (keyword) {
    const cond = or(
      like(schema.dictType.name, `%${keyword}%`),
      like(schema.dictType.code, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.dictType)
      .where(and(...where))
      .orderBy(asc(schema.dictType.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.dictType)
      .where(and(...where)),
  ]);
  const dataCountMap = await getDataCountByTypeCodes(rows.map((r) => r.code));
  const items: DictTypeListItemDto[] = rows.map((r) => ({
    ...toTypeDto(r),
    dataCount: dataCountMap.get(r.code) ?? 0,
  }));
  return { items, total: Number(totalRow[0]?.count ?? 0) };
};

async function getDataCountByTypeCodes(codes: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (codes.length === 0) return map;
  const rows = await getDb()
    .select({ typeCode: schema.dictData.typeCode })
    .from(schema.dictData)
    .where(and(inArray(schema.dictData.typeCode, codes), isNull(schema.dictData.deletedAt)));
  for (const r of rows) {
    map.set(r.typeCode, (map.get(r.typeCode) ?? 0) + 1);
  }
  return map;
}

export const getDictTypeService: GetDictTypeService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.dictType)
    .where(and(eq(schema.dictType.id, id), isNull(schema.dictType.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? toTypeDto(row) : null;
};

export const createDictTypeService: CreateDictTypeService = async (input) => {
  const db = getDb();
  const existing = await db
    .select({ id: schema.dictType.id })
    .from(schema.dictType)
    .where(eq(schema.dictType.code, input.code))
    .limit(1);
  if (existing[0]) throw Errors.conflict("字典类型编码已存在");
  const rows = await db
    .insert(schema.dictType)
    .values({
      name: input.name,
      code: input.code,
      description: input.description ?? null,
      status: input.status ?? "enabled",
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建字典类型失败");
  return toTypeDto(row);
};

export const updateDictTypeService: UpdateDictTypeService = async (id, input) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.dictType)
    .where(and(eq(schema.dictType.id, id), isNull(schema.dictType.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("字典类型不存在");
  const patch: Partial<typeof schema.dictType.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.dictType).set(patch).where(eq(schema.dictType.id, id));
  }
  const refreshed = await db
    .select()
    .from(schema.dictType)
    .where(eq(schema.dictType.id, id))
    .limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("字典类型不存在");
  return toTypeDto(row);
};

export const deleteDictTypeService: DeleteDictTypeService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.dictType)
    .where(and(eq(schema.dictType.id, id), isNull(schema.dictType.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("字典类型不存在");
  await db.update(schema.dictType).set({ deletedAt: new Date() }).where(eq(schema.dictType.id, id));
  return { ok: true };
};

export const listDictDataService: ListDictDataService = async ({
  page,
  pageSize,
  keyword,
  typeCode,
  status,
}) => {
  const where: SQL[] = [isNull(schema.dictData.deletedAt)];
  if (typeCode) where.push(eq(schema.dictData.typeCode, typeCode));
  if (status) where.push(eq(schema.dictData.status, status));
  if (keyword) {
    const cond = or(
      like(schema.dictData.label, `%${keyword}%`),
      like(schema.dictData.value, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.dictData)
      .where(and(...where))
      .orderBy(asc(schema.dictData.sort), desc(schema.dictData.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.dictData)
      .where(and(...where)),
  ]);
  return { items: rows.map(toDataDto), total: Number(totalRow[0]?.count ?? 0) };
};

export const getDictDataService: GetDictDataService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.dictData)
    .where(and(eq(schema.dictData.id, id), isNull(schema.dictData.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? toDataDto(row) : null;
};

export const createDictDataService: CreateDictDataService = async (input) => {
  const db = getDb();
  const type = await db
    .select({ id: schema.dictType.id })
    .from(schema.dictType)
    .where(and(eq(schema.dictType.code, input.typeCode), isNull(schema.dictType.deletedAt)))
    .limit(1);
  if (!type[0]) throw Errors.notFound("字典类型不存在");
  const rows = await db
    .insert(schema.dictData)
    .values({
      typeCode: input.typeCode,
      label: input.label,
      value: input.value,
      sort: input.sort ?? 0,
      status: input.status ?? "enabled",
      extra: input.extra ?? null,
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建字典数据失败");
  return toDataDto(row);
};

export const updateDictDataService: UpdateDictDataService = async (id, input) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.dictData)
    .where(and(eq(schema.dictData.id, id), isNull(schema.dictData.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("字典数据不存在");
  const patch: Partial<typeof schema.dictData.$inferInsert> = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.value !== undefined) patch.value = input.value;
  if (input.sort !== undefined) patch.sort = input.sort;
  if (input.status !== undefined) patch.status = input.status;
  if (input.extra !== undefined) patch.extra = input.extra;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.dictData).set(patch).where(eq(schema.dictData.id, id));
  }
  const refreshed = await db
    .select()
    .from(schema.dictData)
    .where(eq(schema.dictData.id, id))
    .limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("字典数据不存在");
  return toDataDto(row);
};

export const deleteDictDataService: DeleteDictDataService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.dictData)
    .where(and(eq(schema.dictData.id, id), isNull(schema.dictData.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("字典数据不存在");
  await db.update(schema.dictData).set({ deletedAt: new Date() }).where(eq(schema.dictData.id, id));
  return { ok: true };
};
