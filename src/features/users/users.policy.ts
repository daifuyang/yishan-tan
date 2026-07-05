import { SYSTEM_ADMIN_IDS } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

export function isSystemAdmin(userId: string): boolean {
  return SYSTEM_ADMIN_IDS.includes(userId);
}

export async function assertCanManageUsers(ctx: ServiceContext): Promise<void> {
  if (!isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅系统管理员可执行该操作");
  }
}

export function assertNotSelfOrSystemAdmin(targetUserId: string, operatorId: string): void {
  if (targetUserId === operatorId) {
    throw Errors.invalid("不能对当前登录用户执行该操作");
  }
  if (isSystemAdmin(targetUserId)) {
    throw Errors.invalid("不能对系统管理员执行该操作");
  }
}
