import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

/**
 * 简单 RBAC。生产可换成基于数据库的角色-权限表。
 *
 * SYSTEM_ADMIN_IDS 是「显式白名单」，覆盖 DB role。
 * 未配置时（开发期常见）：回退 `ctx.role === "admin"`，让 seed 用户登入即可访问后台，
 * 避免首次安装卡在「必须手抄 userId 写进 .env」的位置。
 */
export const SYSTEM_ADMIN_IDS = (process.env.SYSTEM_ADMIN_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isSystemAdmin(ctx: ServiceContext): boolean {
  if (SYSTEM_ADMIN_IDS.includes(ctx.userId)) return true;
  if (SYSTEM_ADMIN_IDS.length === 0 && ctx.role === "admin") return true;
  return false;
}

export async function requireAdmin(ctx: ServiceContext): Promise<void> {
  if (isSystemAdmin(ctx)) return;
  throw Errors.forbidden("仅系统管理员可执行该操作");
}

export async function requireSelfOrAdmin(ctx: ServiceContext, ownerId: string): Promise<void> {
  if (ctx.userId === ownerId) return;
  if (isSystemAdmin(ctx)) return;
  throw Errors.forbidden("仅本人或管理员可执行该操作");
}
