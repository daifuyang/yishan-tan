import { describe, expect, it } from "vitest";
import {
  createRoleSchema,
  dataScopeSchema,
  roleListQuerySchema,
  updateRoleSchema,
} from "~/features/roles/roles.schema";

describe("roles.schema", () => {
  describe("dataScopeSchema", () => {
    it("accepts each of the 5 valid scopes", () => {
      for (const v of ["1", "2", "3", "4", "5"] as const) {
        expect(dataScopeSchema.parse(v)).toBe(v);
      }
    });

    it("rejects unknown scope", () => {
      expect(() => dataScopeSchema.parse("6")).toThrow();
      expect(() => dataScopeSchema.parse("")).toThrow();
    });
  });

  describe("createRoleSchema", () => {
    it("accepts a valid role and defaults dataScope to '1'", () => {
      const parsed = createRoleSchema.parse({
        name: "Admin",
        description: "system admin",
      });
      expect(parsed.status).toBe("enabled");
      expect(parsed.dataScope).toBe("1");
    });

    it("rejects empty name", () => {
      expect(() => createRoleSchema.parse({ name: "" })).toThrow();
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

    it("accepts explicit dataScope", () => {
      const parsed = createRoleSchema.parse({ name: "Admin", dataScope: "3" });
      expect(parsed.dataScope).toBe("3");
    });

    it("rejects invalid dataScope", () => {
      expect(() => createRoleSchema.parse({ name: "Admin", dataScope: "9" })).toThrow();
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

    it("accepts dataScope change", () => {
      const parsed = updateRoleSchema.parse({ dataScope: "2" });
      expect(parsed.dataScope).toBe("2");
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
