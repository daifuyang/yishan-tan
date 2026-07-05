import { isSystemAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanViewLoginLogs(ctx: ServiceContext): Promise<void> {
  if (!isSystemAdmin(ctx)) {
    throw Errors.forbidden("仅系统管理员可查看登录日志");
  }
}
