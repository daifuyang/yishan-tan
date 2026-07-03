import { and, eq, isNull } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { auth } from "~/lib/auth.server";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import { enforceRateLimitOrThrow, rateLimit } from "~/lib/rate-limit.server";
import type {
  CreateSessionService,
  CreateUserService,
  CurrentUserService,
  DeleteSessionService,
} from "./auth.types";

function toPublicUser(row: typeof schema.user.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
  };
}

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}

export const getCurrentUserService: CurrentUserService = async (ctx) => {
  if (!ctx) return null;
  const rows = await getDb()
    .select()
    .from(schema.user)
    .where(and(eq(schema.user.id, ctx.userId), isNull(schema.user.deletedAt)))
    .limit(1);
  const u = rows[0];
  if (!u) return null;
  return toPublicUser(u);
};

export const createSessionService: CreateSessionService = async ({ email, password }, headers) => {
  const clientIp = getClientIp(headers);
  const rl = await rateLimit({
    bucket: "auth:signin",
    key: `${email}:${clientIp}`,
    limit: 10,
    windowSec: 60,
  });
  enforceRateLimitOrThrow(rl);

  try {
    const result = (await auth.api.signInEmail({
      body: { email, password },
      headers,
      asResponse: false,
    })) as { user: { id: string } };

    const me = await getDb()
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, result.user.id))
      .limit(1);
    const u = me[0];
    if (!u) throw Errors.invalidCredentials();
    return { user: toPublicUser(u) };
  } catch {
    throw Errors.invalidCredentials();
  }
};

export const deleteSessionService: DeleteSessionService = async (ctx) => {
  try {
    await auth.api.signOut({ headers: ctx.headers });
  } catch {
    // best effort
  }
  return { ok: true };
};

export const createUserService: CreateUserService = async (
  { email, password, username, displayName },
  headers,
) => {
  const existing = await getDb()
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.username, username))
    .limit(1);
  if (existing[0]) throw Errors.conflict("用户名已被占用");

  const result = (await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: displayName ?? username,
      username,
      displayName: displayName ?? username,
    },
    headers,
    asResponse: false,
  })) as { user: { id: string } };

  const me = await getDb()
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, result.user.id))
    .limit(1);
  const u = me[0];
  if (!u) throw Errors.internal("创建成功但读取失败");
  return toPublicUser(u);
};
