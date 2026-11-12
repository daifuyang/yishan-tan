import { describe, expect, it } from "vitest";

import {
  createPortalArticleSchema,
  createPortalTemplateSchema,
  portalArticleListQuerySchema,
  portalTemplateListQuerySchema,
  updatePortalCategorySchema,
} from "./portal-content.schema";

describe("portal-content.schema", () => {
  describe("createPortalArticleSchema", () => {
    it("缺省状态为草稿、未置顶", () => {
      const parsed = createPortalArticleSchema.parse({ title: "门户文章", content: "<p>正文</p>" });
      expect(parsed.status).toBe("draft");
      expect(parsed.isPinned).toBe(false);
    });

    it("拒绝未知状态", () => {
      const result = createPortalArticleSchema.safeParse({
        title: "门户文章",
        content: "正文",
        status: "online",
      });
      expect(result.success).toBe(false);
    });

    it("属性键值对只接受字符串值", () => {
      const result = createPortalArticleSchema.safeParse({
        title: "门户文章",
        content: "正文",
        attributes: { 作者: 123 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createPortalTemplateSchema", () => {
    it("按类型区分文章模板与页面模板", () => {
      const article = createPortalTemplateSchema.parse({ name: "默认文章模板", type: "article" });
      const page = createPortalTemplateSchema.parse({ name: "默认页面模板", type: "page" });
      expect(article.type).toBe("article");
      expect(page.type).toBe("page");
      expect(article.isSystemDefault).toBe(false);
    });

    it("拒绝未知模板类型", () => {
      const result = createPortalTemplateSchema.safeParse({ name: "模板", type: "banner" });
      expect(result.success).toBe(false);
    });

    it("接受低代码 PageSchema（嵌套对象树）", () => {
      const parsed = createPortalTemplateSchema.parse({
        name: "落地页模板",
        type: "page",
        schema: {
          version: "1.0.0",
          componentsMap: [{ name: "Button" }],
          componentsTree: {
            id: "root",
            componentName: "Page",
            children: [{ id: "btn", componentName: "Button", props: { text: "提交" } }],
          },
        },
      });
      expect((parsed.schema as Record<string, unknown>).version).toBe("1.0.0");
    });

    it("拒绝缺少页面结构的 schema", () => {
      const result = createPortalTemplateSchema.safeParse({
        name: "落地页模板",
        type: "page",
        schema: { componentsMap: [] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updatePortalCategorySchema", () => {
    it("允许把上级分类置空（移到顶级）", () => {
      const parsed = updatePortalCategorySchema.parse({ parentId: null });
      expect(parsed.parentId).toBeNull();
    });
  });

  describe("列表查询", () => {
    it("文章列表按标题关键字与状态过滤", () => {
      const parsed = portalArticleListQuerySchema.parse({
        page: 2,
        pageSize: 20,
        keyword: "公告",
        status: "published",
      });
      expect(parsed.page).toBe(2);
      expect(parsed.pageSize).toBe(20);
      expect(parsed.keyword).toBe("公告");
      expect(parsed.status).toBe("published");
    });

    it("模板列表按 type 过滤", () => {
      const parsed = portalTemplateListQuerySchema.parse({ type: "page" });
      expect(parsed.type).toBe("page");
    });

    it("排序列只接受白名单内的值", () => {
      const result = portalTemplateListQuerySchema.safeParse({ sortBy: "deletedAt" });
      expect(result.success).toBe(false);
    });
  });
});
