import { describe, expect, it } from "vitest";
import { __test__normalizeOptionalString } from "~/features/portals/portals.service";

describe("portals.service.normalizeOptionalString", () => {
  it("returns null for nullish input", () => {
    expect(__test__normalizeOptionalString(null)).toBeNull();
    expect(__test__normalizeOptionalString(undefined)).toBeNull();
  });

  it("returns null for empty / whitespace-only strings", () => {
    expect(__test__normalizeOptionalString("")).toBeNull();
    expect(__test__normalizeOptionalString("   ")).toBeNull();
  });

  it("trims surrounding whitespace for non-empty values", () => {
    expect(__test__normalizeOptionalString("  portal.example.com  ")).toBe("portal.example.com");
  });

  it("preserves internal spaces", () => {
    expect(__test__normalizeOptionalString(" 主门户 ")).toBe("主门户");
  });

  it("does not mutate the input reference", () => {
    const input = "  x  ";
    const out = __test__normalizeOptionalString(input);
    expect(input).toBe("  x  ");
    expect(out).toBe("x");
  });
});
