import { assertPermissionService } from "~/features/permissions/permissions.service";
import type { PermissionCode } from "~/lib/permission-catalog";
import type { ServiceContext } from "~/lib/service-context";

export async function assertCanManageAttachments(ctx: ServiceContext): Promise<void> {
  await assertPermissionService(ctx, "attachments:read");
}

export async function assertCanUploadAttachment(ctx: ServiceContext): Promise<void> {
  await assertPermissionService(ctx, "attachments:create");
}

export async function assertAttachmentOperation(
  ctx: ServiceContext,
  code: Extract<PermissionCode, `attachments:${string}`>,
): Promise<void> {
  await assertPermissionService(ctx, code);
}
