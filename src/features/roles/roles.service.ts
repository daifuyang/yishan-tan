import { type SQL, and, desc, eq, gte, isNull, like, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  CreateRoleService,
  DeleteRoleService,
  GetRoleService,
  ListRolesService,
  RoleDetailDto,
  RoleDto,
  UpdateRoleService,
} from "./roles.types";

const userCreator = alias(schema.user, "user_creator");
const userUpdater = alias(schema.user, "user_updater");

type RoleRow = typeof schema.role.$inferSelect & {
  creator?: { username: string } | null;
  updater?: { username: string } | null;
};

function toDto(row: RoleRow): RoleDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    dataScope: row.dataScope,
    isSystemDefault: row.isSystemDefault,
    creatorId: row.creatorId,
    creatorName: row.creator?.username ?? null,
    updaterId: row.updaterId,
    updaterName: row.updater?.username ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getMenuIds(roleId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ menuId: schema.roleMenu.menuId })
    .from(schema.roleMenu)
    .where(eq(schema.roleMenu.roleId, roleId));
  return rows.map((r) => r.menuId);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

async function ensureUniqueName(name: string, excludeRoleId?: string): Promise<void> {
  const where: SQL[] = [eq(schema.role.name, name), isNull(schema.role.deletedAt)];
  const rows = await getDb()
    .select({ id: schema.role.id })
    .from(schema.role)
    .where(and(...where))
    .limit(1);
  const conflict = rows[0];
  if (conflict && conflict.id !== excludeRoleId) {
    throw Errors.conflict("角色名称已存在");
  }
}

export const listRolesService: ListRolesService = async ({
  page,
  pageSize,
  keyword,
  status,
  createdFrom,
  createdTo,
}) => {
  const where: SQL[] = [isNull(schema.role.deletedAt)];
  if (status) where.push(eq(schema.role.status, status));
  if (keyword) where.push(like(schema.role.name, `%${keyword}%`));
  const from = parseDate(createdFrom);
  const to = parseDate(createdTo);
  if (from) where.push(gte(schema.role.createdAt, from));
  if (to) where.push(lte(schema.role.createdAt, to));
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select({
        id: schema.role.id,
        name: schema.role.name,
        description: schema.role.description,
        status: schema.role.status,
        dataScope: schema.role.dataScope,
        isSystemDefault: schema.role.isSystemDefault,
        creatorId: schema.role.creatorId,
        updaterId: schema.role.updaterId,
        createdAt: schema.role.createdAt,
        updatedAt: schema.role.updatedAt,
        creator: { username: userCreator.username },
      })
      .from(schema.role)
      .leftJoin(userCreator, eq(userCreator.id, schema.role.creatorId))
      .where(and(...where))
      .orderBy(desc(schema.role.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.role)
      .where(and(...where)),
  ]);
  // 列表只取 creatorName;updaterName 留空,DTO 字段仍为 null
  const items: RoleDto[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    dataScope: r.dataScope,
    isSystemDefault: r.isSystemDefault,
    creatorId: r.creatorId,
    creatorName: r.creator?.username ?? null,
    updaterId: r.updaterId,
    updaterName: null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return { items, total: Number(totalRow[0]?.count ?? 0) };
};

export const getRoleService: GetRoleService = async ({ id }) => {
  const rows = await getDb()
    .select({
      id: schema.role.id,
      name: schema.role.name,
      description: schema.role.description,
      status: schema.role.status,
      dataScope: schema.role.dataScope,
      isSystemDefault: schema.role.isSystemDefault,
      creatorId: schema.role.creatorId,
      updaterId: schema.role.updaterId,
      createdAt: schema.role.createdAt,
      updatedAt: schema.role.updatedAt,
      creator: { username: userCreator.username },
      updater: { username: userUpdater.username },
    })
    .from(schema.role)
    .leftJoin(userCreator, eq(userCreator.id, schema.role.creatorId))
    .leftJoin(userUpdater, eq(userUpdater.id, schema.role.updaterId))
    .where(and(eq(schema.role.id, id), isNull(schema.role.deletedAt)))
    .limit(1);
  const row = rows[0] as
    | (RoleRow & { creator?: { username: string } | null; updater?: { username: string } | null })
    | undefined;
  if (!row) return null;
  const menuIds = await getMenuIds(id);
  return { ...toDto(row), menuIds };
};

