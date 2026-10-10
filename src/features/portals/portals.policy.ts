import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanManagePortals(ctx: ServiceContext): Promise<void> {
  await assertPermissionService(ctx, "portals:read");
}

export async function assertPortalOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `portals:${string}`>,
): Promise<void> {
  await assertPermissionService(ctx, code);
}
