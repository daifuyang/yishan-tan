import { type SQL, and, desc, eq, gte, isNull, like, lte, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import { type StorageDriver, driverConfigSchemaMap } from "./storages.schema";
import type {
  CreateStorageService,
  DeleteStorageService,
  GetDefaultStorageService,
  GetStorageService,
  ListStoragesService,
  SetDefaultStorageService,
  StorageConfig,
  StorageConfigValue,
  StorageDetailDto,
  StorageDto,
  UpdateStorageService,
} from "./storages.types";

const SENSITIVE_KEYS: Record<StorageDriver, string[]> = {
  local: [],
  "aliyun-oss": ["accessKeySecret"],
  "tencent-cos": ["secretKey"],
  "aws-s3": ["secretAccessKey"],
  qiniu: ["secretKey"],
  minio: ["secretAccessKey"],
};

export const REDACTED_PLACEHOLDER = "******";

export function redactConfig(driver: StorageDriver, config: StorageConfig): StorageConfig {
  const keys = SENSITIVE_KEYS[driver] ?? [];
  const result: StorageConfig = { ...config };
  for (const k of keys) {
    if (Object.hasOwn(result, k)) result[k] = REDACTED_PLACEHOLDER;
  }
  return result;
}

function parseStoredConfig(raw: string): StorageConfig {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: StorageConfig = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
        out[k] = v as StorageConfigValue;
      } else {
        out[k] = String(v);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function stringifyConfig(config: StorageConfig): string {
  return JSON.stringify(config);
}

function validateDriverConfig(driver: StorageDriver, config: unknown): StorageConfig {
  const schemaForDriver = driverConfigSchemaMap[driver];
  const result = schemaForDriver.safeParse(config);
  if (!result.success) {
    throw Errors.invalid("存储配置不合法", result.error.issues);
  }
  const parsed = result.data as Record<string, unknown>;
  const out: StorageConfig = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = JSON.stringify(v);
    } else {
      out[k] = JSON.stringify(v);
    }
  }
  return out;
}

function toDto(row: typeof schema.storage.$inferSelect): StorageDto {
  const config = parseStoredConfig(row.config);
  return {
    id: row.id,
    name: row.name,
    driver: row.driver,
    isDefault: row.isDefault,
    description: row.description,
    status: row.deletedAt ? "disabled" : row.status,
    configSummary: redactConfig(row.driver, config),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: typeof schema.storage.$inferSelect): StorageDetailDto {
  const dto = toDto(row);
  const config = parseStoredConfig(row.config);
  return {
    ...dto,
    config: redactConfig(row.driver, config),
  };
}

async function ensureExists(id: string): Promise<typeof schema.storage.$inferSelect> {
  const rows = await getDb()
    .select()
    .from(schema.storage)
    .where(eq(schema.storage.id, id))
    .limit(1);
  const row = rows[0];
  if (!row || row.deletedAt) throw Errors.notFound("存储不存在");
  return row;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export const listStoragesService: ListStoragesService = async ({
  page,
  pageSize,
  keyword,
  driver,
  isDefault,
  status,
  createdFrom,
  createdTo,
}) => {
  const where: SQL[] = [isNull(schema.storage.deletedAt)];
  if (driver) where.push(eq(schema.storage.driver, driver));
  if (typeof isDefault === "boolean") {
    where.push(eq(schema.storage.isDefault, isDefault));
  }
  if (status) where.push(eq(schema.storage.status, status));
  if (keyword) {
    const cond = like(schema.storage.name, `%${keyword}%`);
    where.push(cond);
  }
  const from = parseDate(createdFrom);
  const to = parseDate(createdTo);
  if (from) where.push(gte(schema.storage.createdAt, from));
  if (to) where.push(lte(schema.storage.createdAt, to));

  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.storage)
      .where(and(...where))
      .orderBy(desc(schema.storage.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.storage)
      .where(and(...where)),
  ]);
  return {
    items: rows.map(toDto),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export const getStorageService: GetStorageService = async (id) => {
  const row = await ensureExists(id);
  return toDetail(row);
};

export const getDefaultStorageService: GetDefaultStorageService = async () => {
  const rows = await getDb()
    .select()
    .from(schema.storage)
    .where(
      and(
        eq(schema.storage.isDefault, true),
        isNull(schema.storage.deletedAt),
        eq(schema.storage.status, "enabled"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toDetail(row);
};

export const createStorageService: CreateStorageService = async (input) => {
  const config = validateDriverConfig(input.driver, input.config);
  return getDb().transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx
        .update(schema.storage)
        .set({ isDefault: false })
        .where(and(eq(schema.storage.isDefault, true), isNull(schema.storage.deletedAt)));
    }
    const rows = await tx
      .insert(schema.storage)
      .values({
        name: input.name,
        driver: input.driver,
        isDefault: input.isDefault === true,
        config: stringifyConfig(config),
        description: input.description ?? null,
        status: input.status ?? "enabled",
      })
      .returning();
    const row = rows[0];
    if (!row) throw Errors.internal("创建存储失败");
    return toDetail(row);
  });
};

export const updateStorageService: UpdateStorageService = async (id, input) => {
  const existing = await ensureExists(id);
  const nextDriver: StorageDriver = input.driver ?? existing.driver;

  let parsedConfig: StorageConfig | undefined;
  if (input.config !== undefined && input.config !== null) {
    parsedConfig = validateDriverConfig(nextDriver, input.config);
  }

  return getDb().transaction(async (tx) => {
    if (input.isDefault === true) {
      await tx
        .update(schema.storage)
        .set({ isDefault: false })
        .where(and(eq(schema.storage.isDefault, true), isNull(schema.storage.deletedAt)));
    }

    const patch: Partial<typeof schema.storage.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.driver !== undefined) patch.driver = input.driver;
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = input.status;
    if (parsedConfig !== undefined) patch.config = stringifyConfig(parsedConfig);

    if (Object.keys(patch).length > 0) {
      await tx.update(schema.storage).set(patch).where(eq(schema.storage.id, id));
    }

    const updated = await tx
      .select()
      .from(schema.storage)
      .where(eq(schema.storage.id, id))
      .limit(1);
    const row = updated[0];
    if (!row) throw Errors.notFound("存储不存在");
    return toDetail(row);
  });
};

export const deleteStorageService: DeleteStorageService = async (id) => {
  const existing = await ensureExists(id);
  if (existing.isDefault) {
    throw Errors.conflict("默认存储不能删除，请先将其他存储设为默认");
  }
  await getDb()
    .update(schema.storage)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(eq(schema.storage.id, id));
  return { ok: true };
};

export const setDefaultStorageService: SetDefaultStorageService = async (id) => {
  return getDb().transaction(async (tx) => {
    const existing = await ensureExists(id);
    if (!existing || existing.deletedAt) {
      throw Errors.notFound("存储不存在");
    }
    await tx
      .update(schema.storage)
      .set({ isDefault: false })
      .where(and(eq(schema.storage.isDefault, true), isNull(schema.storage.deletedAt)));
    const updated = await tx
      .update(schema.storage)
      .set({ isDefault: true })
      .where(eq(schema.storage.id, id))
      .returning();
    const row = updated[0];
    if (!row) throw Errors.notFound("存储不存在");
    return toDetail(row);
  });
};
