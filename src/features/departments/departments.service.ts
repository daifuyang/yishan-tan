import { type SQL, and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  CreateDepartmentService,
  DeleteDepartmentService,
  DepartmentDto,
  DepartmentNode,
  GetDepartmentService,
  GetDepartmentTreeService,
  ListDepartmentsService,
  UpdateDepartmentService,
} from "./departments.types";

/**
 * 单行映射：department 主行 + LEFT JOIN 父部门(取 parentName)+ LEFT JOIN 用户(取 leaderName)。
 * 三个表都是可选,本函数对 null 都安全。
 */
type DepartmentRow = {
  id: string;
  parentId: string | null;
  name: string;
  leaderId: string | null;
  sort: number;
  status: "enabled" | "disabled";
  createdAt: Date;
  updatedAt: Date;
  parentName: string | null;
  leaderName: string | null;
};

function toDto(row: DepartmentRow): DepartmentDto {
  return {
    id: row.id,
    parentId: row.parentId,
    parentName: row.parentName,
    name: row.name,
    leaderId: row.leaderId,
    leaderName: row.leaderName,
    sort: row.sort,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildQuery(where: SQL[] = []) {
  const parent = alias(schema.department, "parent_dept");
  const leader = alias(schema.user, "leader_user");
  const baseQuery = getDb()
    .select({
      id: schema.department.id,
      parentId: schema.department.parentId,
      name: schema.department.name,
      leaderId: schema.department.leaderId,
      sort: schema.department.sort,
      status: schema.department.status,
      createdAt: schema.department.createdAt,
      updatedAt: schema.department.updatedAt,
      parentName: parent.name,
      leaderName: leader.username,
    })
    .from(schema.department)
    .leftJoin(parent, eq(parent.id, schema.department.parentId))
    .leftJoin(leader, eq(leader.id, schema.department.leaderId));
  if (where.length > 0) baseQuery.where(and(...where));
  return baseQuery;
}

export const listDepartmentsService: ListDepartmentsService = async ({
  page,
  pageSize,
  name,
  status,
}) => {
  const where = buildDepartmentListWhere({ name, status });
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    buildQuery(where)
      .orderBy(asc(schema.department.sort), asc(schema.department.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.department)
      .where(and(...where)),
  ]);
  return {
    items: rows.map((r) => toDto(r as DepartmentRow)),
    total: Number(totalRow[0]?.count ?? 0),
  };
};

/**
 * 提取 listDepartmentsService 与 exportDepartmentsService 共享的 where-clause 构建。
 */
function buildDepartmentListWhere(input: {
  name?: string;
  status?: "enabled" | "disabled";
}): SQL[] {
  const where: SQL[] = [isNull(schema.department.deletedAt)];
  if (input.status) where.push(eq(schema.department.status, input.status));
  if (input.name) {
    const cond = or(like(schema.department.name, `%${input.name}%`));
    if (cond) where.push(cond);
  }
  return where;
}

/**
 * 导出当前筛选条件下全部部门为 CSV（不带分页）。
 * 与 listDepartmentsService 共用 buildDepartmentListWhere 保证语义一致。
 */
export const exportDepartmentsService = async (input: {
  name?: string;
  status?: "enabled" | "disabled";
}): Promise<string> => {
  const where = buildDepartmentListWhere(input);
  const rows = await buildQuery(where).orderBy(
    asc(schema.department.sort),
    asc(schema.department.createdAt),
  );
  const headers = ["部门名称", "上级部门", "负责人", "排序", "状态", "创建时间"];
  const csvEscape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows as DepartmentRow[]) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.parentName),
        csvEscape(r.leaderName),
        csvEscape(r.sort),
        csvEscape(r.status === "enabled" ? "启用" : "已禁用"),
        csvEscape(r.createdAt.toISOString().slice(0, 19).replace("T", " ")),
      ].join(","),
    );
  }
  // UTF-8 BOM：让 Excel 直接识别中文不乱码
  return `﻿${lines.join("\r\n")}`;
};

export const getDepartmentTreeService: GetDepartmentTreeService = async () => {
  const rows = await buildQuery().orderBy(
    asc(schema.department.sort),
    asc(schema.department.createdAt),
  );
  return buildDepartmentTree(rows.map((r) => toDto(r as DepartmentRow)));
};

