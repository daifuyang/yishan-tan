import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireRequestContext } from "~/server/request-context";
import { assertRoleOperation } from "./roles.policy";
import { createRoleSchema, roleListQuerySchema, updateRoleSchema } from "./roles.schema";
import {
  createRoleService,
  deleteRoleService,
  getRoleService,
  listRolesService,
  updateRoleService,
} from "./roles.service";

async function operationCtx(
  code: Parameters<typeof assertRoleOperation>[1],
  permissionCodes?: Parameters<typeof assertRoleOperation>[2],
) {
  const ctx = await requireRequestContext(getRequestHeaders());
  await assertRoleOperation(ctx, code, permissionCodes);
  return ctx;
}

export const listRoles = createServerFn({ method: "GET" })
  .validator(roleListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("roles:read");
    return listRolesService(data);
  });

export const getRole = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("roles:read");
    const role = await getRoleService({ id: data.id });
    if (!role) throw new Error("NOT_FOUND");
    return role;
  });

export const createRole = createServerFn({ method: "POST" })
  .validator(createRoleSchema)
  .handler(async ({ data }) => {
    const ctx = await operationCtx("roles:create", data.permissionCodes);
    return createRoleService({ ctx, data });
  });

export const updateRole = createServerFn({ method: "POST" })
  .validator(updateRoleSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await operationCtx("roles:update", data.permissionCodes);
    const { id, ...rest } = data;
    return updateRoleService({ ctx, id, data: rest });
  });

export const deleteRole = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("roles:delete");
    return deleteRoleService({ id: data.id });
  });
