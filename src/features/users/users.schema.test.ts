import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  loginLogListQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
  userListQuerySchema,
} from "~/features/users/users.schema";

describe("users.schema", () => {
  describe("userListQuerySchema", () => {
    it("coerces pagination", () => {
      const parsed = userListQuerySchema.parse({ page: "2", pageSize: "10" });
      expect(parsed.page).toBe(2);
    });

    it("accepts roleId filter", () => {
      const parsed = userListQuerySchema.parse({
        roleId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(parsed.roleId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("accepts system role filter", () => {
      const parsed = userListQuerySchema.parse({ systemRole: "admin" });
      expect(parsed.systemRole).toBe("admin");
    });

    it("rejects bad roleId", () => {
      expect(() => userListQuerySchema.parse({ roleId: "not-uuid" })).toThrow();
    });
  });

  describe("updateUserSchema", () => {
    it("accepts partial updates", () => {
      const parsed = updateUserSchema.parse({ displayName: "x" });
      expect(parsed.displayName).toBe("x");
    });

    it("rejects bad email", () => {
      expect(() => updateUserSchema.parse({ email: "bad" })).toThrow();
    });
  });

  describe("changePasswordSchema", () => {
    it("accepts valid input", () => {
      const parsed = changePasswordSchema.parse({
        oldPassword: "oldpass1",
        newPassword: "newpass1",
      });
      expect(parsed.oldPassword).toBe("oldpass1");
    });

    it("rejects too-short password", () => {
      expect(() =>
        changePasswordSchema.parse({ oldPassword: "short", newPassword: "newpass1" }),
      ).toThrow();
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts valid uuid", () => {
      const parsed = resetPasswordSchema.parse({
        userId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(parsed.userId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("rejects non-uuid userId", () => {
      expect(() => resetPasswordSchema.parse({ userId: "not-uuid" })).toThrow();
    });

    it("rejects missing userId", () => {
      expect(() => resetPasswordSchema.parse({})).toThrow();
    });
  });

  describe("loginLogListQuerySchema", () => {
    it("defaults pageSize to 20", () => {
      const parsed = loginLogListQuerySchema.parse({});
      expect(parsed.pageSize).toBe(20);
    });
  });
});
