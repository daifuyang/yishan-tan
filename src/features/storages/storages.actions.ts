import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertStorageOperation } from "./storages.policy";
import {
  createStorageSchema,
  storageListQuerySchema,
  updateStorageSchema,
} from "./storages.schema";
import {
  createStorageService,
  deleteStorageService,
  getDefaultStorageService,
  getStorageService,
  listStoragesService,
  setDefaultStorageService,
  updateStorageService,
} from "./storages.service";

async function operationCtx(
  code: "storages:read" | "storages:create" | "storages:update" | "storages:delete",
) {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertStorageOperation(ctx, code);
  return ctx;
}

export const listStorages = createServerFn({ method: "GET" })
  .validator(storageListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("storages:read");
    return listStoragesService(data);
  });

export const getStorage = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("storages:read");
    const storage = await getStorageService(data.id);
    if (!storage) throw new Error("NOT_FOUND");
    return storage;
  });

export const getDefaultStorage = createServerFn({ method: "GET" }).handler(async () => {
  await operationCtx("storages:read");
  return getDefaultStorageService();
});

export const createStorage = createServerFn({ method: "POST" })
  .validator(createStorageSchema)
  .handler(async ({ data }) => {
    await operationCtx("storages:create");
    return createStorageService(data);
  });

export const updateStorage = createServerFn({ method: "POST" })
  .validator(updateStorageSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("storages:update");
    const { id, ...rest } = data;
    return updateStorageService(id, rest);
  });

export const deleteStorage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("storages:delete");
    return deleteStorageService(data.id);
  });

export const setDefaultStorage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("storages:update");
    return setDefaultStorageService(data.id);
  });
