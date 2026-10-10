import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { requireRequestContext } from "~/server/request-context";
import { getUserFormOptionsService, getUserPermissionsService } from "./permissions.service";

export const getMyPermissions = createServerFn({ method: "GET" }).handler(async () =>
  getUserPermissionsService(await requireRequestContext(getRequestHeaders())),
);

export const getUserFormOptions = createServerFn({ method: "GET" }).handler(async () =>
  getUserFormOptionsService(await requireRequestContext(getRequestHeaders())),
);
