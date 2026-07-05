import { describe, expect, it } from "vitest";
import {
  batchSetSystemOptionSchema,
  setSystemOptionSchema,
  systemOptionGroupCodeSchema,
  systemOptionKeySchema,
} from "~/features/system-settings/system-settings.schema";

describe("system-settings.schema", () => {
  describe("systemOptionKeySchema", () => {
    it.each(["site.title", "feature.flag_1", "config-key", "ok.key_1"])("accepts %s", (key) => {
      expect(() => systemOptionKeySchema.parse(key)).not.toThrow();
    });

    it.each(["INVALID KEY", "with space", "with/slash"])("rejects %s", (key) => {
      expect(() => systemOptionKeySchema.parse(key)).toThrow();
    });
  });

  describe("systemOptionGroupCodeSchema", () => {
    it.each(["site", "auth", "ui_theme", "upload"])("accepts %s", (code) => {
      expect(() => systemOptionGroupCodeSchema.parse(code)).not.toThrow();
    });

    it.each(["with space", "with-dash", "with.dot", "WITH/UPPER", ""])("rejects %s", (code) => {
      expect(() => systemOptionGroupCodeSchema.parse(code)).toThrow();
    });
  });

  describe("setSystemOptionSchema", () => {
    it("accepts valid input", () => {
      const parsed = setSystemOptionSchema.parse({ value: "1" });
      expect(parsed.value).toBe("1");
    });

    it("rejects too-long description", () => {
      expect(() =>
        setSystemOptionSchema.parse({ value: "1", description: "x".repeat(201) }),
      ).toThrow();
    });
  });

  describe("batchSetSystemOptionSchema", () => {
    it("requires at least one item", () => {
      expect(() => batchSetSystemOptionSchema.parse({ items: [] })).toThrow();
    });

    it("accepts multiple items", () => {
      const parsed = batchSetSystemOptionSchema.parse({
        items: [
          { key: "site.title", value: "Yishan" },
          { key: "site.locale", value: "zh-CN" },
        ],
      });
      expect(parsed.items).toHaveLength(2);
    });

    it("rejects more than 100 items", () => {
      const items = Array.from({ length: 101 }, (_, i) => ({
        key: `k.${i}`,
        value: "v",
      }));
      expect(() => batchSetSystemOptionSchema.parse({ items })).toThrow();
    });
  });
});
