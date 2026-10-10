import { describe, expect, it, vi } from "vitest";

vi.mock("~/features/permissions/permissions.service", () => ({
  assertPermissionService: vi.fn(),
  assertAssignablePermissionCodesService: vi.fn(),
}));

const { assertMenuOperation } = await import("~/features/menus/menus.policy");

describe("menus.policy", () => {
  describe("assertMenuOperation", () => {
    it("passes for a granted operation", async () => {
      const ctx = {
        userId: "123e4567-e89b-12d3-a456-426614174aaa",
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertMenuOperation(ctx, "menus:read")).resolves.toBeUndefined();
    });

    it("validates permission assignments", async () => {
      const ctx = {
        userId: "123e4567-e89b-12d3-a456-426614174001",
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(
        assertMenuOperation(ctx, "menus:update", ["users:read"]),
      ).resolves.toBeUndefined();
    });
  });
});
