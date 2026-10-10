import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireRequestContext } from "~/server/request-context";
import { assertMenuOperation } from "./menus.policy";
import { createMenuSchema, menuListQuerySchema, updateMenuSchema } from "./menus.schema";
import {
  createMenuService,
  deleteMenuService,
  getAuthorizedMenuPathsService,
  getAuthorizedMenuTreeService,
  getMenuTreeService,
  listMenusService,
  updateMenuService,
} from "./menus.service";

async function authedCtx() {
  return requireRequestContext(getRequestHeaders());
}

async function operationCtx(
  code: Parameters<typeof assertMenuOperation>[1],
  permissionCodes?: Parameters<typeof assertMenuOperation>[2],
) {
  const ctx = await authedCtx();
  await assertMenuOperation(ctx, code, permissionCodes);
  return ctx;
}

export const listMenus = createServerFn({ method: "GET" })
  .validator(menuListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("menus:read");
    return listMenusService(data);
  });

export const getMenuTree = createServerFn({ method: "GET" }).handler(async () => {
  await operationCtx("menus:read");
  return getMenuTreeService();
});

export const getAuthorizedMenuTree = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await authedCtx();
  return getAuthorizedMenuTreeService(ctx.userId);
});

export const getAuthorizedMenuPaths = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await authedCtx();
  return getAuthorizedMenuPathsService(ctx.userId);
});

export const createMenu = createServerFn({ method: "POST" })
  .validator(createMenuSchema)
  .handler(async ({ data }) => {
    await operationCtx("menus:create", data.permissionCodes);
    return createMenuService(data);
  });

export const updateMenu = createServerFn({ method: "POST" })
  .validator(updateMenuSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("menus:update", data.permissionCodes);
    const { id, ...rest } = data;
    return updateMenuService(id, rest);
  });

export const deleteMenu = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("menus:delete");
    return deleteMenuService(data.id);
  });
