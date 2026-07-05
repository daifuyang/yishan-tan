import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertCanManageMenus } from "./menus.policy";
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
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  return ctx;
}

async function adminCtx() {
  const ctx = await authedCtx();
  await assertCanManageMenus(ctx);
  return ctx;
}

export const listMenus = createServerFn({ method: "GET" })
  .validator(menuListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listMenusService(data);
  });

export const getMenuTree = createServerFn({ method: "GET" }).handler(async () => {
  await adminCtx();
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
    await adminCtx();
    return createMenuService(data);
  });

export const updateMenu = createServerFn({ method: "POST" })
  .validator(updateMenuSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const { id, ...rest } = data;
    return updateMenuService(id, rest);
  });

export const deleteMenu = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    return deleteMenuService(data.id);
  });
