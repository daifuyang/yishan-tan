import { type SQL, and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import type { ListLoginLogsService, LoginLogDto } from "./login-logs.types";

function toDto(row: typeof schema.loginLog.$inferSelect): LoginLogDto {
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    status: row.status as "success" | "failed",
    message: row.message,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/**
 * 拼装列表查询的 WHERE 链。导出用于单测，纯函数、不触达 db。
 */
export function buildListLoginLogsWhere(input: {
  keyword?: string;
  status?: "success" | "failed";
  userId?: string;
  createdFrom?: string;
  createdTo?: string;
}): SQL[] {
  const where: SQL[] = [];
  if (input.keyword) {
    where.push(like(schema.loginLog.username, `%${input.keyword}%`));
  }
  if (input.status) {
    where.push(eq(schema.loginLog.status, input.status));
  }
  if (input.userId) {
    where.push(eq(schema.loginLog.userId, input.userId));
  }
  const from = parseDate(input.createdFrom);
  if (from) {
    where.push(gte(schema.loginLog.createdAt, from));
  }
  const to = parseDate(input.createdTo);
  if (to) {
    where.push(lte(schema.loginLog.createdAt, to));
  }
  return where;
}

export const listAllLoginLogsService: ListLoginLogsService = async ({
  page,
  pageSize,
  keyword,
  status,
  userId,
  createdFrom,
  createdTo,
}) => {
  const where = buildListLoginLogsWhere({ keyword, status, userId, createdFrom, createdTo });
  const whereClause = where.length > 0 ? and(...where) : undefined;
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.loginLog)
      .where(whereClause)
      .orderBy(desc(schema.loginLog.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb().select({ count: sql<number>`count(*)::int` }).from(schema.loginLog).where(whereClause),
  ]);
  return {
    items: rows.map(toDto),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export { toDto as toLoginLogDto };
