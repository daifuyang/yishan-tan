import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanViewLoginLogs(ctx: ServiceContext): Promise<void> {
  await assertPermissionService(ctx, "login-logs:read");
}
