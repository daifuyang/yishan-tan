import { describe, expect, it } from "vitest";
import {
  createPostSchema,
  postListQuerySchema,
  updatePostSchema,
} from "~/features/posts/posts.schema";

const DEPT_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("posts.schema", () => {
  describe("createPostSchema", () => {
    it("accepts a valid post", () => {
      const parsed = createPostSchema.parse({
        name: "前端工程师",
        departmentId: DEPT_UUID,
      });
      expect(parsed.status).toBe("enabled");
      expect(parsed.sort).toBe(0);
    });

    it("accepts explicit sort and status", () => {
      const parsed = createPostSchema.parse({
        name: "后端工程师",
        departmentId: DEPT_UUID,
        sort: 10,
        status: "disabled",
      });
      expect(parsed.sort).toBe(10);
      expect(parsed.status).toBe("disabled");
    });

    it("rejects empty name", () => {
      expect(() => createPostSchema.parse({ name: "", departmentId: DEPT_UUID })).toThrow();
    });

    it("rejects name longer than 50 chars", () => {
      expect(() =>
        createPostSchema.parse({ name: "x".repeat(51), departmentId: DEPT_UUID }),
      ).toThrow();
    });

    it("rejects non-uuid departmentId", () => {
      expect(() => createPostSchema.parse({ name: "X", departmentId: "not-uuid" })).toThrow();
    });

    it("rejects missing departmentId", () => {
      expect(() => createPostSchema.parse({ name: "X" })).toThrow();
    });

    it("rejects negative sort", () => {
      expect(() =>
        createPostSchema.parse({ name: "X", departmentId: DEPT_UUID, sort: -1 }),
      ).toThrow();
    });

    it("rejects sort > 9999", () => {
      expect(() =>
        createPostSchema.parse({ name: "X", departmentId: DEPT_UUID, sort: 10000 }),
      ).toThrow();
    });
  });

  describe("updatePostSchema", () => {
    it("accepts partial updates", () => {
      const parsed = updatePostSchema.parse({ name: "新名称" });
      expect(parsed.name).toBe("新名称");
    });

    it("accepts empty partial update", () => {
      const parsed = updatePostSchema.parse({});
      expect(parsed.name).toBeUndefined();
    });

    it("rejects negative sort", () => {
      expect(() => updatePostSchema.parse({ sort: -1 })).toThrow();
    });

    it("rejects sort > 9999", () => {
      expect(() => updatePostSchema.parse({ sort: 10000 })).toThrow();
    });

    it("rejects empty name when provided", () => {
      expect(() => updatePostSchema.parse({ name: "" })).toThrow();
    });
  });

  describe("postListQuerySchema", () => {
    it("accepts defaults", () => {
      const parsed = postListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("coerces page and pageSize from strings", () => {
      const parsed = postListQuerySchema.parse({ page: "2", pageSize: "50" });
      expect(parsed.page).toBe(2);
      expect(parsed.pageSize).toBe(50);
    });

    it("accepts optional filters", () => {
      const parsed = postListQuerySchema.parse({
        keyword: "工程师",
        departmentId: DEPT_UUID,
        sortMin: 5,
        status: "enabled",
      });
      expect(parsed.keyword).toBe("工程师");
      expect(parsed.departmentId).toBe(DEPT_UUID);
      expect(parsed.sortMin).toBe(5);
      expect(parsed.status).toBe("enabled");
    });
  });
});
