import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

/**
 * 简单 RBAC。生产可换成基于数据库的角色-权限表。
 */
const SYSTEM_ADMIN_IDS = (process.env.SYSTEM_ADMIN_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function requireAdmin(ctx: ServiceContext): Promise<void> {
  if (!SYSTEM_ADMIN_IDS.includes(ctx.userId)) {
    throw Errors.forbidden("仅系统管理员可执行该操作");
  }
}

export async function requireSelfOrAdmin(ctx: ServiceContext, ownerId: string): Promise<void> {
  if (ctx.userId === ownerId) return;
  if (SYSTEM_ADMIN_IDS.includes(ctx.userId)) return;
  throw Errors.forbidden("仅本人或管理员可执行该操作");
}
