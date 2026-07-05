import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { assertCanManageUsers } from "~/features/users/users.policy";
import { contextFromRequest, requireRequestContext } from "~/server/request-context";
import { createSessionSchema, createUserSchema } from "./auth.schema";
import {
  createSessionService,
  createUserService,
  deleteSessionService,
  getCurrentUserService,
} from "./auth.service";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () =>
  getCurrentUserService(await contextFromRequest(getRequestHeaders())),
);

export const createSession = createServerFn({ method: "POST" })
  .validator(createSessionSchema)
  .handler(async ({ data }) => createSessionService(data, getRequestHeaders()));

export const deleteSession = createServerFn({ method: "POST" }).handler(async () =>
  deleteSessionService(await requireRequestContext(getRequestHeaders())),
);

/**
 * admin 视角下的新增用户入口。受 assertCanManageUsers 守卫，仅 system admin
 * 可调用；普通注册走单独的 sign-up 端点（不在本 server-fn）。
 */
export const createUser = createServerFn({ method: "POST" })
  .validator(createUserSchema)
  .handler(async ({ data }) => {
    const ctx = await requireRequestContext(getRequestHeaders());
    await assertCanManageUsers(ctx);
    return createUserService(data, getRequestHeaders());
  });
