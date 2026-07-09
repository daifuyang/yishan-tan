import { SYSTEM_ADMIN_IDS } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

export function isSystemAdmin(userId: string): boolean {
  return SYSTEM_ADMIN_IDS.includes(userId);
}

export async function assertCanManageUsers(ctx: ServiceContext): Promise<void> {
  if (!isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅超级管理员可执行该操作");
  }
}

export function assertNotSelfOrSystemAdmin(targetUserId: string, operatorId: string): void {
  if (targetUserId === operatorId) {
    throw Errors.invalid("不能对当前登录用户执行该操作");
  }
  if (isSystemAdmin(targetUserId)) {
    throw Errors.invalid("不能对超级管理员执行该操作");
  }
}

/**
 * 管理员重置目标用户密码：
 *  - 不能重置自己（误操作锁自己）
 *  - 非超级管理员不能重置超级管理员的密码（防止越权）
 *  - 超级管理员只能由同级别的超级管理员重置
 */
export function assertCanResetPassword(ctx: ServiceContext, targetUserId: string): void {
  if (targetUserId === ctx.userId) {
    throw Errors.invalid("不能重置当前登录用户的密码");
  }
  if (isSystemAdmin(targetUserId) && !isSystemAdmin(ctx.userId)) {
    throw Errors.forbidden("仅超级管理员可重置超级管理员的密码");
  }
}
