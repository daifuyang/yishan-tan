import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertDepartmentOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `departments:${string}`>,
): Promise<void> {
  await assertPermissionService(ctx, code);
}
