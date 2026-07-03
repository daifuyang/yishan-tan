import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
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

export const createUser = createServerFn({ method: "POST" })
  .validator(createUserSchema)
  .handler(async ({ data }) => createUserService(data, getRequestHeaders()));