export const createRoleService: CreateRoleService = async ({ ctx, data }) => {
  await ensureUniqueName(data.name);
  return getDb().transaction(async (tx) => {
    const rows = await tx
      .insert(schema.role)
      .values({
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? "enabled",
        dataScope: data.dataScope ?? "1",
        isSystemDefault: false,
        creatorId: ctx.userId,
        updaterId: ctx.userId,
      })
      .returning();
    const row = rows[0];
    if (!row) throw Errors.internal("创建角色失败");
    if (data.menuIds?.length) {
      await tx
        .insert(schema.roleMenu)
        .values(data.menuIds.map((menuId) => ({ roleId: row.id, menuId })));
    }
    const menuIds = await getMenuIds(row.id);
    return { ...toDto(row as RoleRow), menuIds };
  });
};

export const updateRoleService: UpdateRoleService = async ({ ctx, id, data }) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.role)
    .where(and(eq(schema.role.id, id), isNull(schema.role.deletedAt)))
    .limit(1);
  const existingRow = existing[0];
  if (!existingRow) throw Errors.notFound("角色不存在");

  if (existingRow.isSystemDefault && data.status === "disabled") {
    throw Errors.invalid("系统默认角色不可禁用");
  }

  if (data.name && data.name !== existingRow.name) {
    await ensureUniqueName(data.name, id);
  }

  return db.transaction(async (tx) => {
    const patch: Partial<typeof schema.role.$inferInsert> = {
      updaterId: ctx.userId,
    };
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;
    if (data.dataScope !== undefined) patch.dataScope = data.dataScope;

    if (Object.keys(patch).length > 1) {
      await tx.update(schema.role).set(patch).where(eq(schema.role.id, id));
    }

    if (data.menuIds !== undefined) {
      await tx.delete(schema.roleMenu).where(eq(schema.roleMenu.roleId, id));
      if (data.menuIds.length) {
        await tx
          .insert(schema.roleMenu)
          .values(data.menuIds.map((menuId) => ({ roleId: id, menuId })));
      }
    }

    const refreshed = await tx
      .select({
        id: schema.role.id,
        name: schema.role.name,
        description: schema.role.description,
        status: schema.role.status,
        dataScope: schema.role.dataScope,
        isSystemDefault: schema.role.isSystemDefault,
        creatorId: schema.role.creatorId,
        updaterId: schema.role.updaterId,
        createdAt: schema.role.createdAt,
        updatedAt: schema.role.updatedAt,
        creator: { username: userCreator.username },
        updater: { username: userUpdater.username },
      })
      .from(schema.role)
      .leftJoin(userCreator, eq(userCreator.id, schema.role.creatorId))
      .leftJoin(userUpdater, eq(userUpdater.id, schema.role.updaterId))
      .where(eq(schema.role.id, id))
      .limit(1);
    const row = refreshed[0] as
      | (RoleRow & {
          creator?: { username: string } | null;
          updater?: { username: string } | null;
        })
      | undefined;
    if (!row) throw Errors.notFound("角色不存在");
    const menuIds = await getMenuIds(id);
    return { ...toDto(row), menuIds };
  });
};

export const deleteRoleService: DeleteRoleService = async ({ id }) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.role)
    .where(and(eq(schema.role.id, id), isNull(schema.role.deletedAt)))
    .limit(1);
  const row = existing[0];
  if (!row) throw Errors.notFound("角色不存在");
  if (row.isSystemDefault) throw Errors.invalid("系统默认角色不允许删除");

  const boundUsers = await db
    .select({ userId: schema.userRole.userId })
    .from(schema.userRole)
    .where(eq(schema.userRole.roleId, id))
    .limit(1);
  if (boundUsers[0]) throw Errors.conflict("仍有用户绑定此角色，无法删除");

  await db.update(schema.role).set({ deletedAt: new Date() }).where(eq(schema.role.id, id));
  return { ok: true };
};

export type RoleDetailOrNull = RoleDetailDto | null;
