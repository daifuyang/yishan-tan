import { describe, expect, it } from "vitest";
import { listLoginLogsSchema } from "~/features/login-logs/login-logs.schema";

describe("login-logs.schema", () => {
  describe("listLoginLogsSchema", () => {
    it("coerces pagination defaults", () => {
      const parsed = listLoginLogsSchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("accepts status filter", () => {
      const parsed = listLoginLogsSchema.parse({ status: "success" });
      expect(parsed.status).toBe("success");
    });

    it("rejects invalid status", () => {
      expect(() => listLoginLogsSchema.parse({ status: "pending" })).toThrow();
    });

    it("accepts userId as uuid", () => {
      const parsed = listLoginLogsSchema.parse({
        userId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(parsed.userId).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("rejects malformed userId", () => {
      expect(() => listLoginLogsSchema.parse({ userId: "not-uuid" })).toThrow();
    });

    it("accepts keyword", () => {
      const parsed = listLoginLogsSchema.parse({ keyword: "admin" });
      expect(parsed.keyword).toBe("admin");
    });

    it("trims keyword whitespace", () => {
      const parsed = listLoginLogsSchema.parse({ keyword: "  hello  " });
      expect(parsed.keyword).toBe("hello");
    });

    it("accepts createdFrom and createdTo", () => {
      const parsed = listLoginLogsSchema.parse({
        createdFrom: "2026-01-01",
        createdTo: "2026-12-31",
      });
      expect(parsed.createdFrom).toBe("2026-01-01");
      expect(parsed.createdTo).toBe("2026-12-31");
    });

    it("rejects out-of-range pageSize", () => {
      expect(() => listLoginLogsSchema.parse({ pageSize: "500" })).toThrow();
    });
  });
});
