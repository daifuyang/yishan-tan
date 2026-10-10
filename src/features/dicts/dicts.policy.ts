import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertDictOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `dicts:${string}`>,
): Promise<void> {
  await assertPermissionService(ctx, code);
}
