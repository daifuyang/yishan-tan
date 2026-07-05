import { describe, expect, it, vi } from "vitest";

const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174aaa";
const NON_ADMIN_ID = "123e4567-e89b-12d3-a456-426614174001";

vi.mock("~/lib/authorization.server", () => ({
  isSystemAdmin: vi.fn((ctx: { userId: string }) => ctx.userId === ADMIN_ID),
  requireAdmin: vi.fn(),
  requireSelfOrAdmin: vi.fn(),
}));

const { assertCanViewLoginLogs } = await import("~/features/login-logs/login-logs.policy");

describe("login-logs.policy", () => {
  describe("assertCanViewLoginLogs", () => {
    it("passes for system admin", async () => {
      const ctx = {
        userId: ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanViewLoginLogs(ctx)).resolves.toBeUndefined();
    });

    it("throws forbidden for non-admin", async () => {
      const ctx = {
        userId: NON_ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(assertCanViewLoginLogs(ctx)).rejects.toThrow();
    });
  });
});
