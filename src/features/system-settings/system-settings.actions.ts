import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertSystemSettingKey, assertSystemSettingOperation } from "./system-settings.policy";
import { batchSetSystemOptionSchema, setSystemOptionSchema } from "./system-settings.schema";
import {
  batchGetSystemOptionsService,
  batchSetSystemOptionsService,
  getSystemOptionService,
  setSystemOptionService,
} from "./system-settings.service";

async function operationCtx(code: "settings:read" | "settings:update") {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertSystemSettingOperation(ctx, code);
  return ctx;
}

export const getSystemOption = createServerFn({ method: "GET" })
  .validator(z.object({ key: z.string() }))
  .handler(async ({ data }) => {
    await operationCtx("settings:read");
    return getSystemOptionService(data.key);
  });

export const batchGetSystemOptions = createServerFn({ method: "POST" })
  .validator(z.object({ keys: z.array(z.string()).max(100) }))
  .handler(async ({ data }) => {
    await operationCtx("settings:read");
    return batchGetSystemOptionsService(data.keys);
  });

export const setSystemOption = createServerFn({ method: "POST" })
  .validator(setSystemOptionSchema.extend({ key: z.string() }))
  .handler(async ({ data }) => {
    await operationCtx("settings:update");
    assertSystemSettingKey(data.key);
    return setSystemOptionService(data);
  });

export const batchSetSystemOptions = createServerFn({ method: "POST" })
  .validator(batchSetSystemOptionSchema)
  .handler(async ({ data }) => {
    await operationCtx("settings:update");
    for (const item of data.items) assertSystemSettingKey(item.key);
    return batchSetSystemOptionsService(data);
  });
