import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertPortalOperation } from "./portals.policy";
import { createPortalSchema, portalListQuerySchema, updatePortalSchema } from "./portals.schema";
import {
  createPortalService,
  deletePortalService,
  getDefaultPortalService,
  getPortalService,
  listPortalsService,
  setDefaultPortalService,
  updatePortalService,
} from "./portals.service";

async function operationCtx(
  code: "portals:read" | "portals:create" | "portals:update" | "portals:delete",
) {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertPortalOperation(ctx, code);
  return ctx;
}

export const listPortals = createServerFn({ method: "GET" })
  .validator(portalListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("portals:read");
    return listPortalsService(data);
  });

export const getPortal = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portals:read");
    const portal = await getPortalService(data.id);
    if (!portal) throw new Error("NOT_FOUND");
    return portal;
  });

export const getDefaultPortal = createServerFn({ method: "GET" }).handler(async () => {
  await operationCtx("portals:read");
  return getDefaultPortalService();
});

export const createPortal = createServerFn({ method: "POST" })
  .validator(createPortalSchema)
  .handler(async ({ data }) => {
    await operationCtx("portals:create");
    return createPortalService(data);
  });

export const updatePortal = createServerFn({ method: "POST" })
  .validator(updatePortalSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portals:update");
    const { id, ...rest } = data;
    return updatePortalService(id, rest);
  });

export const deletePortal = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portals:delete");
    return deletePortalService(data.id);
  });

export const setDefaultPortal = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portals:update");
    return setDefaultPortalService(data.id);
  });
