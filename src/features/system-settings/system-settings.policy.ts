import { assertPermissionService } from "~/features/permissions/permissions.service";
import { Errors } from "~/lib/errors";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertSystemSettingAccess(ctx: ServiceContext): Promise<void> {
  await assertPermissionService(ctx, "settings:read");
}

export async function assertSystemSettingOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `settings:${string}`>,
): Promise<void> {
  await assertPermissionService(ctx, code);
}

export function assertSystemSettingKey(key: string): void {
  if (!/^[a-z0-9_.-]+$/.test(key)) {
    throw Errors.invalid("系统配置 key 只能包含小写字母、数字、下划线、点、中划线");
  }
}
