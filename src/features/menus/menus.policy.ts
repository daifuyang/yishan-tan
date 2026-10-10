import {
  assertAssignablePermissionCodesService,
  assertPermissionService,
} from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertMenuOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `menus:${string}`>,
  permissionCodes?: PermissionCode[],
): Promise<void> {
  await assertPermissionService(ctx, code);
  if (permissionCodes !== undefined) {
    await assertAssignablePermissionCodesService(ctx, permissionCodes);
  }
}
