import { isSystemAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanManageMenus(ctx: ServiceContext): Promise<void> {
  if (!isSystemAdmin(ctx)) {
    throw Errors.forbidden("仅超级管理员可管理菜单");
  }
}
