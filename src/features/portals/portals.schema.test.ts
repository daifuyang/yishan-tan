import { describe, expect, it } from "vitest";
import {
  createPortalSchema,
  portalListQuerySchema,
  portalThemeModeSchema,
  updatePortalSchema,
} from "~/features/portals/portals.schema";

describe("portals.schema", () => {
  describe("portalThemeModeSchema", () => {
    it("accepts light and dark", () => {
      expect(portalThemeModeSchema.parse("light")).toBe("light");
      expect(portalThemeModeSchema.parse("dark")).toBe("dark");
    });

    it("rejects unknown mode", () => {
      expect(() => portalThemeModeSchema.parse("auto")).toThrow();
    });
  });

  describe("createPortalSchema", () => {
    it("accepts a minimal valid payload", () => {
      const parsed = createPortalSchema.parse({
        name: "主门户",
        code: "main",
      });
      expect(parsed.name).toBe("主门户");
      expect(parsed.code).toBe("main");
      expect(parsed.themeMode).toBe("light");
      expect(parsed.status).toBe("enabled");
    });

    it("accepts 6-digit hex theme primary", () => {
      const parsed = createPortalSchema.parse({
        name: "主门户",
        code: "main",
        themePrimary: "#1677ff",
      });
      expect(parsed.themePrimary).toBe("#1677ff");
    });

    it("accepts 3-digit hex theme primary", () => {
      const parsed = createPortalSchema.parse({
        name: "主门户",
        code: "main",
        themePrimary: "#F0A",
      });
      expect(parsed.themePrimary).toBe("#F0A");
    });

    it("rejects bad theme primary format", () => {
      expect(() =>
        createPortalSchema.parse({
          name: "x",
          code: "main",
          themePrimary: "1677ff",
        }),
      ).toThrow();
      expect(() =>
        createPortalSchema.parse({
          name: "x",
          code: "main",
          themePrimary: "#GGGGGG",
        }),
      ).toThrow();
    });

    it("rejects bad code pattern", () => {
      expect(() =>
        createPortalSchema.parse({
          name: "门户",
          code: "Main Portal!",
        }),
      ).toThrow();
    });

    it("rejects uppercase code", () => {
      expect(() =>
        createPortalSchema.parse({
          name: "门户",
          code: "Main",
        }),
      ).toThrow();
    });

    it("accepts valid domain", () => {
      const parsed = createPortalSchema.parse({
        name: "门户",
        code: "main",
        domain: "portal.example.com",
      });
      expect(parsed.domain).toBe("portal.example.com");
    });

    it("rejects bad domain", () => {
      expect(() =>
        createPortalSchema.parse({
          name: "门户",
          code: "main",
          domain: "not a domain",
        }),
      ).toThrow();
    });
  });

  describe("updatePortalSchema", () => {
    it("accepts partial patches", () => {
      const parsed = updatePortalSchema.parse({ name: "改名" });
      expect(parsed.name).toBe("改名");
    });

    it("all fields optional", () => {
      expect(() => updatePortalSchema.parse({})).not.toThrow();
    });
  });

  describe("portalListQuerySchema", () => {
    it("defaults pagination", () => {
      const parsed = portalListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("coerces isDefault from string", () => {
      const parsed = portalListQuerySchema.parse({ isDefault: "true" });
      expect(parsed.isDefault).toBe(true);
    });

    it("keeps boolean isDefault", () => {
      const parsed = portalListQuerySchema.parse({ isDefault: true });
      expect(parsed.isDefault).toBe(true);
    });

    it("rejects bad pageSize", () => {
      expect(() => portalListQuerySchema.parse({ pageSize: "999" })).toThrow();
    });
  });
});
