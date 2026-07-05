import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody, parseParams, parseQuery } from "~/server/handlers";

describe("handlers", () => {
  describe("parseJsonBody", () => {
    it("parses a JSON body against a schema", async () => {
      const schema = z.object({ name: z.string() });
      const req = new Request("https://x", {
        method: "POST",
        body: JSON.stringify({ name: "alice" }),
      });
      const result = await parseJsonBody(req, schema);
      expect(result).toEqual({ name: "alice" });
    });

    it("defaults to empty object when body is null", async () => {
      const schema = z.object({ name: z.string().optional() });
      const req = new Request("https://x", { method: "POST" });
      const result = await parseJsonBody(req, schema);
      expect(result).toEqual({});
    });

    it("rejects invalid JSON", async () => {
      const schema = z.object({ name: z.string() });
      const req = new Request("https://x", {
        method: "POST",
        body: "not-json",
      });
      await expect(parseJsonBody(req, schema)).rejects.toThrow();
    });

    it("rejects body that fails schema", async () => {
      const schema = z.object({ name: z.string() });
      const req = new Request("https://x", {
        method: "POST",
        body: JSON.stringify({ name: 1 }),
      });
      await expect(parseJsonBody(req, schema)).rejects.toThrow();
    });
  });

  describe("parseQuery", () => {
    it("parses query string", async () => {
      const schema = z.object({
        page: z.coerce.number().int().min(1).default(1),
        keyword: z.string().optional(),
      });
      const req = new Request("https://x/api?page=2&keyword=admin");
      const result = await parseQuery(req, schema);
      expect(result).toEqual({ page: 2, keyword: "admin" });
    });

    it("rejects invalid values", async () => {
      const schema = z.object({ page: z.coerce.number().int().min(1) });
      const req = new Request("https://x/api?page=0");
      await expect(parseQuery(req, schema)).rejects.toThrow();
    });
  });

  describe("parseParams", () => {
    it("parses path params", () => {
      const schema = z.object({ id: z.string().uuid() });
      const result = parseParams(schema, { id: "123e4567-e89b-12d3-a456-426614174000" });
      expect(result.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    });

    it("skips undefined values without throwing", () => {
      const schema = z.object({ id: z.string().uuid().optional() });
      const result = parseParams(schema, { id: undefined });
      expect(result.id).toBeUndefined();
    });

    it("rejects bad uuid", () => {
      const schema = z.object({ id: z.string().uuid() });
      expect(() => parseParams(schema, { id: "not-uuid" })).toThrow();
    });
  });
});
