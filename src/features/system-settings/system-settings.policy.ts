import { requireAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
/**
 * 系统选项（站点配置）的策略占位。
 * 实际策略由具体业务决定，例如 value 必须是 JSON、配置粒度等。
 */
import type { ServiceContext } from "~/lib/service-context";

export async function assertSystemSettingAccess(ctx: ServiceContext): Promise<void> {
  await requireAdmin(ctx);
}

export function assertSystemSettingKey(key: string): void {
  if (!/^[a-z0-9_.-]+$/.test(key)) {
    throw Errors.invalid("系统配置 key 只能包含小写字母、数字、下划线、点、中划线");
  }
}
