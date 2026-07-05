import { describe, expect, it } from "vitest";
import {
  createMenuSchema,
  menuListQuerySchema,
  updateMenuSchema,
} from "~/features/menus/menus.schema";

describe("menus.schema", () => {
  describe("createMenuSchema", () => {
    it("accepts a valid menu", () => {
      const parsed = createMenuSchema.parse({ name: "Dashboard" });
      expect(parsed.type).toBe("menu");
      expect(parsed.status).toBe("enabled");
    });

    it("rejects empty name", () => {
      expect(() => createMenuSchema.parse({ name: "" })).toThrow();
    });

    it("rejects unknown type", () => {
      expect(() => createMenuSchema.parse({ name: "X", type: "nope" })).toThrow();
    });
  });

  describe("updateMenuSchema", () => {
    it("rejects negative sort", () => {
      expect(() => updateMenuSchema.parse({ sort: -1 })).toThrow();
    });

    it("accepts icon", () => {
      const parsed = updateMenuSchema.parse({ icon: "home" });
      expect(parsed.icon).toBe("home");
    });
  });

  describe("menuListQuerySchema", () => {
    it("accepts type filter", () => {
      const parsed = menuListQuerySchema.parse({ type: "menu" });
      expect(parsed.type).toBe("menu");
    });

    it("rejects unknown type", () => {
      expect(() => menuListQuerySchema.parse({ type: "nope" })).toThrow();
    });
  });
});
