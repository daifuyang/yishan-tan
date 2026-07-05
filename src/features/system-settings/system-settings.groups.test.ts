import { describe, expect, it } from "vitest";
import {
  SYSTEM_OPTION_GROUPS,
  deserializeOptionValue,
  findSystemOptionGroup,
  serializeOptionValue,
} from "~/features/system-settings/system-settings.groups";

describe("system-settings.groups", () => {
  describe("SYSTEM_OPTION_GROUPS", () => {
    it("exposes at least one group", () => {
      expect(SYSTEM_OPTION_GROUPS.length).toBeGreaterThan(0);
    });

    it("every option key is unique across all groups", () => {
      const keys = new Set<string>();
      for (const g of SYSTEM_OPTION_GROUPS) {
        for (const opt of g.options) {
          expect(keys.has(opt.key)).toBe(false);
          keys.add(opt.key);
        }
      }
    });

    it("every group has a non-empty code and name", () => {
      for (const g of SYSTEM_OPTION_GROUPS) {
        expect(g.code.length).toBeGreaterThan(0);
        expect(g.name.length).toBeGreaterThan(0);
      }
    });

    it("select options declare a dictCode", () => {
      for (const g of SYSTEM_OPTION_GROUPS) {
        for (const opt of g.options) {
          if (opt.type === "select") {
            expect(opt.dictCode).toBeTruthy();
          }
        }
      }
    });
  });

  describe("findSystemOptionGroup", () => {
    it("returns matching group", () => {
      const g = findSystemOptionGroup("site");
      expect(g?.code).toBe("site");
    });

    it("returns undefined for unknown code", () => {
      expect(findSystemOptionGroup("does-not-exist")).toBeUndefined();
    });
  });

  describe("serializeOptionValue", () => {
    it("serializes boolean as 'true' / 'false'", () => {
      expect(serializeOptionValue(true)).toBe("true");
      expect(serializeOptionValue(false)).toBe("false");
    });

    it("serializes number as JSON number string", () => {
      expect(serializeOptionValue(0)).toBe("0");
      expect(serializeOptionValue(42)).toBe("42");
    });

    it("serializes string as-is", () => {
      expect(serializeOptionValue("hello")).toBe("hello");
    });

    it("serializes null/undefined as empty string", () => {
      expect(serializeOptionValue(null)).toBe("");
      expect(serializeOptionValue(undefined)).toBe("");
    });

    it("serializes object via JSON.stringify", () => {
      expect(serializeOptionValue({ a: 1 })).toBe('{"a":1}');
    });
  });

  describe("deserializeOptionValue", () => {
    it("parses JSON-encoded values", () => {
      expect(deserializeOptionValue("true")).toBe(true);
      expect(deserializeOptionValue("false")).toBe(false);
      expect(deserializeOptionValue("42")).toBe(42);
      expect(deserializeOptionValue('{"a":1}')).toEqual({ a: 1 });
    });

    it("returns empty string for null/undefined/empty", () => {
      expect(deserializeOptionValue(null)).toBe("");
      expect(deserializeOptionValue(undefined)).toBe("");
      expect(deserializeOptionValue("")).toBe("");
    });

    it("falls back to raw string when JSON.parse fails", () => {
      expect(deserializeOptionValue("not-json")).toBe("not-json");
      expect(deserializeOptionValue("site.name")).toBe("site.name");
    });
  });
});
