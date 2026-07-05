import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/authorization.server", () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
  requireSelfOrAdmin: vi.fn(),
  SYSTEM_ADMIN_IDS: [],
}));

const { assertSystemSettingAccess, assertSystemSettingKey } = await import(
  "~/features/system-settings/system-settings.policy"
);

describe("system-settings.policy", () => {
  describe("assertSystemSettingKey", () => {
    it.each(["site.title", "feature.flag_1", "ok.key_1"])("accepts %s", (key) => {
      expect(() => assertSystemSettingKey(key)).not.toThrow();
    });

    it.each(["INVALID KEY", "with space", "with/slash"])("rejects %s", (key) => {
      expect(() => assertSystemSettingKey(key)).toThrow();
    });
  });

  describe("assertSystemSettingAccess", () => {
    it("calls requireAdmin", async () => {
      const ctx = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        headers: new Headers(),
        authKind: "session" as const,
      };
      await assertSystemSettingAccess(ctx);
      const { requireAdmin } = await import("~/lib/authorization.server");
      expect(requireAdmin).toHaveBeenCalledWith(ctx);
    });
  });
});
