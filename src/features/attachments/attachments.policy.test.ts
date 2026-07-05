import { describe, expect, it, vi } from "vitest";

const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174aaa";
const TARGET_ID = "123e4567-e89b-12d3-a456-426614174001";

vi.mock("~/lib/authorization.server", () => ({
  SYSTEM_ADMIN_IDS: [ADMIN_ID],
  isSystemAdmin: vi.fn((ctx: { userId: string }) => ctx.userId === ADMIN_ID),
  requireAdmin: vi.fn(),
  requireSelfOrAdmin: vi.fn(),
}));

const { assertCanManageAttachments, assertCanUploadAttachment } = await import(
  "~/features/attachments/attachments.policy"
);

describe("attachments.policy", () => {
  describe("assertCanManageAttachments", () => {
    it("passes for system admin", async () => {
      const ctx = {
        userId: ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanManageAttachments(ctx)).resolves.toBeUndefined();
    });

    it("throws forbidden for non-admin", async () => {
      const ctx = {
        userId: TARGET_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanManageAttachments(ctx)).rejects.toThrow();
    });
  });

  describe("assertCanUploadAttachment", () => {
    it("passes for system admin", async () => {
      const ctx = {
        userId: ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanUploadAttachment(ctx)).resolves.toBeUndefined();
    });

    it("throws forbidden for non-admin", async () => {
      const ctx = {
        userId: TARGET_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanUploadAttachment(ctx)).rejects.toThrow();
    });
  });
});
