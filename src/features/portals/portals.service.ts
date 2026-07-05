import { type SQL, and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  CreatePortalService,
  DeletePortalService,
  GetDefaultPortalService,
  GetPortalService,
  ListPortalsService,
  PortalDto,
  PortalStatus,
  SetDefaultPortalService,
  UpdatePortalService,
} from "./portals.types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export const __test__normalizeOptionalString = normalizeOptionalString;

function toDto(row: typeof schema.portal.$inferSelect): PortalDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    domain: row.domain ?? null,
    logoUrl: row.logoUrl ?? null,
    themePrimary: row.themePrimary ?? null,
    themeMode: row.themeMode,
    description: row.description ?? null,
    isDefault: row.isDefault,
    status: row.deletedAt ? "disabled" : row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureExists(id: string): Promise<typeof schema.portal.$inferSelect> {
  const rows = await getDb().select().from(schema.portal).where(eq(schema.portal.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.deletedAt) throw Errors.notFound("门户不存在");
  return row;
}

async function ensureCodeAvailable(
  code: string,
  tx: Pick<ReturnType<typeof getDb>, "select">,
  excludeId?: string,
): Promise<void> {
  const where: SQL[] = [eq(schema.portal.code, code), isNull(schema.portal.deletedAt)];
  if (excludeId) where.push(sql`${schema.portal.id} <> ${excludeId}`);
  const rows = await tx
    .select({ id: schema.portal.id })
    .from(schema.portal)
    .where(and(...where))
    .limit(1);
  if (rows[0]) {
    throw Errors.conflict(`编码「${code}」已被占用`);
  }
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export const listPortalsService: ListPortalsService = async ({
  page,
  pageSize,
  keyword,
  isDefault,
  status,
  createdFrom,
  createdTo,
}) => {
  const where: SQL[] = [isNull(schema.portal.deletedAt)];
  if (typeof isDefault === "boolean") {
    where.push(eq(schema.portal.isDefault, isDefault));
  }
  if (status) where.push(eq(schema.portal.status, status));
  if (keyword) {
    const kw = `%${keyword}%`;
    const cond = sql<boolean>`(${schema.portal.name} LIKE ${kw} OR ${schema.portal.code} LIKE ${kw} OR ${schema.portal.domain} LIKE ${kw})`;
    where.push(cond);
  }
  const from = parseDate(createdFrom);
  const to = parseDate(createdTo);
  if (from) where.push(gte(schema.portal.createdAt, from));
  if (to) where.push(lte(schema.portal.createdAt, to));

  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.portal)
      .where(and(...where))
      .orderBy(desc(schema.portal.isDefault), asc(schema.portal.name))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.portal)
      .where(and(...where)),
  ]);
  return {
    items: rows.map(toDto),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export const getPortalService: GetPortalService = async (id) => {
  const row = await ensureExists(id);
  return toDto(row);
};

export const getDefaultPortalService: GetDefaultPortalService = async () => {
  const rows = await getDb()
    .select()
    .from(schema.portal)
    .where(
      and(
        eq(schema.portal.isDefault, true),
        isNull(schema.portal.deletedAt),
        eq(schema.portal.status, "enabled"),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toDto(row);
};

export const createPortalService: CreatePortalService = async (input) => {
  return getDb().transaction(async (tx) => {
    await ensureCodeAvailable(input.code, tx);

    if (input.isDefault === true) {
      await tx
        .update(schema.portal)
        .set({ isDefault: false })
        .where(and(eq(schema.portal.isDefault, true), isNull(schema.portal.deletedAt)));
    }

    const rows = await tx
      .insert(schema.portal)
      .values({
        name: input.name,
        code: input.code,
        domain: normalizeOptionalString(input.domain ?? null),
        logoUrl: normalizeOptionalString(input.logoUrl ?? null),
        themePrimary: normalizeOptionalString(input.themePrimary ?? null),
        themeMode: input.themeMode ?? "light",
        description: normalizeOptionalString(input.description ?? null),
        isDefault: input.isDefault === true,
        status: input.status ?? "enabled",
      })
      .returning();
    const row = rows[0];
    if (!row) throw Errors.internal("创建门户失败");
    return toDto(row);
  });
};

export const updatePortalService: UpdatePortalService = async (id, input) => {
  const existing = await ensureExists(id);

  return getDb().transaction(async (tx) => {
    if (input.code !== undefined && input.code !== existing.code) {
      await ensureCodeAvailable(input.code, tx, id);
    }

    if (input.isDefault === true) {
      await tx
        .update(schema.portal)
        .set({ isDefault: false })
        .where(and(eq(schema.portal.isDefault, true), isNull(schema.portal.deletedAt)));
    }

    const patch: Partial<typeof schema.portal.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.code !== undefined) patch.code = input.code;
    if (input.domain !== undefined) patch.domain = normalizeOptionalString(input.domain);
    if (input.logoUrl !== undefined) patch.logoUrl = normalizeOptionalString(input.logoUrl);
    if (input.themePrimary !== undefined) {
      patch.themePrimary = normalizeOptionalString(input.themePrimary);
    }
    if (input.themeMode !== undefined) patch.themeMode = input.themeMode;
    if (input.description !== undefined) {
      patch.description = normalizeOptionalString(input.description);
    }
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault;
    if (input.status !== undefined) patch.status = input.status as PortalStatus;

    if (Object.keys(patch).length > 0) {
      await tx.update(schema.portal).set(patch).where(eq(schema.portal.id, id));
    }

    const updated = await tx.select().from(schema.portal).where(eq(schema.portal.id, id)).limit(1);
    const row = updated[0];
    if (!row) throw Errors.notFound("门户不存在");
    return toDto(row);
  });
};

export const deletePortalService: DeletePortalService = async (id) => {
  const existing = await ensureExists(id);
  if (existing.isDefault) {
    throw Errors.conflict("默认门户不能删除，请先将其他门户设为默认");
  }
  await getDb()
    .update(schema.portal)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(eq(schema.portal.id, id));
  return { ok: true };
};

export const setDefaultPortalService: SetDefaultPortalService = async (id) => {
  return getDb().transaction(async (tx) => {
    const existing = await ensureExists(id);
    if (!existing || existing.deletedAt) {
      throw Errors.notFound("门户不存在");
    }
    await tx
      .update(schema.portal)
      .set({ isDefault: false })
      .where(and(eq(schema.portal.isDefault, true), isNull(schema.portal.deletedAt)));
    const updated = await tx
      .update(schema.portal)
      .set({ isDefault: true })
      .where(eq(schema.portal.id, id))
      .returning();
    const row = updated[0];
    if (!row) throw Errors.notFound("门户不存在");
    return toDto(row);
  });
};
