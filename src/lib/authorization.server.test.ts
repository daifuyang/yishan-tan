import { afterEach, describe, expect, it, vi } from "vitest";

const ADMIN_ID = "123e4567-e89b-12d3-a456-426614174aaa";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174001";
const OTHER_ID = "123e4567-e89b-12d3-a456-426614174002";

const reloadModule = async () => {
  vi.resetModules();
  return import("~/lib/authorization.server");
};

describe("authorization.server", () => {
  const originalEnv = process.env.SYSTEM_ADMIN_IDS;

  afterEach(() => {
    if (originalEnv === undefined) {
      Reflect.deleteProperty(process.env, "SYSTEM_ADMIN_IDS");
    } else {
      process.env.SYSTEM_ADMIN_IDS = originalEnv;
    }
  });

  describe("SYSTEM_ADMIN_IDS", () => {
    it("parses comma-separated values", async () => {
      process.env.SYSTEM_ADMIN_IDS = "id1, id2 ,id3";
      const mod = await reloadModule();
      expect(mod.SYSTEM_ADMIN_IDS).toEqual(["id1", "id2", "id3"]);
    });

    it("returns empty when env is unset", async () => {
      Reflect.deleteProperty(process.env, "SYSTEM_ADMIN_IDS");
      const mod = await reloadModule();
      expect(mod.SYSTEM_ADMIN_IDS).toEqual([]);
    });

    it("ignores blank entries", async () => {
      process.env.SYSTEM_ADMIN_IDS = "id1,, ,id2";
      const mod = await reloadModule();
      expect(mod.SYSTEM_ADMIN_IDS).toEqual(["id1", "id2"]);
    });
  });

  describe("requireAdmin", () => {
    it("passes when ctx userId is a system admin", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      const ctx = {
        userId: ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(mod.requireAdmin(ctx)).resolves.toBeUndefined();
    });

    it("rejects when ctx userId is not a system admin and env is configured", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      const ctx = {
        userId: OTHER_ID,
        headers: new Headers(),
        authKind: "session" as const,
        role: "admin" as const,
      };
      // env 显式配置时，不会回退 DB role —— 防"白名单被绕过"
      await expect(mod.requireAdmin(ctx)).rejects.toThrow();
    });

    it("falls back to ctx.role when env is empty (dev convenience)", async () => {
      Reflect.deleteProperty(process.env, "SYSTEM_ADMIN_IDS");
      const mod = await reloadModule();
      const adminCtx = {
        userId: OTHER_ID,
        headers: new Headers(),
        authKind: "session" as const,
        role: "admin" as const,
      };
      const memberCtx = {
        userId: OTHER_ID,
        headers: new Headers(),
        authKind: "session" as const,
        role: "member" as const,
      };
      await expect(mod.requireAdmin(adminCtx)).resolves.toBeUndefined();
      await expect(mod.requireAdmin(memberCtx)).rejects.toThrow();
    });

    it("rejects when env is empty and ctx.role is missing", async () => {
      Reflect.deleteProperty(process.env, "SYSTEM_ADMIN_IDS");
      const mod = await reloadModule();
      const ctx = {
        userId: OTHER_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(mod.requireAdmin(ctx)).rejects.toThrow();
    });
  });

  describe("requireSelfOrAdmin", () => {
    it("passes when ctx userId equals ownerId", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      const ctx = {
        userId: OWNER_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(mod.requireSelfOrAdmin(ctx, OWNER_ID)).resolves.toBeUndefined();
    });

    it("passes when ctx userId is a system admin", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      const ctx = {
        userId: ADMIN_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(mod.requireSelfOrAdmin(ctx, OWNER_ID)).resolves.toBeUndefined();
    });

    it("rejects otherwise", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      const ctx = {
        userId: OTHER_ID,
        headers: new Headers(),
        authKind: "session" as const,
      };
      await expect(mod.requireSelfOrAdmin(ctx, OWNER_ID)).rejects.toThrow();
    });
  });

  describe("isSystemAdmin", () => {
    it("returns true for whitelisted userId", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      expect(
        mod.isSystemAdmin({
          userId: ADMIN_ID,
          headers: new Headers(),
          authKind: "session",
        }),
      ).toBe(true);
    });

    it("returns false for non-whitelisted when env is configured", async () => {
      process.env.SYSTEM_ADMIN_IDS = ADMIN_ID;
      const mod = await reloadModule();
      expect(
        mod.isSystemAdmin({
          userId: OTHER_ID,
          headers: new Headers(),
          authKind: "session",
          role: "admin",
        }),
      ).toBe(false);
    });

    it("falls back to ctx.role when env is empty", async () => {
      Reflect.deleteProperty(process.env, "SYSTEM_ADMIN_IDS");
      const mod = await reloadModule();
      expect(
        mod.isSystemAdmin({
          userId: OTHER_ID,
          headers: new Headers(),
          authKind: "session",
          role: "admin",
        }),
      ).toBe(true);
      expect(
        mod.isSystemAdmin({
          userId: OTHER_ID,
          headers: new Headers(),
          authKind: "session",
          role: "member",
        }),
      ).toBe(false);
    });
  });
});
