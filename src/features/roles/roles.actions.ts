import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertCanManageRoles } from "./roles.policy";
import { createRoleSchema, roleListQuerySchema, updateRoleSchema } from "./roles.schema";
import {
  createRoleService,
  deleteRoleService,
  getRoleService,
  listRolesService,
  updateRoleService,
} from "./roles.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertCanManageRoles(ctx);
  return ctx;
}

export const listRoles = createServerFn({ method: "GET" })
  .validator(roleListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listRolesService(data);
  });

export const getRole = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const role = await getRoleService(data.id);
    if (!role) throw new Error("NOT_FOUND");
    return role;
  });

export const createRole = createServerFn({ method: "POST" })
  .validator(createRoleSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return createRoleService(data);
  });

export const updateRole = createServerFn({ method: "POST" })
  .validator(updateRoleSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const { id, ...rest } = data;
    return updateRoleService(id, rest);
  });

export const deleteRole = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    return deleteRoleService(data.id);
  });
