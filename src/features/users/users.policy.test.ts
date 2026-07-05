import { describe, expect, it, vi } from "vitest";

const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174aaa";
const TARGET_ID = "123e4567-e89b-12d3-a456-426614174001";
const OPERATOR_ID = "123e4567-e89b-12d3-a456-426614174002";

vi.mock("~/lib/authorization.server", () => ({
  SYSTEM_ADMIN_IDS: [ADMIN_ID],
  requireAdmin: vi.fn(),
  requireSelfOrAdmin: vi.fn(),
}));

const { isSystemAdmin, assertNotSelfOrSystemAdmin } = await import("~/features/users/users.policy");

describe("users.policy", () => {
  describe("isSystemAdmin", () => {
    it("detects system admin", () => {
      expect(isSystemAdmin(ADMIN_ID)).toBe(true);
    });

    it("returns false for non-admin", () => {
      expect(isSystemAdmin(TARGET_ID)).toBe(false);
    });
  });

  describe("assertNotSelfOrSystemAdmin", () => {
    it("allows when target differs from operator and is not system admin", () => {
      expect(() => assertNotSelfOrSystemAdmin(TARGET_ID, OPERATOR_ID)).not.toThrow();
    });

    it("rejects when target equals operator", () => {
      expect(() => assertNotSelfOrSystemAdmin(OPERATOR_ID, OPERATOR_ID)).toThrow();
    });

    it("rejects when target is system admin", () => {
      expect(() => assertNotSelfOrSystemAdmin(ADMIN_ID, OPERATOR_ID)).toThrow();
    });
  });
});
