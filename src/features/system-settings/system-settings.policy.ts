import { requireAdmin } from "~/lib/authorization.server";
import { Errors } from "~/lib/errors";
import type { ServiceContext } from "~/lib/service-context";

export async function assertSystemSettingAccess(ctx: ServiceContext): Promise<void> {
  await requireAdmin(ctx);
}

export function assertSystemSettingKey(key: string): void {
  if (!/^[a-z0-9_.-]+$/.test(key)) {
    throw Errors.invalid("系统配置 key 只能包含小写字母、数字、下划线、点、中划线");
  }
}
