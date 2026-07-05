import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertCanManageDicts } from "./dicts.policy";
import {
  createDictDataSchema,
  createDictTypeSchema,
  dictDataListQuerySchema,
  dictTypeListQuerySchema,
  updateDictDataSchema,
  updateDictTypeSchema,
} from "./dicts.schema";
import {
  createDictDataService,
  createDictTypeService,
  deleteDictDataService,
  deleteDictTypeService,
  getDictDataService,
  getDictTypeService,
  listDictDataService,
  listDictTypesService,
  updateDictDataService,
  updateDictTypeService,
} from "./dicts.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertCanManageDicts(ctx);
  return ctx;
}

export const listDictTypes = createServerFn({ method: "GET" })
  .validator(dictTypeListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listDictTypesService(data);
  });

export const getDictType = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const row = await getDictTypeService(data.id);
    if (!row) throw new Error("NOT_FOUND");
    return row;
  });

export const createDictType = createServerFn({ method: "POST" })
  .validator(createDictTypeSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return createDictTypeService(data);
  });

export const updateDictType = createServerFn({ method: "POST" })
  .validator(updateDictTypeSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const { id, ...rest } = data;
    return updateDictTypeService(id, rest);
  });

export const deleteDictType = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    return deleteDictTypeService(data.id);
  });

export const listDictData = createServerFn({ method: "GET" })
  .validator(dictDataListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listDictDataService(data);
  });

export const getDictData = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const row = await getDictDataService(data.id);
    if (!row) throw new Error("NOT_FOUND");
    return row;
  });

export const createDictData = createServerFn({ method: "POST" })
  .validator(createDictDataSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return createDictDataService(data);
  });

export const updateDictData = createServerFn({ method: "POST" })
  .validator(updateDictDataSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const { id, ...rest } = data;
    return updateDictDataService(id, rest);
  });

export const deleteDictData = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    return deleteDictDataService(data.id);
  });
