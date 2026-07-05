import { describe, expect, it, vi } from "vitest";

const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174aaa";
const TARGET_ID = "123e4567-e89b-12d3-a456-426614174001";

vi.mock("~/lib/authorization.server", () => ({
  SYSTEM_ADMIN_IDS: [ADMIN_ID],
  isSystemAdmin: vi.fn((ctx: { userId: string }) => ctx.userId === ADMIN_ID),
  requireAdmin: vi.fn(),
  requireSelfOrAdmin: vi.fn(),
}));

const { assertCanManageStorages } = await import("~/features/storages/storages.policy");

describe("storages.policy", () => {
  describe("assertCanManageStorages", () => {
    it("passes for system admin", async () => {
      const ctx = {
        userId: ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanManageStorages(ctx)).resolves.toBeUndefined();
    });

    it("throws forbidden for non-admin", async () => {
      const ctx = {
        userId: TARGET_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanManageStorages(ctx)).rejects.toThrow();
    });
  });
});
