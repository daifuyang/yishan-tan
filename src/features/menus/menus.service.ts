import { type SQL, and, asc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import type {
  CreateMenuService,
  DeleteMenuService,
  GetAuthorizedMenuPathsService,
  GetAuthorizedMenuTreeService,
  GetMenuTreeService,
  ListMenusService,
  MenuDto,
  MenuNode,
  UpdateMenuService,
} from "./menus.types";

function toDto(row: typeof schema.menu.$inferSelect): MenuDto {
  return {
    id: row.id,
    parentId: row.parentId,
    name: row.name,
    path: row.path,
    component: row.component,
    icon: row.icon,
    type: row.type,
    permission: row.permission,
    sort: row.sort,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildTree(items: MenuDto[]): MenuNode[] {
  const map = new Map<string, MenuNode>(items.map((i) => [i.id, { ...i, children: [] }]));
  const roots: MenuNode[] = [];
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

export { buildTree };

export const listMenusService: ListMenusService = async ({
  page,
  pageSize,
  keyword,
  status,
  type,
}) => {
  const where: SQL[] = [isNull(schema.menu.deletedAt)];
  if (status) where.push(eq(schema.menu.status, status));
  if (type) where.push(eq(schema.menu.type, type));
  if (keyword) {
    const cond = or(
      like(schema.menu.name, `%${keyword}%`),
      like(schema.menu.path, `%${keyword}%`),
      like(schema.menu.permission, `%${keyword}%`),
    );
    if (cond) where.push(cond);
  }
  const offset = (page - 1) * pageSize;
  const [rows, totalRow] = await Promise.all([
    getDb()
      .select()
      .from(schema.menu)
      .where(and(...where))
      .orderBy(asc(schema.menu.sort), asc(schema.menu.createdAt))
      .limit(pageSize)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.menu)
      .where(and(...where)),
  ]);
  return { items: rows.map(toDto), total: Number(totalRow[0]?.count ?? 0) };
};

export const getMenuTreeService: GetMenuTreeService = async () => {
  const rows = await getDb()
    .select()
    .from(schema.menu)
    .where(isNull(schema.menu.deletedAt))
    .orderBy(asc(schema.menu.sort), asc(schema.menu.createdAt));
  return buildTree(rows.map(toDto));
};

export const getAuthorizedMenuTreeService: GetAuthorizedMenuTreeService = async (userId) => {
  const roleIds = await getDb()
    .select({ roleId: schema.userRole.roleId })
    .from(schema.userRole)
    .where(eq(schema.userRole.userId, userId));
  if (roleIds.length === 0) return [];
  const ids = roleIds.map((r) => r.roleId);
  const menuIds = await getDb()
    .selectDistinct({ menuId: schema.roleMenu.menuId })
    .from(schema.roleMenu)
    .where(inArray(schema.roleMenu.roleId, ids));
  if (menuIds.length === 0) return [];
  const mIds = menuIds.map((m) => m.menuId);
  const rows = await getDb()
    .select()
    .from(schema.menu)
    .where(
      and(
        inArray(schema.menu.id, mIds),
        eq(schema.menu.status, "enabled"),
        isNull(schema.menu.deletedAt),
      ),
    )
    .orderBy(asc(schema.menu.sort), asc(schema.menu.createdAt));
  return buildTree(rows.map(toDto));
};

export const getAuthorizedMenuPathsService: GetAuthorizedMenuPathsService = async (userId) => {
  const tree = await getAuthorizedMenuTreeService(userId);
  return collectMenuPaths(tree);
};

export function collectMenuPaths(nodes: MenuNode[]): string[] {
  const paths = new Set<string>();
  const walk = (items: MenuNode[]) => {
    for (const n of items) {
      if (n.path) paths.add(n.path);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return Array.from(paths);
}

export const createMenuService: CreateMenuService = async (input) => {
  const db = getDb();
  if (input.parentId) {
    const parent = await db
      .select({ id: schema.menu.id })
      .from(schema.menu)
      .where(and(eq(schema.menu.id, input.parentId), isNull(schema.menu.deletedAt)))
      .limit(1);
    if (!parent[0]) throw Errors.notFound("上级菜单不存在");
  }
  const rows = await db
    .insert(schema.menu)
    .values({
      parentId: input.parentId ?? null,
      name: input.name,
      path: input.path ?? null,
      component: input.component ?? null,
      icon: input.icon ?? null,
      type: input.type ?? "menu",
      permission: input.permission ?? null,
      sort: input.sort ?? 0,
      status: input.status ?? "enabled",
    })
    .returning();
  const row = rows[0];
  if (!row) throw Errors.internal("创建菜单失败");
  return toDto(row);
};

export const updateMenuService: UpdateMenuService = async (id, input) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.menu)
    .where(and(eq(schema.menu.id, id), isNull(schema.menu.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("菜单不存在");
  if (input.parentId && input.parentId === id) {
    throw Errors.invalid("上级菜单不能为自身");
  }
  const patch: Partial<typeof schema.menu.$inferInsert> = {};
  if (input.parentId !== undefined) patch.parentId = input.parentId;
  if (input.name !== undefined) patch.name = input.name;
  if (input.path !== undefined) patch.path = input.path;
  if (input.component !== undefined) patch.component = input.component;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.type !== undefined) patch.type = input.type;
  if (input.permission !== undefined) patch.permission = input.permission;
  if (input.sort !== undefined) patch.sort = input.sort;
  if (input.status !== undefined) patch.status = input.status;
  if (Object.keys(patch).length > 0) {
    await db.update(schema.menu).set(patch).where(eq(schema.menu.id, id));
  }
  const refreshed = await db.select().from(schema.menu).where(eq(schema.menu.id, id)).limit(1);
  const row = refreshed[0];
  if (!row) throw Errors.notFound("菜单不存在");
  return toDto(row);
};

/**
 * 顶级系统菜单白名单（dashboard / system）：删除会破坏 sidebar 骨架，
 * 必须在 service 层 hard-block。子菜单由 name 标识（如「工作台」「系统管理」）。
 * 若 seed 调整顶层菜单名，这里要同步。
 */
const PROTECTED_TOP_MENU_NAMES = new Set(["工作台", "系统管理"]);

export const deleteMenuService: DeleteMenuService = async (id) => {
  const db = getDb();
  const existing = await db
    .select()
    .from(schema.menu)
    .where(and(eq(schema.menu.id, id), isNull(schema.menu.deletedAt)))
    .limit(1);
  if (!existing[0]) throw Errors.notFound("菜单不存在");
  const row = existing[0];
  if (row.parentId === null && PROTECTED_TOP_MENU_NAMES.has(row.name)) {
    throw Errors.forbidden("系统核心菜单不可删除");
  }

  const child = await db
    .select({ id: schema.menu.id })
    .from(schema.menu)
    .where(and(eq(schema.menu.parentId, id), isNull(schema.menu.deletedAt)))
    .limit(1);
  if (child[0]) throw Errors.conflict("存在子菜单，无法删除");

  const bound = await db
    .select({ roleId: schema.roleMenu.roleId })
    .from(schema.roleMenu)
    .where(eq(schema.roleMenu.menuId, id))
    .limit(1);
  if (bound[0]) throw Errors.conflict("仍有角色绑定此菜单，无法删除");

  await db.update(schema.menu).set({ deletedAt: new Date() }).where(eq(schema.menu.id, id));
  return { ok: true };
};
