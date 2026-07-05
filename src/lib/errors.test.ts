import { describe, expect, it } from "vitest";
import { Errors, isServerError } from "~/lib/errors";

describe("errors", () => {
  it("builds typed errors", () => {
    const e = Errors.invalid("bad", { field: "x" });
    expect(e.code).toBe("INVALID");
    expect(e.statusCode).toBe(400);
    expect(e.details).toEqual({ field: "x" });
    expect(isServerError(e)).toBe(true);
  });

  it("classifies rate-limit errors", () => {
    const e = Errors.rateLimited(new Date("2026-01-01T00:00:00Z"));
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.statusCode).toBe(429);
  });
});
