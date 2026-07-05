import { randomBytes } from "node:crypto";
import { type SQL, and, desc, eq, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { auth } from "~/lib/auth.server";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import { assertNotSelfOrSystemAdmin } from "./users.policy";
import type {
  AdminUserDto,
  ApiKeyDto,
  ChangeMyPasswordService,
  CreateApiKeyService,
  DeleteApiKeyService,
  DeleteUserService,
  GetUserService,
  ListApiKeysService,
  ListMyLoginLogsService,
  ListUsersService,
  LoginLogDto,
  UpdateUserService,
} from "./users.types";

function toAdminUser(
  row: typeof schema.user.$inferSelect,
  roleIds: string[],
  lastLoginAt: Date | null,
): AdminUserDto {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    displayName: row.displayName,
    phone: row.phone,
    role: row.role,
    status: row.deletedAt ? "disabled" : "enabled",
    roleIds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastLoginAt: lastLoginAt ? lastLoginAt.toISOString() : null,
  };
}

async function getRoleIdsForUser(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ roleId: schema.userRole.roleId })
    .from(schema.userRole)
    .where(eq(schema.userRole.userId, userId));
  return rows.map((r) => r.roleId);
}

async function getLastLoginAtMap(userIds: string[]): Promise<Map<string, Date>> {
  const map = new Map<string, Date>();
  if (userIds.length === 0) return map;
  const rows = await getDb()
    .select({ userId: schema.loginLog.userId, createdAt: schema.loginLog.createdAt })
    .from(schema.loginLog)
    .where(and(inArray(schema.loginLog.userId, userIds), eq(schema.loginLog.status, "success")))
    .orderBy(desc(schema.loginLog.createdAt));
  for (const r of rows) {
    if (!r.userId) continue;
    if (!map.has(r.userId)) map.set(r.userId, r.createdAt);
  }
  return map;
}

export const listUsersService: ListUsersService = async ({
  page,
  pageSize,
  username,
  name,
  displayName,
  email,
  phone,
  status,
  systemRole,
  roleId,
}) => {
  const where: SQL[] = [];
  const searchClauses: SQL[] = [];
  if (username) searchClauses.push(like(schema.user.username, `%${username}%`));
  if (name) searchClauses.push(like(schema.user.name, `%${name}%`));
  if (displayName) searchClauses.push(like(schema.user.displayName, `%${displayName}%`));
  if (email) searchClauses.push(like(schema.user.email, `%${email}%`));
  if (phone) searchClauses.push(like(schema.user.phone, `%${phone}%`));
  if (searchClauses.length > 0) {
    const cond = or(...searchClauses);
    if (cond) where.push(cond);
  }
  if (roleId) {
    const matched = await getDb()
      .select({ userId: schema.userRole.userId })
      .from(schema.userRole)
      .where(eq(schema.userRole.roleId, roleId));
    const userIds = matched.map((m) => m.userId);
    where.push(
      inArray(
        schema.user.id,
        userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"],
      ),
    );
  }
  if (systemRole) {
    where.push(eq(schema.user.role, systemRole));
  }
  if (status) {
    if (status === "disabled") where.push(isNotNull(schema.user.deletedAt));
    else where.push(isNull(schema.user.deletedAt));
  } else {
    where.push(isNull(schema.user.deletedAt));
  }
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.user)
      .where(and(...where))
      .orderBy(desc(schema.user.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.user)
      .where(and(...where)),
  ]);
  const ids = rows.map((r) => r.id);
  const roleMap = new Map<string, string[]>();
  if (ids.length > 0) {
    const roleRows = await getDb()
      .select()
      .from(schema.userRole)
      .where(inArray(schema.userRole.userId, ids));
    for (const r of roleRows) {
      const list = roleMap.get(r.userId) ?? [];
      list.push(r.roleId);
      roleMap.set(r.userId, list);
    }
  }
  const lastLoginMap = await getLastLoginAtMap(ids);
  return {
    items: rows.map((r) => toAdminUser(r, roleMap.get(r.id) ?? [], lastLoginMap.get(r.id) ?? null)),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export const getUserService: GetUserService = async (id) => {
  const rows = await getDb().select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const roleIds = await getRoleIdsForUser(id);
  const lastLoginMap = await getLastLoginAtMap([id]);
  return toAdminUser(row, roleIds, lastLoginMap.get(id) ?? null);
};

export const updateUserService: UpdateUserService = async (id, input) => {
  const db = getDb();
  const existing = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  if (!existing[0]) throw Errors.notFound("用户不存在");

  if (input.status === "disabled") {
    assertNotSelfOrSystemAdmin(id, "");
  }

  const patch: Partial<typeof schema.user.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.displayName !== undefined) patch.displayName = input.displayName;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.email !== undefined) patch.email = input.email;
  if (input.status !== undefined) {
    if (input.status === "disabled") patch.deletedAt = new Date();
    else patch.deletedAt = null;
  }

  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx.update(schema.user).set(patch).where(eq(schema.user.id, id));
    }
    if (input.roleIds !== undefined) {
      await tx.delete(schema.userRole).where(eq(schema.userRole.userId, id));
      if (input.roleIds.length) {
        await tx
          .insert(schema.userRole)
          .values(input.roleIds.map((roleId) => ({ userId: id, roleId })));
      }
    }
  });

  const refreshed = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("用户不存在");
  const roleIds = await getRoleIdsForUser(id);
  const lastLoginMap = await getLastLoginAtMap([id]);
  return toAdminUser(row, roleIds, lastLoginMap.get(id) ?? null);
};

