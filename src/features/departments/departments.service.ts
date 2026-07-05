import { type SQL, and, asc, eq, isNull, like, or, sql } from "drizzle-orm";
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

function toDto(row: typeof schema.department.$inferSelect): DepartmentDto {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    code: row.code,
    sort: row.sort,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const listDepartmentsService: ListDepartmentsService = async ({
  page,
  pageSize,
  keyword,
  status,
}) => {
  const where: SQL[] = [isNull(schema.department.deletedAt)];
  if (status) where.push(eq(schema.department.status, status));
  if (keyword) {
    const cond = or(
      like(schema.department.name, `%${keyword}%`),
      like(schema.department.code, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.department)
      .where(and(...where))
      .orderBy(asc(schema.department.sort), asc(schema.department.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.department)
      .where(and(...where)),
  ]);
  return { items: rows.map(toDto), total: Number(totalRow[0]?.count ?? 0) };
};

export const getDepartmentTreeService: GetDepartmentTreeService = async () => {
  const rows = await getDb()
    .select()
    .from(schema.department)
    .where(isNull(schema.department.deletedAt))
    .orderBy(asc(schema.department.sort), asc(schema.department.createdAt));
  return buildDepartmentTree(rows.map(toDto));
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
  const rows = await getDb()
    .select()
    .from(schema.department)
    .where(and(eq(schema.department.id, id), isNull(schema.department.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return toDto(row);
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

  const existing = await db
    .select({ id: schema.department.id })
    .from(schema.department)
    .where(eq(schema.department.code, input.code))
    .limit(1);
  if (existing[0]) throw Errors.conflict("部门编码已存在");

  const rows = await db
    .insert(schema.department)
    .values({
      parentId: input.parentId ?? null,
      name: input.name,
      code: input.code,
      sort: input.sort ?? 0,
      status: input.status ?? "enabled",
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建部门失败");
  return toDto(row);
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

  const patch: Partial<typeof schema.department.$inferInsert> = {};
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.name !== undefined) patch.name = input.name;
  if (input.sort !== undefined) patch.sort = input.sort;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.department).set(patch).where(eq(schema.department.id, id));
  }
  const refreshed = await db
    .select()
    .from(schema.department)
    .where(eq(schema.department.id, id))
    .limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("部门不存在");
  return toDto(row);
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
