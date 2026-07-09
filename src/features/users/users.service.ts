import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
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
  ResetUserPasswordService,
  UpdateUserService,
} from "./users.types";

function toAdminUser(
  row: typeof schema.user.$inferSelect,
  roleIds: string[],
  postIds: string[],
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
    deptId: row.deptId,
    postIds,
    gender: row.gender,
    birthDate: row.birthDate ? row.birthDate.toISOString().slice(0, 10) : null,
    remark: row.remark,
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

async function getPostIdsForUser(userId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ postId: schema.userPost.postId })
    .from(schema.userPost)
    .where(eq(schema.userPost.userId, userId));
  return rows.map((r) => r.postId);
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

/**
 * 提取 listUsersService 与 exportUsersService 共享的 where-clause 构建，
 * 保证「列表分页」与「导出全量」走同一份筛选语义。
 */
async function buildUserListWhere(input: {
  username?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  status?: "enabled" | "disabled";
  systemRole?: "admin" | "member";
  roleId?: string;
  deptId?: string;
}): Promise<SQL[]> {
  const where: SQL[] = [];
  const searchClauses: SQL[] = [];
  if (input.username) searchClauses.push(like(schema.user.username, `%${input.username}%`));
  if (input.name) searchClauses.push(like(schema.user.name, `%${input.name}%`));
  if (input.displayName)
    searchClauses.push(like(schema.user.displayName, `%${input.displayName}%`));
  if (input.email) searchClauses.push(like(schema.user.email, `%${input.email}%`));
  if (input.phone) searchClauses.push(like(schema.user.phone, `%${input.phone}%`));
  if (searchClauses.length > 0) {
    const cond = or(...searchClauses);
    if (cond) where.push(cond);
  }
  if (input.roleId) {
    const matched = await getDb()
      .select({ userId: schema.userRole.userId })
      .from(schema.userRole)
      .where(eq(schema.userRole.roleId, input.roleId));
    const userIds = matched.map((m) => m.userId);
    where.push(
      inArray(
        schema.user.id,
        userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"],
      ),
    );
  }
  if (input.deptId) where.push(eq(schema.user.deptId, input.deptId));
  if (input.systemRole) {
    where.push(eq(schema.user.role, input.systemRole));
  }
  if (input.status) {
    if (input.status === "disabled") where.push(isNotNull(schema.user.deletedAt));
    else where.push(isNull(schema.user.deletedAt));
  } else {
    where.push(isNull(schema.user.deletedAt));
  }
  return where;
}

export const listUsersService: ListUsersService = async (input) => {
  const { page, pageSize } = input;
  const where = await buildUserListWhere(input);
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
  const postMap = new Map<string, string[]>();
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
    const postRows = await getDb()
      .select()
      .from(schema.userPost)
      .where(inArray(schema.userPost.userId, ids));
    for (const r of postRows) {
      const list = postMap.get(r.userId) ?? [];
      list.push(r.postId);
      postMap.set(r.userId, list);
    }
  }
  const lastLoginMap = await getLastLoginAtMap(ids);
  return {
    items: rows.map((r) =>
      toAdminUser(
        r,
        roleMap.get(r.id) ?? [],
        postMap.get(r.id) ?? [],
        lastLoginMap.get(r.id) ?? null,
      ),
    ),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

/**
 * 导出当前筛选条件下全部用户为 CSV（不带分页）。
 * 与 listUsersService 共用 buildUserListWhere 保证语义一致。
 * 返回 CSV 文本，前端用 Blob + a.download 触发下载。
 */
export const exportUsersService = async (
  input: Parameters<typeof buildUserListWhere>[0],
): Promise<string> => {
  const where = await buildUserListWhere(input);
  const rows = await getDb()
    .select()
    .from(schema.user)
    .where(and(...where))
    .orderBy(desc(schema.user.createdAt));
  const ids = rows.map((r) => r.id);
  const lastLoginMap = await getLastLoginAtMap(ids);
  const headers = ["用户名", "姓名", "昵称", "邮箱", "手机号", "状态", "最后登录", "创建时间"];
  const csvEscape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    const status = r.deletedAt ? "已禁用" : "启用";
    const lastLogin = lastLoginMap.get(r.id);
    lines.push(
      [
        csvEscape(r.username),
        csvEscape(r.name),
        csvEscape(r.displayName),
        csvEscape(r.email),
        csvEscape(r.phone),
        csvEscape(status),
        csvEscape(lastLogin ? lastLogin.toISOString().slice(0, 19).replace("T", " ") : ""),
        csvEscape(r.createdAt.toISOString().slice(0, 19).replace("T", " ")),
      ].join(","),
    );
  }
  // UTF-8 BOM：让 Excel 直接识别中文不乱码
  return `﻿${lines.join("\r\n")}`;
};