export const deleteUserService: DeleteUserService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.user)
    .where(and(eq(schema.user.id, id), isNull(schema.user.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("用户不存在");
  assertNotSelfOrSystemAdmin(id, "");
  await db.update(schema.user).set({ deletedAt: new Date() }).where(eq(schema.user.id, id));
  return { ok: true };
};

export const changeMyPasswordService: ChangeMyPasswordService = async ({
  userId,
  oldPassword,
  newPassword,
}) => {
  try {
    const result = (await auth.api.changePassword({
      body: { currentPassword: oldPassword, newPassword, revokeOtherSessions: true },
      headers: new Headers(),
      asResponse: false,
    })) as { user: { id: string } };
    if (!result?.user?.id) throw Errors.invalidCredentials("密码修改失败");
  } catch {
    throw Errors.invalidCredentials("原密码错误");
  }
  void userId;
  return { ok: true };
};

export const listMyLoginLogsService: ListMyLoginLogsService = async ({
  userId,
  page,
  pageSize,
}) => {
  const where = [eq(schema.loginLog.userId, userId)];
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.loginLog)
      .where(and(...where))
      .orderBy(desc(schema.loginLog.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.loginLog)
      .where(and(...where)),
  ]);
  const items: LoginLogDto[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.username,
    status: r.status,
    message: r.message,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
  }));
  return { items, total: Number(totalRow[0]?.count ?? 0) };
};

export const writeLoginLog = async (input: {
  userId: string | null;
  username: string | null;
  status: "success" | "failed";
  message?: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  await getDb()
    .insert(schema.loginLog)
    .values({
      userId: input.userId,
      username: input.username,
      status: input.status,
      message: input.message ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
};

function toApiKeyDto(row: typeof schema.apiKey.$inferSelect): ApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    start: row.start,
    referenceId: row.referenceId,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastRequest: row.lastRequest ? row.lastRequest.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const listApiKeysService: ListApiKeysService = async ({ userId }) => {
  const rows = await getDb()
    .select()
    .from(schema.apiKey)
    .where(eq(schema.apiKey.referenceId, userId))
    .orderBy(desc(schema.apiKey.createdAt));
  return rows.map(toApiKeyDto);
};

export const createApiKeyService: CreateApiKeyService = async ({ userId, name }) => {
  const rawKey = `yishantan_${randomBytes(24).toString("hex")}`;
  const prefix = "yishantan_";
  const start = rawKey.slice(0, 7);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
  const rows = await getDb()
    .insert(schema.apiKey)
    .values({
      name: name ?? null,
      key: rawKey,
      prefix,
      start,
      referenceId: userId,
      userId,
      expiresAt,
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建 API Key 失败");
  return { key: rawKey, apiKey: toApiKeyDto(row) };
};

export const deleteApiKeyService: DeleteApiKeyService = async ({ userId, id }) => {
  const existing = await getDb()
    .select()
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.id, id), eq(schema.apiKey.referenceId, userId)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("API Key 不存在");
  await getDb().delete(schema.apiKey).where(eq(schema.apiKey.id, id));
  return { ok: true };
};
