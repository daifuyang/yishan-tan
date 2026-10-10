import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { type PgliteDatabase, drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "~/../db/schema";
import type { ServiceContext } from "~/lib/service-context";

let db: PgliteDatabase;
let client: PGlite;
let requestContext: ServiceContext | null;
vi.mock("~/lib/db.server", () => ({ getDb: () => db }));
vi.mock("~/lib/auth.server", () => ({ auth: {} }));
vi.mock("~/server/request-context", () => ({
  contextFromRequest: async () => requestContext,
  requireRequestContext: async () => {
    if (!requestContext) {
      const { Errors } = await import("~/lib/errors");
      throw Errors.unauthenticated();
    }
    return requestContext;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeaders: () => new Headers() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let schema: { parse: (input: unknown) => unknown } | undefined;
    const builder = {
      validator: (input: typeof schema) => {
        schema = input;
        return builder;
      },
      handler: (handler: (input: { data: unknown }) => unknown) => (input?: { data?: unknown }) =>
        handler({ data: schema ? schema.parse(input?.data) : input?.data }),
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

const {
  assertAssignableRolesService,
  assertPermissionService,
  assertUserTargetService,
  getUserPermissionsService,
  getUserFormOptionsService,
} = await import("./permissions.service");
const { createRoleService, updateRoleService, getRoleService } = await import(
  "~/features/roles/roles.service"
);
const { createMenuService, updateMenuService, getMenuTreeService, getAuthorizedMenuPathsService } =
  await import("~/features/menus/menus.service");
const { assertUserOperation } = await import("~/features/users/users.policy");
const userActions = await import("~/features/users/users.actions");
const authActions = await import("~/features/auth/auth.actions");
const { Route: listRoute } = await import("~/routes/api/v1/users/index");
const { Route: detailRoute } = await import("~/routes/api/v1/users/$id");
const { Route: createRoute } = await import("~/routes/api/v1/users");
type TestRoute = {
  options: {
    server: {
      handlers: Record<
        "GET" | "POST" | "PATCH" | "DELETE",
        (input: { request: Request; params: { id: string } }) => Promise<Response>
      >;
    };
  };
};
function handlers(route: unknown) {
  return (route as TestRoute).options.server.handlers;
}

const adminId = "10000000-0000-4000-8000-000000000001";
const memberId = "10000000-0000-4000-8000-000000000002";
const targetId = "10000000-0000-4000-8000-000000000003";
const roleId = "20000000-0000-4000-8000-000000000001";
const ctx: ServiceContext = {
  userId: memberId,
  role: "member",
  authKind: "session",
  headers: new Headers(),
};
const admin: ServiceContext = { ...ctx, userId: adminId, role: "admin" };

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client);
  for (const file of readdirSync("db/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    await client.exec(readFileSync(`db/migrations/${file}`, "utf8"));
  }
}, 30_000);
afterAll(async () => {
  await client?.close();
});
beforeEach(async () => {
  requestContext = ctx;
  await client.exec('TRUNCATE "user", "role", "menu" CASCADE');
  await db.insert(schema.user).values([
    { id: adminId, username: "admin", email: "admin@example.test", name: "Admin", role: "admin" },
    {
      id: memberId,
      username: "reader",
      email: "reader@example.test",
      name: "Reader",
      role: "member",
    },
    {
      id: targetId,
      username: "target",
      email: "target@example.test",
      name: "Target",
      role: "member",
    },
  ]);
  await db.insert(schema.role).values({ id: roleId, name: "Reader" });
  await db.insert(schema.userRole).values({ userId: memberId, roleId });
  await db.insert(schema.rolePermission).values({ roleId, permissionCode: "users:read" });
});

describe("permissions on isolated PostgreSQL", () => {
  it("enforces REST read/write checks and blocks anonymous role-bearing registration", async () => {
    const request = new Request("http://localhost/api/v1/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Changed" }),
    });
    const input = { request, params: { id: targetId } };
    expect((await handlers(listRoute).GET(input)).status).toBe(200);
    expect((await handlers(detailRoute).GET(input)).status).toBe(200);
    expect((await handlers(detailRoute).PATCH(input)).status).toBe(403);
    expect((await handlers(detailRoute).DELETE(input)).status).toBe(403);
    expect((await handlers(createRoute).POST(input)).status).toBe(403);
    requestContext = null;
    expect((await handlers(createRoute).POST(input)).status).toBe(401);
    expect((await handlers(listRoute).GET(input)).status).toBe(401);
    expect((await db.select().from(schema.user).where(eq(schema.user.id, targetId)))[0]?.name).toBe(
      "Target",
    );
  });
  it("enforces the same permissions in Server Function handlers including export/reset/create", async () => {
    expect((await userActions.listUsers({ data: { page: 1, pageSize: 20 } })).total).toBe(3);
    await expect(
      userActions.updateUser({ data: { id: targetId, name: "Changed" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userActions.deleteUser({ data: { id: targetId } })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      userActions.resetUserPassword({ data: { userId: targetId } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(userActions.exportUsers({ data: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      authActions.createUser({
        data: { username: "newuser", email: "new@example.test", password: "LongPassword1" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows delegated updates through both entries and rejects role edits without permission", async () => {
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "users:update" });
    await userActions.updateUser({ data: { id: targetId, name: "RPC" } });
    const request = new Request("http://localhost/api/v1/users/target", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "REST" }),
    });
    expect((await handlers(detailRoute).PATCH({ request, params: { id: targetId } })).status).toBe(
      200,
    );
    expect((await db.select().from(schema.user).where(eq(schema.user.id, targetId)))[0]?.name).toBe(
      "REST",
    );
    await expect(
      userActions.updateUser({ data: { id: targetId, roleIds: [] } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      userActions.updateUser({ data: { id: adminId, email: "hijack@example.test" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("allows reads and rejects every ungranted write", async () => {
    await expect(assertUserOperation(ctx, "users:read")).resolves.toBeUndefined();
    for (const code of [
      "users:create",
      "users:update",
      "users:delete",
      "users:export",
      "users:reset-password",
      "users:assign-roles",
    ] as const) {
      await expect(assertUserOperation(ctx, code)).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
  it("applies grant revocation and disabled/deleted roles on the next request", async () => {
    await db.delete(schema.rolePermission).where(eq(schema.rolePermission.roleId, roleId));
    expect(await getUserPermissionsService(ctx)).toEqual([]);
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "users:read" });
    await db.update(schema.role).set({ status: "disabled" }).where(eq(schema.role.id, roleId));
    expect(await getUserPermissionsService(ctx)).toEqual([]);
    await db
      .update(schema.role)
      .set({ status: "enabled", deletedAt: new Date() })
      .where(eq(schema.role.id, roleId));
    expect(await getUserPermissionsService(ctx)).toEqual([]);
  });
  it("does not widen API key access or authorize disabled members", async () => {
    expect(await getUserPermissionsService({ ...ctx, authKind: "apiKey" })).toEqual([]);
    await db.update(schema.user).set({ deletedAt: new Date() }).where(eq(schema.user.id, memberId));
    expect(await getUserPermissionsService(ctx)).toEqual([]);
  });
  it("keeps superadmin access and protects superadmin targets", async () => {
    await expect(assertPermissionService(admin, "users:delete")).resolves.toBeUndefined();
    await expect(assertUserTargetService(ctx, adminId)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(assertUserTargetService(admin, targetId)).resolves.toBeUndefined();
  });
  it("rejects clearing roles without assignment permission and prevents escalation", async () => {
    await expect(assertAssignableRolesService(ctx, [])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "users:assign-roles" });
    const other = await createRoleService({
      ctx: admin,
      data: { name: "Writer", permissionCodes: ["users:delete"] },
    });
    await expect(assertAssignableRolesService(ctx, [other.id])).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(assertAssignableRolesService(ctx, [roleId])).resolves.toBeUndefined();
    await expect(
      assertAssignableRolesService(ctx, ["20000000-0000-4000-8000-000000000009"]),
    ).rejects.toMatchObject({ code: "INVALID" });
  });
  it("persists and clears role permissions transactionally without erasing menus", async () => {
    const menu = await createMenuService({
      name: "Users",
      path: "/admin/users",
      permissionCodes: ["users:read"],
    });
    const role = await createRoleService({
      ctx: admin,
      data: { name: "New", menuIds: [menu.id], permissionCodes: ["users:read", "users:read"] },
    });
    expect(role.menuIds).toEqual([menu.id]);
    expect(role.permissionCodes).toEqual(["users:read"]);
    const result = await updateRoleService({
      ctx: admin,
      id: role.id,
      data: { permissionCodes: [] },
    });
    expect(result.menuIds).toEqual([menu.id]);
    expect((await getRoleService({ id: role.id }))?.permissionCodes).toEqual([]);
    await expect(
      createRoleService({
        ctx: admin,
        data: {
          name: "Rollback",
          menuIds: ["20000000-0000-4000-8000-000000000099"],
          permissionCodes: ["users:read"],
        },
      }),
    ).rejects.toThrow();
    const rows = await db.select().from(schema.role).where(eq(schema.role.name, "Rollback"));
    expect(rows).toEqual([]);
  });
  it("round trips menu permission bindings and removes navigation for disabled roles", async () => {
    const menu = await createMenuService({
      name: "Users",
      path: "/admin/users",
      permissionCodes: ["users:read", "users:update"],
    });
    expect((await getMenuTreeService())[0]?.permissionCodes).toEqual(
      expect.arrayContaining(["users:read", "users:update"]),
    );
    await updateMenuService(menu.id, { permissionCodes: [] });
    expect((await getMenuTreeService())[0]?.permissionCodes).toEqual([]);
    await db.insert(schema.roleMenu).values({ roleId, menuId: menu.id });
    expect(await getAuthorizedMenuPathsService(memberId)).toContain("/admin/users");
    await db.update(schema.role).set({ status: "disabled" }).where(eq(schema.role.id, roleId));
    expect(await getAuthorizedMenuPathsService(memberId)).toEqual([]);
  });
  it("provides edit options without granting role management", async () => {
    await expect(getUserFormOptionsService(ctx)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "users:update" });
    expect((await getUserFormOptionsService(ctx)).roles).toEqual([]);
  });
});
