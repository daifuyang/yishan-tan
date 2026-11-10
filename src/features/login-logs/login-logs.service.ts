import {
  type AnyColumn,
  type SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  like,
  lte,
  sql,
} from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import type { SortOrder } from "~/lib/list-sort";
import type { LoginLogSortBy } from "./login-logs.schema";
import type { ListLoginLogsService, LoginLogDto } from "./login-logs.types";

/**
 * 可排序列 → 数据库列。
 *
 * sortBy 只接受 schema 里枚举过的值，这里再映射一次到真实列，
 * 保证任意字符串进不了 orderBy。
 */
const LOGIN_LOG_SORT_COLUMNS: Record<LoginLogSortBy, AnyColumn> = {
  createdAt: schema.loginLog.createdAt,
  username: schema.loginLog.username,
  status: schema.loginLog.status,
};

function loginLogOrderBy(sortBy: LoginLogSortBy | undefined, sortOrder: SortOrder | undefined) {
  const column = LOGIN_LOG_SORT_COLUMNS[sortBy ?? "createdAt"] ?? LOGIN_LOG_SORT_COLUMNS.createdAt;
  return sortOrder === "asc" ? asc(column) : desc(column);
}

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
  ipAddress?: string;
  userAgent?: string;
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
  // IP / User Agent 走服务端模糊匹配：筛选与 total 覆盖全部数据，
  // 不再出现「总数非零但当前页为空」。
  if (input.ipAddress) {
    where.push(ilike(schema.loginLog.ipAddress, `%${input.ipAddress}%`));
  }
  if (input.userAgent) {
    where.push(ilike(schema.loginLog.userAgent, `%${input.userAgent}%`));
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
  ipAddress,
  userAgent,
  createdFrom,
  createdTo,
  sortBy,
  sortOrder,
}) => {
  const where = buildListLoginLogsWhere({
    keyword,
    status,
    userId,
    ipAddress,
    userAgent,
    createdFrom,
    createdTo,
  });
  const whereClause = where.length > 0 ? and(...where) : undefined;
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.loginLog)
      .where(whereClause)
      .orderBy(loginLogOrderBy(sortBy, sortOrder))
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