export const getUserService: GetUserService = async (id) => {
  const rows = await getDb().select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const [roleIds, postIds] = await Promise.all([getRoleIdsForUser(id), getPostIdsForUser(id)]);
  const lastLoginMap = await getLastLoginAtMap([id]);
  return toAdminUser(row, roleIds, postIds, lastLoginMap.get(id) ?? null);
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
  if (input.deptId !== undefined) patch.deptId = input.deptId ?? null;
  if (input.gender !== undefined) patch.gender = input.gender ?? null;
  if (input.birthDate !== undefined) {
    patch.birthDate = input.birthDate ? new Date(`${input.birthDate}T00:00:00Z`) : null;
  }
  if (input.remark !== undefined) patch.remark = input.remark ?? null;
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
    if (input.postIds !== undefined) {
      await tx.delete(schema.userPost).where(eq(schema.userPost.userId, id));
      if (input.postIds.length) {
        await tx
          .insert(schema.userPost)
          .values(input.postIds.map((postId) => ({ userId: id, postId })));
      }
    }
  });

  const refreshed = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("用户不存在");
  const [roleIds, postIds] = await Promise.all([getRoleIdsForUser(id), getPostIdsForUser(id)]);
  const lastLoginMap = await getLastLoginAtMap([id]);
  return toAdminUser(row, roleIds, postIds, lastLoginMap.get(id) ?? null);
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

/**
 * 生成 16 位临时密码：大小写字母 + 数字各至少 1 位，避免易混淆字符 0/O/1/l/I。
 * 返回明文，调用方负责一次性展示给管理员。
 */
function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digit = "23456789";
  const all = `${upper}${lower}${digit}`;
  const bytes = randomBytes(16);
  const pick = (charset: string, idx: number): string => {
    const b = bytes.at(idx) ?? 0;
    return charset.charAt(b % charset.length);
  };
  let pwd = "";
  // 先确保三类字符各出现 1 次
  pwd += pick(upper, 0);
  pwd += pick(lower, 1);
  pwd += pick(digit, 2);
  for (let i = 3; i < 16; i += 1) {
    pwd += pick(all, i);
  }
  // 打散顺序（Fisher–Yates with crypto bytes），避免前 3 位规律
  const arr = pwd.split("");
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = (bytes.at(i) ?? 0) % (i + 1);
    const tmp = arr[i];
    const swap = arr[j];
    if (tmp !== undefined && swap !== undefined) {
      arr[i] = swap;
      arr[j] = tmp;
    }
  }
  return arr.join("");
}

export const resetUserPasswordService: ResetUserPasswordService = async ({ userId }) => {
  const db = getDb();
  const existing = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(and(eq(schema.user.id, userId), isNull(schema.user.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("用户不存在");

  const temporaryPassword = generateTemporaryPassword();
  const hashed = await hashPassword(temporaryPassword);

  // better-auth 邮箱密码登录把哈希存在 account.password（providerId = "credential"）
  await db.transaction(async (tx) => {
    const accountRows = await tx
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")))
      .limit(1);

    if (accountRows[0]) {
      await tx
        .update(schema.account)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(schema.account.id, accountRows[0].id));
    } else {
      await tx.insert(schema.account).values({
        userId,
        providerId: "credential",
        accountId: userId,
        password: hashed,
      });
    }

    // 失效该用户所有 session，强制下次登录使用新密码
    await tx.delete(schema.session).where(eq(schema.session.userId, userId));
  });

  return { temporaryPassword };
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

function toApiKeyDto(row: typeof schema.apikey.$inferSelect): ApiKeyDto {
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
    .from(schema.apikey)
    .where(eq(schema.apikey.referenceId, userId))
    .orderBy(desc(schema.apikey.createdAt));
  return rows.map(toApiKeyDto);
};

export const createApiKeyService: CreateApiKeyService = async ({ userId, name }) => {
  const rawKey = `yishantan_${randomBytes(24).toString("hex")}`;
  const prefix = "yishantan_";
  const start = rawKey.slice(0, 7);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
  // better-auth 的 defaultKeyHasher = SHA-256 → base64url(无 padding)
  // 不哈希的话，verifyApiKey 会从同列读出原文做哈希比对，必然失败。
  const hashedKey = createHash("sha256").update(rawKey).digest("base64url");
  const rows = await getDb()
    .insert(schema.apikey)
    .values({
      name: name ?? null,
      key: hashedKey,
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
    .from(schema.apikey)
    .where(and(eq(schema.apikey.id, id), eq(schema.apikey.referenceId, userId)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("API Key 不存在");
  await getDb().delete(schema.apikey).where(eq(schema.apikey.id, id));
  return { ok: true };
};
