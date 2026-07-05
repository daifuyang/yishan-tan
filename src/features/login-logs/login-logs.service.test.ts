import { describe, expect, it } from "vitest";
import { buildListLoginLogsWhere, toLoginLogDto } from "~/features/login-logs/login-logs.service";
import type { LoginLogDto } from "~/features/login-logs/login-logs.types";

describe("login-logs.service", () => {
  describe("toLoginLogDto", () => {
    it("maps a db row to DTO with iso timestamp", () => {
      const row = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "123e4567-e89b-12d3-a456-426614174001",
        username: "alice",
        status: "success",
        message: "ok",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      };
      const dto: LoginLogDto = toLoginLogDto(row);
      expect(dto).toEqual({
        id: row.id,
        userId: row.userId,
        username: "alice",
        status: "success",
        message: "ok",
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });

    it("preserves null fields", () => {
      const dto = toLoginLogDto({
        id: "id",
        userId: null,
        username: null,
        status: "failed",
        message: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date("2026-02-02T03:04:05.000Z"),
      });
      expect(dto.userId).toBeNull();
      expect(dto.username).toBeNull();
      expect(dto.message).toBeNull();
      expect(dto.ipAddress).toBeNull();
      expect(dto.userAgent).toBeNull();
      expect(dto.status).toBe("failed");
      expect(dto.createdAt).toBe("2026-02-02T03:04:05.000Z");
    });
  });

  describe("buildListLoginLogsWhere", () => {
    it("returns empty array when no filters provided", () => {
      expect(buildListLoginLogsWhere({})).toEqual([]);
    });

    it("ignores empty keyword", () => {
      expect(buildListLoginLogsWhere({ keyword: "" })).toEqual([]);
    });

    it("includes clause for each provided filter", () => {
      const sqls = buildListLoginLogsWhere({
        keyword: "alice",
        status: "success",
        userId: "123e4567-e89b-12d3-a456-426614174000",
        createdFrom: "2026-01-01T00:00:00Z",
        createdTo: "2026-12-31T23:59:59Z",
      });
      expect(sqls).toHaveLength(5);
    });

    it("ignores unparseable dates silently", () => {
      const sqls = buildListLoginLogsWhere({
        createdFrom: "not-a-date",
        createdTo: "also-not-a-date",
      });
      expect(sqls).toEqual([]);
    });
  });
});
