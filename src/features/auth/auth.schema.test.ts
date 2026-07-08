import { describe, expect, it } from "vitest";
import { createSessionSchema, createUserSchema } from "~/features/auth/auth.schema";

describe("auth.schema", () => {
  describe("createSessionSchema", () => {
    it("accepts valid email credentials", () => {
      const parsed = createSessionSchema.parse({
        account: "user@example.com",
        password: "validpass1",
      });
      expect(parsed.account).toBe("user@example.com");
    });

    it("accepts valid username credentials", () => {
      const parsed = createSessionSchema.parse({
        account: "user_01",
        password: "validpass1",
      });
      expect(parsed.account).toBe("user_01");
    });

    it("rejects malformed email with @", () => {
      expect(() =>
        createSessionSchema.parse({ account: "not-an-email@bad", password: "validpass1" }),
      ).toThrow();
    });

    it("rejects too-short account", () => {
      expect(() => createSessionSchema.parse({ account: "ab", password: "validpass1" })).toThrow();
    });

    it("rejects username with invalid characters", () => {
      expect(() =>
        createSessionSchema.parse({ account: "bad name", password: "validpass1" }),
      ).toThrow();
    });

    it("rejects too-short password", () => {
      expect(() =>
        createSessionSchema.parse({ account: "user@example.com", password: "short" }),
      ).toThrow();
    });
  });

  describe("createUserSchema", () => {
    it("accepts valid input", () => {
      const parsed = createUserSchema.parse({
        email: "user@example.com",
        username: "user_01",
        password: "validpass1",
        displayName: "User 01",
      });
      expect(parsed.username).toBe("user_01");
    });

    it("rejects invalid username characters", () => {
      expect(() =>
        createUserSchema.parse({
          email: "user@example.com",
          username: "bad name",
          password: "validpass1",
        }),
      ).toThrow();
    });

    it("rejects too-short username", () => {
      expect(() =>
        createUserSchema.parse({
          email: "user@example.com",
          username: "ab",
          password: "validpass1",
        }),
      ).toThrow();
    });

    it("rejects too-long password", () => {
      expect(() =>
        createUserSchema.parse({
          email: "user@example.com",
          username: "user_01",
          password: "x".repeat(129),
        }),
      ).toThrow();
    });

    it("accepts roleIds as array of uuids", () => {
      const parsed = createUserSchema.parse({
        email: "user@example.com",
        username: "user_01",
        password: "validpass1",
        roleIds: ["11111111-1111-4111-8111-111111111111"],
      });
      expect(parsed.roleIds).toEqual(["11111111-1111-4111-8111-111111111111"]);
    });

    it("accepts empty roleIds array (语义:清空)", () => {
      const parsed = createUserSchema.parse({
        email: "user@example.com",
        username: "user_01",
        password: "validpass1",
        roleIds: [],
      });
      expect(parsed.roleIds).toEqual([]);
    });

    it("accepts omitted roleIds (向后兼容旧客户端)", () => {
      const parsed = createUserSchema.parse({
        email: "user@example.com",
        username: "user_01",
        password: "validpass1",
      });
      expect(parsed.roleIds).toBeUndefined();
    });

    it("rejects roleIds that are not an array", () => {
      expect(() =>
        createUserSchema.parse({
          email: "user@example.com",
          username: "user_01",
          password: "validpass1",
          roleIds: "not-an-array",
        }),
      ).toThrow();
    });

    it("rejects roleIds entries that are not uuid", () => {
      expect(() =>
        createUserSchema.parse({
          email: "user@example.com",
          username: "user_01",
          password: "validpass1",
          roleIds: ["not-a-uuid"],
        }),
      ).toThrow();
    });
  });
});
