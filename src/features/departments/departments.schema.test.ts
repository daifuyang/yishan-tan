import { describe, expect, it } from "vitest";
import {
  createDepartmentSchema,
  departmentListQuerySchema,
  updateDepartmentSchema,
} from "~/features/departments/departments.schema";

describe("departments.schema", () => {
  describe("createDepartmentSchema", () => {
    it("accepts a valid department", () => {
      const parsed = createDepartmentSchema.parse({
        name: "Tech",
        code: "tech",
      });
      expect(parsed.status).toBe("enabled");
      expect(parsed.sort).toBe(0);
    });

    it("rejects invalid code characters", () => {
      expect(() => createDepartmentSchema.parse({ name: "Tech", code: "INVALID CODE" })).toThrow();
    });

    it("rejects uppercase code letters", () => {
      expect(() => createDepartmentSchema.parse({ name: "Tech", code: "Tech" })).toThrow();
    });

    it("accepts parentId", () => {
      const parsed = createDepartmentSchema.parse({
        name: "Eng",
        code: "eng",
        parentId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(parsed.parentId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("rejects name longer than 50 chars", () => {
      expect(() => createDepartmentSchema.parse({ name: "x".repeat(51), code: "abc" })).toThrow();
    });

    it("rejects non-uuid parentId", () => {
      expect(() =>
        createDepartmentSchema.parse({ name: "Eng", code: "eng", parentId: "not-uuid" }),
      ).toThrow();
    });
  });

  describe("updateDepartmentSchema", () => {
    it("accepts partial updates", () => {
      const parsed = updateDepartmentSchema.parse({ name: "NewName" });
      expect(parsed.name).toBe("NewName");
    });

    it("rejects negative sort", () => {
      expect(() => updateDepartmentSchema.parse({ sort: -1 })).toThrow();
    });

    it("rejects sort > 9999", () => {
      expect(() => updateDepartmentSchema.parse({ sort: 10000 })).toThrow();
    });

    it("allows null parentId", () => {
      const parsed = updateDepartmentSchema.parse({ parentId: null });
      expect(parsed.parentId).toBeNull();
    });
  });

  describe("departmentListQuerySchema", () => {
    it("accepts defaults", () => {
      const parsed = departmentListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("coerces page and pageSize from strings", () => {
      const parsed = departmentListQuerySchema.parse({ page: "2", pageSize: "50" });
      expect(parsed.page).toBe(2);
      expect(parsed.pageSize).toBe(50);
    });
  });
});
