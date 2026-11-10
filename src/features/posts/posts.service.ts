import {
  type AnyColumn,
  type SQL,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lte,
  sql,
} from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type { SortOrder } from "~/lib/list-sort";
import type { PostSortBy } from "./posts.schema";
import type {
  CreatePostService,
  DeletePostService,
  GetPostService,
  ListPostsService,
  PostDto,
  UpdatePostService,
} from "./posts.types";

/**
 * 可排序列 → 数据库列。
 *
 * sortBy 只接受 schema 里枚举过的值，这里再映射一次到真实列，
 * 保证任意字符串进不了 orderBy。
 */
const POST_SORT_COLUMNS: Record<PostSortBy, AnyColumn> = {
  createdAt: schema.post.createdAt,
  updatedAt: schema.post.updatedAt,
  name: schema.post.name,
  sort: schema.post.sort,
};

/**
 * 列表排序。
 *
 * 缺省语义沿用旧列表：按 sort 升序、createdAt 升序。
 * 非 createdAt/updatedAt 列排序时，createdAt 升序作为稳定的次级排序键。
 */
function postOrderBy(sortBy: PostSortBy | undefined, sortOrder: SortOrder | undefined) {
  const column = POST_SORT_COLUMNS[sortBy ?? "sort"] ?? POST_SORT_COLUMNS.sort;
  const primary = sortOrder === "desc" ? desc(column) : asc(column);
  if (sortBy === "createdAt" || sortBy === "updatedAt") return [primary];
  return [primary, asc(schema.post.createdAt)];
}

function toDto(
  row: typeof schema.post.$inferSelect,
  departmentName: string,
  userCount: number,
): PostDto {
  return {
    id: row.id,
    name: row.name,
    departmentId: row.departmentId,
    departmentName,
    sort: row.sort,
    status: row.status,
    userCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getDepartmentNameMap(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const rows = await getDb()
    .select({ id: schema.department.id, name: schema.department.name })
    .from(schema.department)
    .where(inArray(schema.department.id, ids));
  for (const r of rows) map.set(r.id, r.name);
  return map;
}

async function getUserCountMap(postIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (postIds.length === 0) return map;
  const rows = await getDb()
    .select({
      postId: schema.userPost.postId,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.userPost)
    .where(inArray(schema.userPost.postId, postIds))
    .groupBy(schema.userPost.postId);
  for (const r of rows) map.set(r.postId, Number(r.count));
  return map;
}

export const listPostsService: ListPostsService = async ({
  page,
  pageSize,
  keyword,
  departmentId,
  sortMin,
  status,
  createdFrom,
  createdTo,
  sortBy,
  sortOrder,
}) => {
  const where: SQL[] = [isNull(schema.post.deletedAt)];
  if (status) where.push(eq(schema.post.status, status));
  if (keyword) where.push(like(schema.post.name, `%${keyword}%`));
  if (departmentId) where.push(eq(schema.post.departmentId, departmentId));
  if (typeof sortMin === "number") where.push(gte(schema.post.sort, sortMin));
  if (createdFrom) where.push(gte(schema.post.createdAt, new Date(createdFrom)));
  if (createdTo) where.push(lte(schema.post.createdAt, new Date(createdTo)));
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.post)
      .where(and(...where))
      .orderBy(...postOrderBy(sortBy, sortOrder))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.post)
      .where(and(...where)),
  ]);
  const ids = rows.map((r) => r.id);
  const departmentIds = Array.from(new Set(rows.map((r) => r.departmentId)));
  const [departmentMap, userMap] = await Promise.all([
    getDepartmentNameMap(departmentIds),
    getUserCountMap(ids),
  ]);
  return {
    items: rows.map((r) =>
      toDto(r, departmentMap.get(r.departmentId) ?? "—", userMap.get(r.id) ?? 0),
    ),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

export const getPostService: GetPostService = async (id) => {
  const rows = await getDb()
    .select()
    .from(schema.post)
    .where(and(eq(schema.post.id, id), isNull(schema.post.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const [departmentMap, userMap] = await Promise.all([
    getDepartmentNameMap([row.departmentId]),
    getUserCountMap([row.id]),
  ]);
  return toDto(row, departmentMap.get(row.departmentId) ?? "—", userMap.get(row.id) ?? 0);
};

export const createPostService: CreatePostService = async (input) => {
  const db = getDb();
  const dept = await db
    .select({ id: schema.department.id })
    .from(schema.department)
    .where(and(eq(schema.department.id, input.departmentId), isNull(schema.department.deletedAt)))
    .limit(1);
  if (!dept[0]) throw Errors.notFound("所属部门不存在");

  const rows = await db
    .insert(schema.post)
    .values({
      name: input.name,
      departmentId: input.departmentId,
      sort: input.sort ?? 0,
      status: input.status ?? "enabled",
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建岗位失败");
  const [departmentMap, userMap] = await Promise.all([
    getDepartmentNameMap([row.departmentId]),
    getUserCountMap([row.id]),
  ]);
  return toDto(row, departmentMap.get(row.departmentId) ?? "—", userMap.get(row.id) ?? 0);
};

export const updatePostService: UpdatePostService = async (id, input) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.post)
    .where(and(eq(schema.post.id, id), isNull(schema.post.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("岗位不存在");

  if (input.departmentId !== undefined && input.departmentId !== existing[0].departmentId) {
    const dept = await db
      .select({ id: schema.department.id })
      .from(schema.department)
      .where(and(eq(schema.department.id, input.departmentId), isNull(schema.department.deletedAt)))
      .limit(1);
    if (!dept[0]) throw Errors.notFound("所属部门不存在");
  }

  const patch: Partial<typeof schema.post.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.departmentId !== undefined) patch.departmentId = input.departmentId;
  if (input.sort !== undefined) patch.sort = input.sort;
  if (input.status !== undefined) patch.status = input.status;

  if (Object.keys(patch).length > 0) {
    await db.update(schema.post).set(patch).where(eq(schema.post.id, id));
  }

  const refreshed = await db.select().from(schema.post).where(eq(schema.post.id, id)).limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("岗位不存在");
  const [departmentMap, userMap] = await Promise.all([
    getDepartmentNameMap([row.departmentId]),
    getUserCountMap([row.id]),
  ]);
  return toDto(row, departmentMap.get(row.departmentId) ?? "—", userMap.get(row.id) ?? 0);
};

export const deletePostService: DeletePostService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.post)
    .where(and(eq(schema.post.id, id), isNull(schema.post.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("岗位不存在");
  await db.update(schema.post).set({ deletedAt: new Date() }).where(eq(schema.post.id, id));
  return { ok: true };
};

export async function getPostDepartmentOptionsService() {
  return getDb()
    .select({
      id: schema.department.id,
      name: schema.department.name,
      status: schema.department.status,
    })
    .from(schema.department)
    .where(isNull(schema.department.deletedAt))
    .orderBy(asc(schema.department.sort), asc(schema.department.id));
}
