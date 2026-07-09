import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireAdmin } from "~/lib/authorization.server";
import { contextFromRequest, requireRequestContext } from "~/server/request-context";
import { assertCanResetPassword } from "./users.policy";
import {
  changePasswordSchema,
  loginLogListQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
  userListQuerySchema,
} from "./users.schema";
import {
  changeMyPasswordService,
  createApiKeyService,
  deleteApiKeyService,
  deleteUserService,
  exportUsersService,
  getUserService,
  listApiKeysService,
  listMyLoginLogsService,
  listUsersService,
  resetUserPasswordService,
  updateUserService,
} from "./users.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await requireAdmin(ctx);
  return ctx;
}

async function userCtx() {
  return requireRequestContext(getRequestHeaders());
}

export const listUsers = createServerFn({ method: "GET" })
  .validator(userListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listUsersService(data);
  });

export const getUser = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const user = await getUserService(data.id);
    if (!user) throw new Error("NOT_FOUND");
    return user;
  });

export const updateUser = createServerFn({ method: "POST" })
  .validator(updateUserSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await adminCtx();
    const { id, ...rest } = data;
    if (rest.status === "disabled" && id === ctx.userId) {
      throw new Error("CANNOT_DISABLE_SELF");
    }
    return updateUserService(id, rest);
  });

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await adminCtx();
    if (data.id === ctx.userId) {
      throw new Error("CANNOT_DELETE_SELF");
    }
    return deleteUserService(data.id);
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .validator(resetPasswordSchema)
  .handler(async ({ data }) => {
    const ctx = await adminCtx();
    assertCanResetPassword(ctx, data.userId);
    return resetUserPasswordService({ userId: data.userId });
  });

export const exportUsers = createServerFn({ method: "GET" })
  .validator(userListQuerySchema.omit({ page: true, pageSize: true }))
  .handler(async ({ data }) => {
    await adminCtx();
    return exportUsersService(data);
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .validator(changePasswordSchema)
  .handler(async ({ data }) => {
    const ctx = await userCtx();
    return changeMyPasswordService({ userId: ctx.userId, ...data });
  });

export const listMyLoginLogs = createServerFn({ method: "GET" })
  .validator(loginLogListQuerySchema)
  .handler(async ({ data }) => {
    const ctx = await userCtx();
    return listMyLoginLogsService({ userId: ctx.userId, ...data });
  });

export const listApiKeys = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await userCtx();
  return listApiKeysService({ userId: ctx.userId });
});

export const createApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().max(50).optional() }))
  .handler(async ({ data }) => {
    const ctx = await userCtx();
    return createApiKeyService({ userId: ctx.userId, name: data.name });
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const ctx = await userCtx();
    return deleteApiKeyService({ userId: ctx.userId, id: data.id });
  });
