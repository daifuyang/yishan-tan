import { type SQL, and, desc, eq, gte, inArray, isNull, like, lte, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  CreateRoleService,
  CreateRoleServiceInput,
  DeleteRoleService,
  GetRoleService,
  ListRolesService,
  RoleDetailDto,
  RoleDto,
  RoleListItemDto,
  UpdateRoleService,
  UpdateRoleServiceInput,
} from "./roles.types";

function toDto(row: typeof schema.role.$inferSelect): RoleDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
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

async function getCountsForRoles(roleIds: string[]): Promise<{
  userCounts: Map<string, number>;
  menuCounts: Map<string, number>;
}> {
  const userCounts = new Map<string, number>();
  const menuCounts = new Map<string, number>();
  if (roleIds.length === 0) return { userCounts, menuCounts };
  const [userRows, menuRows] = await Promise.all([
    getDb()
      .select({ roleId: schema.userRole.roleId })
      .from(schema.userRole)
      .where(inArray(schema.userRole.roleId, roleIds)),
    getDb()
      .select({ roleId: schema.roleMenu.roleId })
      .from(schema.roleMenu)
      .where(inArray(schema.roleMenu.roleId, roleIds)),
  ]);
  for (const r of userRows) userCounts.set(r.roleId, (userCounts.get(r.roleId) ?? 0) + 1);
  for (const r of menuRows) menuCounts.set(r.roleId, (menuCounts.get(r.roleId) ?? 0) + 1);
  return { userCounts, menuCounts };
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
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
  if (keyword) {
    const cond = like(schema.role.name, `%${keyword}%`);
    where.push(cond);
  }
  const from = parseDate(createdFrom);
  const to = parseDate(createdTo);
  if (from) where.push(gte(schema.role.createdAt, from));
  if (to) where.push(lte(schema.role.createdAt, to));
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.role)
      .where(and(...where))
      .orderBy(desc(schema.role.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.role)
      .where(and(...where)),
  ]);
  const roleIds = rows.map((r) => r.id);
  const { userCounts, menuCounts } = await getCountsForRoles(roleIds);
  const items: RoleListItemDto[] = rows.map((r) => ({
    ...toDto(r),
    userCount: userCounts.get(r.id) ?? 0,
    menuCount: menuCounts.get(r.id) ?? 0,
  }));
  return { items, total: Number(totalRow[0]?.count ?? 0) };
};

export const getRoleService: GetRoleService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.role)
    .where(and(eq(schema.role.id, id), isNull(schema.role.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const menuIds = await getMenuIds(id);
  return { ...toDto(row), menuIds };
};

export const createRoleService: CreateRoleService = async (input: CreateRoleServiceInput) => {
  return getDb().transaction(async (tx) => {
    const rows = await tx
      .insert(schema.role)
      .values({
        name: input.name,
        description: input.description ?? null,
        status: input.status ?? "enabled",
      })
      .returning();
    const row = rows[0];
    if (!row) throw Errors.internal("创建角色失败");
    if (input.menuIds?.length) {
      await tx
        .insert(schema.roleMenu)
        .values(input.menuIds.map((menuId) => ({ roleId: row.id, menuId })));
    }
    const menuIds = await getMenuIds(row.id);
    return { ...toDto(row), menuIds };
  });
};

export const updateRoleService: UpdateRoleService = async (id, input: UpdateRoleServiceInput) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.role)
    .where(and(eq(schema.role.id, id), isNull(schema.role.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("角色不存在");

  return db.transaction(async (tx) => {
    const patch: Partial<typeof schema.role.$inferInsert> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.status !== undefined) patch.status = input.status;

    if (Object.keys(patch).length > 0) {
      await tx.update(schema.role).set(patch).where(eq(schema.role.id, id));
    }

    if (input.menuIds !== undefined) {
      await tx.delete(schema.roleMenu).where(eq(schema.roleMenu.roleId, id));
      if (input.menuIds.length) {
        await tx
          .insert(schema.roleMenu)
          .values(input.menuIds.map((menuId) => ({ roleId: id, menuId })));
      }
    }

    const refreshed = await tx.select().from(schema.role).where(eq(schema.role.id, id)).limit(1);
    const row = refreshed[0];
    if (!row) throw Errors.notFound("角色不存在");
    const menuIds = await getMenuIds(id);
    return { ...toDto(row), menuIds };
  });
};

export const deleteRoleService: DeleteRoleService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.role)
    .where(and(eq(schema.role.id, id), isNull(schema.role.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("角色不存在");

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
