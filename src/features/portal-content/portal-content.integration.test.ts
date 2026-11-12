import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { type PgliteDatabase, drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let db: PgliteDatabase;
let client: PGlite;
vi.mock("~/lib/db.server", () => ({ getDb: () => db }));
vi.mock("~/lib/auth.server", () => ({ auth: {} }));

const {
  createPortalArticleService,
  createPortalCategoryService,
  createPortalPageService,
  createPortalTemplateService,
  deletePortalCategoryService,
  deletePortalTemplateService,
  getPortalArticleService,
  getPortalTemplateService,
  listPortalArticlesService,
  listPortalCategoriesService,
  listPortalTemplatesService,
  publishPortalArticleService,
  updatePortalArticleService,
  updatePortalTemplateService,
} = await import("./portal-content.service");

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client);
  for (const file of readdirSync("db/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    await client.exec(readFileSync(`db/migrations/${file}`, "utf8"));
  }
}, 30_000);

afterAll(async () => {
  await client?.close();
});

beforeEach(async () => {
  await client.exec(
    'TRUNCATE "portal_article_category", "portal_article", "portal_page", "portal_category", "portal_template" CASCADE',
  );
});

describe("portal-content service on isolated PostgreSQL", () => {
  it("分类：同名 / 同 slug 冲突，存在下级时不可删除", async () => {
    const parent = await createPortalCategoryService({ name: "新闻", slug: "news" });
    expect(parent.slug).toBe("news");

    await expect(
      createPortalCategoryService({ name: "新闻", slug: "news-other" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createPortalCategoryService({ name: "其它", slug: "news" })).rejects.toMatchObject(
      { code: "CONFLICT" },
    );

    const child = await createPortalCategoryService({ name: "公告", parentId: parent.id });
    await expect(deletePortalCategoryService(parent.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await deletePortalCategoryService(child.id);
    await expect(deletePortalCategoryService(parent.id)).resolves.toEqual({ ok: true });
  });

  it("分类列表按名称关键字与状态过滤", async () => {
    await createPortalCategoryService({ name: "产品动态" });
    await createPortalCategoryService({ name: "帮助中心", status: "disabled" });

    const enabled = await listPortalCategoriesService({
      page: 1,
      pageSize: 10,
      keyword: "产品",
    });
    expect(enabled.total).toBe(1);
    expect(enabled.items[0]?.name).toBe("产品动态");

    const disabled = await listPortalCategoriesService({
      page: 1,
      pageSize: 10,
      status: "disabled",
    });
    expect(disabled.total).toBe(1);
    expect(disabled.items[0]?.name).toBe("帮助中心");
  });

  it("文章：分类集合整体替换，发布写入发布时间", async () => {
    const categoryA = await createPortalCategoryService({ name: "A" });
    const categoryB = await createPortalCategoryService({ name: "B" });
    const article = await createPortalArticleService({
      title: "门户文章",
      slug: "portal-article",
      content: "<p>正文</p>",
      categoryIds: [categoryA.id, categoryB.id],
      attributes: { 作者: "张三" },
      tags: ["公告"],
    });
    expect(article.categoryIds).toEqual([categoryA.id, categoryB.id]);
    expect(article.status).toBe("draft");

    const updated = await updatePortalArticleService(article.id, { categoryIds: [categoryB.id] });
    expect(updated.categoryIds).toEqual([categoryB.id]);

    const published = await publishPortalArticleService(article.id);
    expect(published.status).toBe("published");
    expect(published.publishTime).not.toBeNull();

    const refreshed = await getPortalArticleService(article.id);
    expect(refreshed?.title).toBe("门户文章");
  });

  it("文章列表支持关键字与分类过滤", async () => {
    const category = await createPortalCategoryService({ name: "分类" });
    await createPortalArticleService({
      title: "公告一则",
      content: "正文",
      categoryIds: [category.id],
    });
    await createPortalArticleService({ title: "另一篇", content: "正文" });

    const byCategory = await listPortalArticlesService({
      page: 1,
      pageSize: 10,
      categoryId: category.id,
    });
    expect(byCategory.total).toBe(1);

    const byKeyword = await listPortalArticlesService({
      page: 1,
      pageSize: 10,
      keyword: "公告",
    });
    expect(byKeyword.total).toBe(1);
  });

  it("页面：路径唯一，重复路径冲突", async () => {
    await createPortalPageService({ title: "关于我们", path: "/about", content: "内容" });
    await expect(
      createPortalPageService({ title: "重复", path: "/about", content: "内容" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("模板：同名不同类型可共存，系统默认模板不可删除", async () => {
    const article = await createPortalTemplateService({ name: "默认模板", type: "article" });
    const page = await createPortalTemplateService({ name: "默认模板", type: "page" });
    expect(article.id).not.toBe(page.id);

    await expect(
      createPortalTemplateService({ name: "默认模板", type: "article" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const systemDefault = await createPortalTemplateService({
      name: "系统模板",
      type: "article",
      isSystemDefault: true,
    });
    await expect(deletePortalTemplateService(systemDefault.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const articleTemplates = await listPortalTemplatesService({
      page: 1,
      pageSize: 10,
      type: "article",
    });
    expect(articleTemplates.total).toBe(2);
    const pageTemplates = await listPortalTemplatesService({
      page: 1,
      pageSize: 10,
      type: "page",
    });
    expect(pageTemplates.total).toBe(1);
  });

  it("模板：低代码 PageSchema 可保存并读回", async () => {
    const template = await createPortalTemplateService({ name: "落地页", type: "page" });
    const pageSchema = {
      version: "1.0.0",
      componentsMap: [{ name: "Button" }],
      componentsTree: {
        id: "root",
        componentName: "Page",
        children: [{ id: "btn", componentName: "Button", props: { text: "提交" } }],
      },
    };

    const saved = await updatePortalTemplateService(template.id, { schema: pageSchema });
    expect(saved.schema).toEqual(pageSchema);

    const reloaded = await getPortalTemplateService(template.id);
    expect(reloaded?.schema).toEqual(pageSchema);
  });
});
