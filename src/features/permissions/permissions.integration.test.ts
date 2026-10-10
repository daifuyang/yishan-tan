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
const roleActions = await import("~/features/roles/roles.actions");
const { createMenuService, updateMenuService, getMenuTreeService, getAuthorizedMenuPathsService } =
  await import("~/features/menus/menus.service");
const menuActions = await import("~/features/menus/menus.actions");
const { assertUserOperation } = await import("~/features/users/users.policy");
const userActions = await import("~/features/users/users.actions");
const authActions = await import("~/features/auth/auth.actions");
const { Route: listRoute } = await import("~/routes/api/v1/users/index");
const { Route: detailRoute } = await import("~/routes/api/v1/users/$id");
const { Route: roleListRoute } = await import("~/routes/api/v1/roles/index");
const { Route: roleDetailRoute } = await import("~/routes/api/v1/roles/$id");
const { Route: menuRoute } = await import("~/routes/api/v1/menus");
const { Route: menuDetailRoute } = await import("~/routes/api/v1/menus/$id");
const createRoute = listRoute;
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
  await client.exec(
    'TRUNCATE "user", "role", "menu", "department", "post", "dict_type", "dict_data" CASCADE',
  );
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

  it("enforces role and menu operation permissions through both entries", async () => {
    const input = {
      request: new Request("http://localhost/api/v1/roles"),
      params: { id: roleId },
    };
    expect((await handlers(roleListRoute).GET(input)).status).toBe(403);
    expect(
      (
        await handlers(menuRoute).GET({
          ...input,
          request: new Request("http://localhost/api/v1/menus?tree=1"),
        })
      ).status,
    ).toBe(403);
    await expect(roleActions.listRoles({ data: { page: 1, pageSize: 20 } })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(menuActions.getMenuTree()).rejects.toMatchObject({ code: "FORBIDDEN" });

    await db.insert(schema.rolePermission).values([
      { roleId, permissionCode: "roles:read" },
      { roleId, permissionCode: "roles:create" },
      { roleId, permissionCode: "roles:update" },
      { roleId, permissionCode: "roles:delete" },
      { roleId, permissionCode: "menus:read" },
      { roleId, permissionCode: "menus:create" },
      { roleId, permissionCode: "menus:update" },
      { roleId, permissionCode: "menus:delete" },
    ]);

    const role = await roleActions.createRole({
      data: { name: "Delegated role", permissionCodes: ["users:read"] },
    });
    expect(role.name).toBe("Delegated role");
    await expect(
      roleActions.updateRole({ data: { id: role.id, permissionCodes: ["users:delete"] } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await roleActions.updateRole({ data: { id: role.id, description: "Updated" } });

    const roleResponse = await handlers(roleListRoute).GET(input);
    expect(roleResponse.status).toBe(200);
    const menu = await menuActions.createMenu({ data: { name: "Delegated menu", type: "group" } });
    expect(menu.name).toBe("Delegated menu");
    await menuActions.updateMenu({ data: { id: menu.id, name: "Updated menu" } });
    const menuResponse = await handlers(menuDetailRoute).DELETE({
      request: new Request(`http://localhost/api/v1/menus/${menu.id}`),
      params: { id: menu.id },
    });
    expect(menuResponse.status).toBe(200);
    const roleDeleteResponse = await handlers(roleDetailRoute).DELETE({
      request: new Request(`http://localhost/api/v1/roles/${role.id}`),
      params: { id: role.id },
    });
    expect(roleDeleteResponse.status).toBe(200);
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
  it("allows clearing an optional nickname while preserving delegated user authorization", async () => {
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "users:update" });
    await db
      .update(schema.user)
      .set({ displayName: "Old nickname" })
      .where(eq(schema.user.id, targetId));
    await userActions.updateUser({ data: { id: targetId, name: "Changed", displayName: "   " } });
    const [user] = await db.select().from(schema.user).where(eq(schema.user.id, targetId));
    expect(user?.displayName).toBeNull();
    expect(user?.name).toBe("Changed");
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

const departmentActions = await import("~/features/departments/departments.actions");
const postActions = await import("~/features/posts/posts.actions");
const dictActions = await import("~/features/dicts/dicts.actions");
const { Route: departmentRoute } = await import("~/routes/api/v1/departments");
const { Route: departmentDetailRoute } = await import("~/routes/api/v1/departments/$id");
const { Route: postRoute } = await import("~/routes/api/v1/posts");
const { Route: postDetailRoute } = await import("~/routes/api/v1/posts/$id");
const { Route: dictTypeRoute } = await import("~/routes/api/v1/dict-types");
const { Route: dictTypeDetailRoute } = await import("~/routes/api/v1/dict-types/$id");
const { Route: dictDataRoute } = await import("~/routes/api/v1/dicts-data");
const { Route: dictDataDetailRoute } = await import("~/routes/api/v1/dicts-data/$id");
const departmentId = "30000000-0000-4000-8000-000000000001";

async function resourceCases() {
  await db.insert(schema.department).values({ id: departmentId, name: "Department" });
  const [post] = await db.insert(schema.post).values({ name: "Post", departmentId }).returning();
  const [type] = await db
    .insert(schema.dictType)
    .values({ name: "Type", code: "test_type" })
    .returning();
  const [data] = await db
    .insert(schema.dictData)
    .values({ typeCode: "test_type", label: "Data", value: "one" })
    .returning();
  if (!post || !type || !data) throw new Error("Resource fixtures were not created");
  return [
    {
      domain: "departments" as const,
      route: departmentRoute,
      detail: departmentDetailRoute,
      id: departmentId,
      list: () => departmentActions.listDepartments({ data: {} }),
      create: () => departmentActions.createDepartment({ data: { name: "New department" } }),
      update: () =>
        departmentActions.updateDepartment({ data: { id: departmentId, name: "Updated" } }),
      remove: () => departmentActions.deleteDepartment({ data: { id: departmentId } }),
      body: { name: "REST department" },
      patch: { name: "REST updated" },
    },
    {
      domain: "posts" as const,
      route: postRoute,
      detail: postDetailRoute,
      id: post.id,
      list: () => postActions.listPosts({ data: {} }),
      create: () => postActions.createPost({ data: { name: "New post", departmentId } }),
      update: () => postActions.updatePost({ data: { id: post.id, name: "Updated" } }),
      remove: () => postActions.deletePost({ data: { id: post.id } }),
      body: { name: "REST post", departmentId },
      patch: { name: "REST updated" },
    },
    {
      domain: "dicts" as const,
      route: dictTypeRoute,
      detail: dictTypeDetailRoute,
      id: type.id,
      list: () => dictActions.listDictTypes({ data: {} }),
      create: () => dictActions.createDictType({ data: { name: "New type", code: "new_type" } }),
      update: () => dictActions.updateDictType({ data: { id: type.id, name: "Updated" } }),
      remove: () => dictActions.deleteDictType({ data: { id: type.id } }),
      body: { name: "REST type", code: "rest_type" },
      patch: { name: "REST updated" },
    },
    {
      domain: "dicts" as const,
      route: dictDataRoute,
      detail: dictDataDetailRoute,
      id: data.id,
      list: () => dictActions.listDictData({ data: { typeCode: "test_type" } }),
      create: () =>
        dictActions.createDictData({
          data: { typeCode: "test_type", label: "New data", value: "two" },
        }),
      update: () => dictActions.updateDictData({ data: { id: data.id, label: "Updated" } }),
      remove: () => dictActions.deleteDictData({ data: { id: data.id } }),
      body: { typeCode: "test_type", label: "REST data", value: "three" },
      patch: { label: "REST updated" },
    },
  ] as const;
}
function requestInput(id: string, body: unknown, method = "POST") {
  return {
    request: new Request("http://localhost/api/v1/test", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: { id },
  };
}

describe("delegated department, post, and dictionary operations", () => {
  it("allows only granted reads in both entries; navigation does not grant write access", async () => {
    await db.insert(schema.rolePermission).values(
      ["departments:read", "posts:read", "dicts:read"].map((permissionCode) => ({
        roleId,
        permissionCode,
      })),
    );
    for (const resource of await resourceCases()) {
      expect((await resource.list()).total).toBe(1);
      const input = requestInput(resource.id, resource.body);
      expect((await handlers(resource.route).GET(input)).status).toBe(200);
      for (const action of [resource.create, resource.update, resource.remove])
        await expect(action()).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect((await handlers(resource.route).POST(input)).status).toBe(403);
      expect(
        (await handlers(resource.detail).PATCH(requestInput(resource.id, resource.patch, "PATCH")))
          .status,
      ).toBe(403);
      expect((await handlers(resource.detail).DELETE(input)).status).toBe(403);
    }
    await expect(departmentActions.exportDepartments({ data: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("authorizes each CRUD operation independently with real writes through REST and actions", async () => {
    const resources = await resourceCases();
    for (const resource of [...resources].reverse()) {
      await db.delete(schema.rolePermission).where(eq(schema.rolePermission.roleId, roleId));
      await db
        .insert(schema.rolePermission)
        .values({ roleId, permissionCode: `${resource.domain}:create` });
      await expect(resource.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(resource.create()).resolves.toHaveProperty("id");
      expect(
        (await handlers(resource.route).POST(requestInput(resource.id, resource.body))).status,
      ).toBe(201);
      await expect(resource.update()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db
        .insert(schema.rolePermission)
        .values({ roleId, permissionCode: `${resource.domain}:update` });
      await expect(resource.update()).resolves.toHaveProperty("id", resource.id);
      expect(
        (await handlers(resource.detail).PATCH(requestInput(resource.id, resource.patch, "PATCH")))
          .status,
      ).toBe(200);
      await expect(resource.remove()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db
        .insert(schema.rolePermission)
        .values({ roleId, permissionCode: `${resource.domain}:delete` });
      expect((await handlers(resource.detail).DELETE(requestInput(resource.id, {}))).status).toBe(
        200,
      );
    }
  });
  it("rejects anonymous and API key calls across every resource and entry", async () => {
    const resources = await resourceCases();
    for (const resource of resources) {
      requestContext = null;
      const input = requestInput(resource.id, resource.body);
      expect((await handlers(resource.route).GET(input)).status).toBe(401);
      expect((await handlers(resource.route).POST(input)).status).toBe(401);
      expect((await handlers(resource.detail).PATCH(input)).status).toBe(401);
      expect((await handlers(resource.detail).DELETE(input)).status).toBe(401);
      await expect(resource.list()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
      await db
        .insert(schema.rolePermission)
        .values({ roleId, permissionCode: `${resource.domain}:read` })
        .onConflictDoNothing();
      requestContext = { ...ctx, authKind: "apiKey" };
      expect((await handlers(resource.route).GET(input)).status).toBe(403);
      await expect(resource.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });
  it("revokes reads on the next request and keeps grants separate across domains", async () => {
    const [department, post, type, data] = await resourceCases();
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "departments:read" });
    await expect(department.list()).resolves.toHaveProperty("total", 1);
    for (const other of [post, type, data])
      await expect(other.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(schema.role).set({ status: "disabled" }).where(eq(schema.role.id, roleId));
    expect((await handlers(department.route).GET(requestInput(department.id, {}))).status).toBe(
      403,
    );
    await expect(department.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("provides complete minimal form options without granting user or department management", async () => {
    await resourceCases();
    await expect(
      departmentActions.getDepartmentFormOptions({ data: { operation: "update" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.insert(schema.rolePermission).values([
      { roleId, permissionCode: "departments:update" },
      { roleId, permissionCode: "posts:read" },
    ]);
    await db.insert(schema.user).values(
      Array.from({ length: 205 }, (_, i) => ({
        name: `Candidate ${i}`,
        username: `candidate_${i}`,
        email: `candidate_${i}@example.test`,
      })),
    );
    const leaders = await departmentActions.getDepartmentFormOptions({
      data: { operation: "update" },
    });
    expect(leaders.leaders).toHaveLength(208);
    expect(Object.keys(leaders.leaders[0] ?? {}).sort()).toEqual(["displayName", "id", "username"]);
    await expect(
      departmentActions.getDepartmentFormOptions({ data: { operation: "create" } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db
      .insert(schema.department)
      .values(Array.from({ length: 100 }, (_, i) => ({ name: `Department ${i}` })));
    const departments = await postActions.getPostDepartmentOptions({ data: { operation: "read" } });
    expect(departments).toHaveLength(101);
    expect(departments).toContainEqual({ id: departmentId, name: "Department", status: "enabled" });
    await expect(departmentActions.listDepartments({ data: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
  it("authorizes export separately from reads and returns the submitted filter scope", async () => {
    await resourceCases();
    await db.insert(schema.rolePermission).values({ roleId, permissionCode: "departments:export" });
    expect(await departmentActions.exportDepartments({ data: { name: "missing" } })).not.toContain(
      "Department",
    );
    expect(await departmentActions.exportDepartments({ data: { name: "Department" } })).toContain(
      "Department",
    );
  });
  it("applies dictionary field/date filters to both rows and totals before pagination", async () => {
    requestContext = admin;
    await db.insert(schema.dictType).values([
      {
        name: "Alpha",
        code: "alpha_one",
        description: "needle",
        createdAt: new Date("2026-01-02"),
      },
      { name: "Alpha", code: "alpha_two", description: "other", createdAt: new Date("2026-01-02") },
      {
        name: "Alpha",
        code: "alpha_old",
        description: "needle",
        createdAt: new Date("2025-01-02"),
      },
      {
        name: "Alpha",
        code: "alpha_three",
        description: "needle",
        createdAt: new Date("2026-01-03"),
      },
    ]);
    const filter = {
      name: "Alpha",
      code: "alpha_",
      description: "needle",
      createdFrom: "2026-01-01T00:00:00.000Z",
      createdTo: "2026-01-31T23:59:59.999Z",
      page: 2,
      pageSize: 1,
    };
    const types = await dictActions.listDictTypes({ data: filter });
    expect(types.total).toBe(2);
    expect(types.items.map((row) => row.code)).toEqual(["alpha_three"]);
    await db.insert(schema.dictData).values([
      {
        typeCode: "alpha_one",
        label: "Alpha",
        value: "value_one",
        extra: "needle",
        createdAt: new Date("2026-01-02"),
      },
      {
        typeCode: "alpha_one",
        label: "Alpha",
        value: "value_two",
        extra: "other",
        createdAt: new Date("2026-01-02"),
      },
      {
        typeCode: "alpha_one",
        label: "Alpha",
        value: "value_old",
        extra: "needle",
        createdAt: new Date("2025-01-02"),
      },
      {
        typeCode: "alpha_one",
        label: "Alpha",
        value: "value_three",
        extra: "needle",
        createdAt: new Date("2026-01-03"),
      },
    ]);
    const datas = await dictActions.listDictData({
      data: {
        typeCode: "alpha_one",
        label: "Alpha",
        value: "value_",
        extra: "needle",
        createdFrom: filter.createdFrom,
        createdTo: filter.createdTo,
        page: 2,
        pageSize: 1,
      },
    });
    expect(datas.total).toBe(2);
    expect(datas.items.map((row) => row.value)).toEqual(["value_one"]);
  });
});