export function buildDepartmentTree(items: DepartmentDto[]): DepartmentNode[] {
  const map = new Map<string, DepartmentNode>(items.map((i) => [i.id, { ...i, children: [] }]));
  const roots: DepartmentNode[] = [];
  for (const item of items) {
    const node = map.get(item.id);
    if (!node) continue;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function isDescendantOf(candidateId: string, ancestorId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: schema.department.id, parentId: schema.department.parentId })
    .from(schema.department)
    .where(isNull(schema.department.deletedAt));
  return isDescendantOfInList(candidateId, ancestorId, rows);
}

export function isDescendantOfInList(
  candidateId: string,
  ancestorId: string,
  rows: Array<{ id: string; parentId: string | null }>,
): boolean {
  if (candidateId === ancestorId) return false;
  const childMap = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parentId) continue;
    const list = childMap.get(r.parentId) ?? [];
    list.push(r.id);
    childMap.set(r.parentId, list);
  }
  const queue: string[] = [ancestorId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);
    if (cur === candidateId) return true;
    const kids = childMap.get(cur) ?? [];
    for (const k of kids) queue.push(k);
  }
  return false;
}

export const getDepartmentService: GetDepartmentService = async (id) => {
  const rows = await buildQuery()
    .where(and(eq(schema.department.id, id), isNull(schema.department.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toDto(row as DepartmentRow);
};

export const createDepartmentService: CreateDepartmentService = async (input) => {
  const db = getDb();
  if (input.parentId) {
    const parent = await db
      .select({ id: schema.department.id })
      .from(schema.department)
      .where(and(eq(schema.department.id, input.parentId), isNull(schema.department.deletedAt)))
      .limit(1);
    if (!parent[0]) throw Errors.notFound("上级部门不存在");
  }
  if (input.leaderId) {
    const leader = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, input.leaderId))
      .limit(1);
    if (!leader[0]) throw Errors.notFound("负责人用户不存在");
  }

  const rows = await db
    .insert(schema.department)
    .values({
      parentId: input.parentId ?? null,
      name: input.name,
      leaderId: input.leaderId ?? null,
      sort: input.sort ?? 0,
      status: input.status ?? "enabled",
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建部门失败");
  // 重新查询以填充 parentName / leaderName
  const enriched = await buildQuery().where(eq(schema.department.id, row.id)).limit(1);
  if (!enriched[0]) throw Errors.internal("创建部门失败");
  return toDto(enriched[0] as DepartmentRow);
};

export const updateDepartmentService: UpdateDepartmentService = async (id, input) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.department)
    .where(and(eq(schema.department.id, id), isNull(schema.department.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("部门不存在");

  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === id) {
      throw Errors.invalid("上级部门不能为自身");
    }
    const parent = await db
      .select({ id: schema.department.id })
      .from(schema.department)
      .where(and(eq(schema.department.id, input.parentId), isNull(schema.department.deletedAt)))
      .limit(1);
    if (!parent[0]) throw Errors.notFound("上级部门不存在");
    if (await isDescendantOf(input.parentId, id)) {
      throw Errors.invalid("上级部门不能为自身或下级部门");
    }
  }

  if (input.leaderId !== undefined && input.leaderId !== null) {
    const leader = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, input.leaderId))
      .limit(1);
    if (!leader[0]) throw Errors.notFound("负责人用户不存在");
  }

  const patch: Partial<typeof schema.department.$inferInsert> = {};
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.name !== undefined) patch.name = input.name;
  if (input.leaderId !== undefined) patch.leaderId = input.leaderId;
  if (input.sort !== undefined) patch.sort = input.sort;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.department).set(patch).where(eq(schema.department.id, id));
  }
  const refreshed = await buildQuery().where(eq(schema.department.id, id)).limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("部门不存在");
  return toDto(row as DepartmentRow);
};

export const deleteDepartmentService: DeleteDepartmentService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.department)
    .where(and(eq(schema.department.id, id), isNull(schema.department.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("部门不存在");

  const child = await db
    .select({ id: schema.department.id })
    .from(schema.department)
    .where(and(eq(schema.department.parentId, id), isNull(schema.department.deletedAt)))
    .limit(1);
  if (child[0]) throw Errors.conflict("存在下级部门，无法删除");

  await db
    .update(schema.department)
    .set({ deletedAt: new Date() })
    .where(eq(schema.department.id, id));
  return { ok: true };
};
