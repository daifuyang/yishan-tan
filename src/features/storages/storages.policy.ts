import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanManageStorages(ctx: ServiceContext): Promise<void> {
  await assertPermissionService(ctx, "storages:read");
}

export async function assertStorageOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `storages:${string}`>,
): Promise<void> {
  await assertPermissionService(ctx, code);
}
