import { and, eq, inArray, isNull } from "drizzle-orm";
import * as schema from "~/../db/schema";
import { getDepartmentTreeService } from "~/features/departments/departments.service";
import { SYSTEM_ADMIN_IDS, isSystemAdmin } from "~/lib/authorization.server";
import { getDb } from "~/lib/db.server";
import { Errors } from "~/lib/errors";
import { PERMISSION_CODES, type PermissionCode, isPermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

// Always read current assignments. Revocation and role disabling must apply to the next request.
export async function getUserPermissionsService(ctx: ServiceContext): Promise<PermissionCode[]> {
  if (isSystemAdmin(ctx)) return [...PERMISSION_CODES];
  // Scoped API-key delegation belongs to the account module; do not widen existing key privileges.
  if (ctx.authKind !== "session") return [];
  const rows = await getDb()
    .select({ code: schema.rolePermission.permissionCode })
    .from(schema.userRole)
    .innerJoin(schema.user, eq(schema.user.id, schema.userRole.userId))
    .innerJoin(schema.role, eq(schema.role.id, schema.userRole.roleId))
    .innerJoin(schema.rolePermission, eq(schema.rolePermission.roleId, schema.role.id))
    .where(
      and(
        eq(schema.user.id, ctx.userId),
        isNull(schema.user.deletedAt),
        eq(schema.role.status, "enabled"),
        isNull(schema.role.deletedAt),
      ),
    );
  return [...new Set(rows.map((row) => row.code).filter(isPermissionCode))];
}

export async function assertPermissionService(
  ctx: ServiceContext,
  code: PermissionCode,
): Promise<void> {
  if (!(await getUserPermissionsService(ctx)).includes(code))
    throw Errors.forbidden("没有该操作权限");
}

export async function assertAssignablePermissionCodesService(
  ctx: ServiceContext,
  permissionCodes: PermissionCode[],
): Promise<void> {
  if (isSystemAdmin(ctx) || permissionCodes.length === 0) return;
  const allowed = new Set(await getUserPermissionsService(ctx));
  if (permissionCodes.some((code) => !allowed.has(code))) {
    throw Errors.forbidden("不能授予超出自身权限的操作权限");
  }
}

export async function assertUserTargetService(ctx: ServiceContext, id: string): Promise<void> {
  const [target] = await getDb()
    .select({ id: schema.user.id, role: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, id))
    .limit(1);
  if (!target) throw Errors.notFound("用户不存在");
  if (!isSystemAdmin(ctx) && (target.role === "admin" || SYSTEM_ADMIN_IDS.includes(id))) {
    throw Errors.forbidden("不能修改超级管理员");
  }
}

export async function assertAssignableRolesService(
  ctx: ServiceContext,
  roleIds: string[],
): Promise<void> {
  if (!isSystemAdmin(ctx)) await assertPermissionService(ctx, "users:assign-roles");
  if (roleIds.length === 0) return;
  const ids = [...new Set(roleIds)];
  const roles = await getDb()
    .select({ id: schema.role.id, system: schema.role.isSystemDefault })
    .from(schema.role)
    .where(
      and(
        inArray(schema.role.id, ids),
        eq(schema.role.status, "enabled"),
        isNull(schema.role.deletedAt),
      ),
    );
  if (roles.length !== ids.length) throw Errors.invalid("业务角色不存在或已禁用");
  if (isSystemAdmin(ctx)) return;
  await assertPermissionService(ctx, "users:assign-roles");
  if (roles.some((role) => role.system)) throw Errors.forbidden("不能分配系统角色");
  const allowed = new Set(await getUserPermissionsService(ctx));
  const grants = await getDb()
    .select({ code: schema.rolePermission.permissionCode })
    .from(schema.rolePermission)
    .where(inArray(schema.rolePermission.roleId, ids));
  if (grants.some((grant) => !isPermissionCode(grant.code) || !allowed.has(grant.code))) {
    throw Errors.forbidden("不能分配超出自身权限的角色");
  }
}

export async function getUserFormOptionsService(ctx: ServiceContext) {
  const grants = await getUserPermissionsService(ctx);
  if (
    !grants.includes("users:read") ||
    (!grants.includes("users:create") && !grants.includes("users:update"))
  ) {
    throw Errors.forbidden("没有编辑用户权限");
  }
  const [roles, departments, posts] = await Promise.all([
    getDb()
      .select({
        id: schema.role.id,
        name: schema.role.name,
        isSystemDefault: schema.role.isSystemDefault,
      })
      .from(schema.role)
      .where(and(eq(schema.role.status, "enabled"), isNull(schema.role.deletedAt))),
    getDepartmentTreeService(),
    getDb()
      .select({
        id: schema.post.id,
        name: schema.post.name,
        departmentId: schema.post.departmentId,
        departmentName: schema.department.name,
        status: schema.post.status,
      })
      .from(schema.post)
      .innerJoin(schema.department, eq(schema.department.id, schema.post.departmentId))
      .where(and(eq(schema.post.status, "enabled"), isNull(schema.post.deletedAt))),
  ]);
  if (isSystemAdmin(ctx)) return { roles, departments, posts };
  if (!grants.includes("users:assign-roles")) return { roles: [], departments, posts };
  const permissions = await getDb().select().from(schema.rolePermission);
  const allowed = new Set(grants);
  return {
    roles: roles.filter(
      (role) =>
        !role.isSystemDefault &&
        permissions
          .filter((p) => p.roleId === role.id)
          .every((p) => isPermissionCode(p.permissionCode) && allowed.has(p.permissionCode)),
    ),
    departments,
    posts,
  };
}
