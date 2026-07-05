import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { contextFromRequest } from "~/server/request-context";
import { assertCanViewLoginLogs } from "./login-logs.policy";
import { listLoginLogsSchema } from "./login-logs.schema";
import { listAllLoginLogsService } from "./login-logs.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertCanViewLoginLogs(ctx);
  return ctx;
}

export const listLoginLogs = createServerFn({ method: "GET" })
  .validator(listLoginLogsSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listAllLoginLogsService(data);
  });
