import { describe, expect, it } from "vitest";

import { endOfDayIso, normalizeDateRange, startOfDayIso } from "./date-range";

describe("startOfDayIso", () => {
  it("YYYY-MM-DD → T00:00:00.000Z", () => {
    expect(startOfDayIso("2026-07-08")).toBe("2026-07-08T00:00:00.000Z");
  });

  it("非法输入返回 undefined", () => {
    expect(startOfDayIso("2026/07/08")).toBeUndefined();
    expect(startOfDayIso("")).toBeUndefined();
    expect(startOfDayIso("2026-7-8")).toBeUndefined();
  });
});

describe("endOfDayIso", () => {
  it("YYYY-MM-DD → T23:59:59.999Z", () => {
    expect(endOfDayIso("2026-07-08")).toBe("2026-07-08T23:59:59.999Z");
  });

  it("非法输入返回 undefined", () => {
    expect(endOfDayIso("2026-07-08T14:30")).toBeUndefined();
    expect(endOfDayIso("not-a-date")).toBeUndefined();
  });
});

describe("normalizeDateRange", () => {
  it("null 输入 → 两个 undefined", () => {
    expect(normalizeDateRange(null)).toEqual({
      createdFrom: undefined,
      createdTo: undefined,
    });
  });

  it("空串字段当作缺失", () => {
    expect(normalizeDateRange({ start: "", end: "" })).toEqual({
      createdFrom: undefined,
      createdTo: undefined,
    });
  });

  it("完整区间展开成 start/end ISO datetime", () => {
    expect(normalizeDateRange({ start: "2026-07-08", end: "2026-07-08" })).toEqual({
      createdFrom: "2026-07-08T00:00:00.000Z",
      createdTo: "2026-07-08T23:59:59.999Z",
    });
  });

  it("只设 start", () => {
    expect(normalizeDateRange({ start: "2026-07-01", end: null })).toEqual({
      createdFrom: "2026-07-01T00:00:00.000Z",
      createdTo: undefined,
    });
  });

  it("end < start 时自动 swap", () => {
    expect(normalizeDateRange({ start: "2026-07-10", end: "2026-07-08" })).toEqual({
      createdFrom: "2026-07-08T00:00:00.000Z",
      createdTo: "2026-07-10T23:59:59.999Z",
    });
  });

  it("end 等于 start(同日单日区间)", () => {
    expect(normalizeDateRange({ start: "2026-07-08", end: "2026-07-08" })).toEqual({
      createdFrom: "2026-07-08T00:00:00.000Z",
      createdTo: "2026-07-08T23:59:59.999Z",
    });
  });
});
