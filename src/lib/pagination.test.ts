import { describe, expect, it } from "vitest";
import { parsePage, toPage } from "~/lib/pagination";

describe("pagination", () => {
  it("parses defaults", () => {
    const parsed = parsePage({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  it("coerces numeric strings", () => {
    const parsed = parsePage({ page: "2", pageSize: "50" });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
  });

  it("rejects invalid values", () => {
    expect(() => parsePage({ page: "0" })).toThrow();
    expect(() => parsePage({ pageSize: "0" })).toThrow();
  });

  it("builds a page envelope", () => {
    const page = toPage([{ id: "1" }], 1, { page: 1, pageSize: 20 });
    expect(page.items).toEqual([{ id: "1" }]);
    expect(page.total).toBe(1);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(20);
  });
});
