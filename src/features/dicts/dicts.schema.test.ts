import { describe, expect, it } from "vitest";
import {
  createDictDataSchema,
  createDictTypeSchema,
  dictDataListQuerySchema,
  dictTypeListQuerySchema,
  updateDictDataSchema,
  updateDictTypeSchema,
} from "~/features/dicts/dicts.schema";

describe("dicts.schema", () => {
  describe("createDictTypeSchema", () => {
    it("accepts a valid type", () => {
      const parsed = createDictTypeSchema.parse({
        name: "Sex",
        code: "sex",
      });
      expect(parsed.status).toBe("enabled");
    });

    it("rejects invalid code", () => {
      expect(() => createDictTypeSchema.parse({ name: "Sex", code: "INVALID CODE" })).toThrow();
    });
  });

  describe("updateDictTypeSchema", () => {
    it("rejects empty name", () => {
      expect(() => updateDictTypeSchema.parse({ name: "" })).toThrow();
    });
  });

  describe("dictTypeListQuerySchema", () => {
    it("accepts defaults", () => {
      const parsed = dictTypeListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
    });
  });

  describe("createDictDataSchema", () => {
    it("accepts valid data", () => {
      const parsed = createDictDataSchema.parse({
        typeCode: "sex",
        label: "Male",
        value: "1",
      });
      expect(parsed.sort).toBe(0);
    });

    it("rejects empty label", () => {
      expect(() =>
        createDictDataSchema.parse({ typeCode: "sex", label: "", value: "1" }),
      ).toThrow();
    });
  });

  describe("updateDictDataSchema", () => {
    it("rejects negative sort", () => {
      expect(() => updateDictDataSchema.parse({ sort: -1 })).toThrow();
    });
  });

  describe("dictDataListQuerySchema", () => {
    it("accepts typeCode filter", () => {
      const parsed = dictDataListQuerySchema.parse({ typeCode: "sex" });
      expect(parsed.typeCode).toBe("sex");
    });
  });
});
