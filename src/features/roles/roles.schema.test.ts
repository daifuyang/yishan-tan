import { describe, expect, it } from "vitest";
import {
  createRoleSchema,
  roleListQuerySchema,
  updateRoleSchema,
} from "~/features/roles/roles.schema";

describe("roles.schema", () => {
  describe("createRoleSchema", () => {
    it("accepts a valid role", () => {
      const parsed = createRoleSchema.parse({
        name: "Admin",
        description: "system admin",
      });
      expect(parsed.status).toBe("enabled");
    });

    it("rejects too-long name", () => {
      expect(() => createRoleSchema.parse({ name: "x".repeat(51) })).toThrow();
    });

    it("accepts menuIds", () => {
      const parsed = createRoleSchema.parse({
        name: "Admin",
        menuIds: ["123e4567-e89b-12d3-a456-426614174000"],
      });
      expect(parsed.menuIds).toHaveLength(1);
    });
  });

  describe("updateRoleSchema", () => {
    it("accepts partial updates", () => {
      const parsed = updateRoleSchema.parse({ name: "Editor" });
      expect(parsed.name).toBe("Editor");
    });

    it("rejects empty name", () => {
      expect(() => updateRoleSchema.parse({ name: "" })).toThrow();
    });
  });

  describe("roleListQuerySchema", () => {
    it("coerces pagination", () => {
      const parsed = roleListQuerySchema.parse({ page: "3", pageSize: "5" });
      expect(parsed.page).toBe(3);
      expect(parsed.pageSize).toBe(5);
    });

    it("rejects out-of-range pageSize", () => {
      expect(() => roleListQuerySchema.parse({ pageSize: "500" })).toThrow();
    });

    it("accepts keyword", () => {
      const parsed = roleListQuerySchema.parse({ keyword: "admin" });
      expect(parsed.keyword).toBe("admin");
    });
  });
});
