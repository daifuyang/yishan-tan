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
  });
});
