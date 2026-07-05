import { describe, expect, it } from "vitest";
import {
  attachmentCategorySchema,
  attachmentIdSchema,
  attachmentListQuerySchema,
  categorizeByMime,
  recordAttachmentInputSchema,
} from "~/features/attachments/attachments.schema";

describe("attachments.schema", () => {
  describe("attachmentCategorySchema", () => {
    it("accepts every category", () => {
      for (const v of ["image", "video", "document", "audio", "other"] as const) {
        expect(attachmentCategorySchema.parse(v)).toBe(v);
      }
    });

    it("rejects unknown category", () => {
      expect(() => attachmentCategorySchema.parse("archive")).toThrow();
    });
  });

  describe("attachmentListQuerySchema", () => {
    it("defaults pagination", () => {
      const parsed = attachmentListQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.pageSize).toBe(20);
    });

    it("accepts category filter", () => {
      const parsed = attachmentListQuerySchema.parse({ category: "image" });
      expect(parsed.category).toBe("image");
    });

    it("accepts mime prefix filter", () => {
      const parsed = attachmentListQuerySchema.parse({ mime: "image" });
      expect(parsed.mime).toBe("image");
    });

    it("rejects bad uploaderId", () => {
      expect(() => attachmentListQuerySchema.parse({ uploaderId: "not-uuid" })).toThrow();
    });
  });

  describe("attachmentIdSchema", () => {
    it("requires uuid", () => {
      expect(() => attachmentIdSchema.parse({ id: "abc" })).toThrow();
      const parsed = attachmentIdSchema.parse({
        id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(parsed.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    });
  });

  describe("categorizeByMime", () => {
    it("classifies image/*", () => {
      expect(categorizeByMime("image/png")).toBe("image");
      expect(categorizeByMime("IMAGE/JPEG")).toBe("image");
    });

    it("classifies video/*", () => {
      expect(categorizeByMime("video/mp4")).toBe("video");
    });

    it("classifies audio/*", () => {
      expect(categorizeByMime("audio/mpeg")).toBe("audio");
    });

    it("classifies text/* and application/* as document", () => {
      expect(categorizeByMime("text/plain")).toBe("document");
      expect(categorizeByMime("application/pdf")).toBe("document");
      expect(categorizeByMime("application/json")).toBe("document");
    });

    it("falls back to other for unknown or empty", () => {
      expect(categorizeByMime("")).toBe("other");
      expect(categorizeByMime(undefined)).toBe("other");
      expect(categorizeByMime(null)).toBe("other");
      expect(categorizeByMime("font/woff2")).toBe("other");
    });
  });

  describe("recordAttachmentInputSchema", () => {
    it("accepts minimal valid payload", () => {
      const parsed = recordAttachmentInputSchema.parse({
        storageKey: "2026/07/05/abc-foo.png",
        url: "/uploads/2026/07/05/abc-foo.png",
        name: "foo.png",
        mime: "image/png",
        size: 1234,
        category: "image",
      });
      expect(parsed.category).toBe("image");
      expect(parsed.uploaderId).toBeUndefined();
    });

    it("rejects empty name", () => {
      expect(() =>
        recordAttachmentInputSchema.parse({
          storageKey: "k",
          url: "u",
          name: "",
          mime: "image/png",
          size: 0,
          category: "image",
        }),
      ).toThrow();
    });
  });
});
