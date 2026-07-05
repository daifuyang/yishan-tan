import { isSystemAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanManageRoles(ctx: ServiceContext): Promise<void> {
  if (!isSystemAdmin(ctx)) {
    throw Errors.forbidden("仅系统管理员可管理角色");
  }
}
