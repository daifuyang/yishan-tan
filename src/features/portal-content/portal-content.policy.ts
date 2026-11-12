import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export type PortalContentPermissionCode = Extract<
  PermissionCode,
  | `portal-categories:${string}`
  | `portal-articles:${string}`
  | `portal-pages:${string}`
  | `portal-templates:${string}`
>;

export async function assertPortalContentOperation(
  ctx: ServiceContext,
  code: PortalContentPermissionCode,
): Promise<void> {
  await assertPermissionService(ctx, code);
}
