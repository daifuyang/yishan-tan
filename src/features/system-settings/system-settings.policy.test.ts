import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/authorization.server", () => ({
  isSystemAdmin: vi.fn(() => true),
  requireSelfOrAdmin: vi.fn(),
  SYSTEM_ADMIN_IDS: [],
}));

const assertPermissionService = vi.fn().mockResolvedValue(undefined);
vi.mock("~/features/permissions/permissions.service", () => ({ assertPermissionService }));

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
    it("requires the settings read permission", async () => {
      const ctx = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        headers: new Headers(),
        authKind: "session" as const,
      };
      await assertSystemSettingAccess(ctx);
      expect(assertPermissionService).toHaveBeenCalledWith(ctx, "settings:read");
    });
  });
});
