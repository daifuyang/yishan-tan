import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { Errors, ServerError } from "~/lib/errors";
import { handleApiError, json, ok, page } from "~/server/http";

describe("http", () => {
  describe("json", () => {
    it("serializes JSON with content-type", async () => {
      const res = json({ a: 1 });
      expect(res.headers.get("content-type")).toContain("application/json");
      const body = (await res.json()) as { a: number };
      expect(body.a).toBe(1);
    });

    it("preserves extra headers", async () => {
      const res = json({ a: 1 }, { status: 201, headers: { "x-test": "yes" } });
      expect(res.headers.get("x-test")).toBe("yes");
      expect(res.status).toBe(201);
    });
  });

  describe("ok", () => {
    it("wraps data", async () => {
      const res = ok({ items: [1] });
      const body = (await res.json()) as { ok: boolean; data: { items: number[] } };
      expect(body.ok).toBe(true);
      expect(body.data.items).toEqual([1]);
    });
  });

  describe("page", () => {
    it("builds paginated envelope", async () => {
      const res = page([{ id: "1" }], 10, 1, 5);
      const body = (await res.json()) as {
        ok: boolean;
        data: { items: Array<{ id: string }> };
        meta: { total: number; page: number; pageSize: number };
      };
      expect(body.ok).toBe(true);
      expect(body.data.items).toEqual([{ id: "1" }]);
      expect(body.meta).toEqual({ total: 10, page: 1, pageSize: 5 });
    });
  });

  describe("handleApiError", () => {
    it("maps ServerError", async () => {
      const res = handleApiError(Errors.notFound("missing"));
      expect(res.status).toBe(404);
      const body = (await res.json()) as { ok: boolean; code: string; error: string };
      expect(body.ok).toBe(false);
      expect(body.code).toBe("NOT_FOUND");
      expect(body.error).toBe("missing");
    });

    it("maps ZodError to 400", async () => {
      const zodErr = new ZodError([
        {
          code: "invalid_type",
          path: ["x"],
          message: "bad",
          expected: "string",
        },
      ]);
      const res = handleApiError(zodErr);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok: boolean; code: string };
      expect(body.code).toBe("INVALID");
    });

    it("falls back to 500 for unknown errors", async () => {
      const res = handleApiError(new Error("boom"));
      expect(res.status).toBe(500);
      const body = (await res.json()) as { ok: boolean; code: string; error: string };
      expect(body.code).toBe("INTERNAL");
      expect(body.error).toBe("boom");
    });

    it("includes rate-limit resetAt details", async () => {
      const res = handleApiError(Errors.rateLimited(new Date("2026-01-01T00:00:00Z")));
      expect(res.status).toBe(429);
      const body = (await res.json()) as {
        ok: boolean;
        code: string;
        details: { resetAt: number };
      };
      expect(body.code).toBe("RATE_LIMITED");
      expect(typeof body.details.resetAt).toBe("number");
    });

    it("serializes details for generic ServerError", async () => {
      const e = new ServerError("TEST", "x", 418, { hint: "test" });
      const res = handleApiError(e);
      const body = (await res.json()) as { code: string; details: { hint: string } };
      expect(body.code).toBe("TEST");
      expect(body.details.hint).toBe("test");
    });
  });
});
