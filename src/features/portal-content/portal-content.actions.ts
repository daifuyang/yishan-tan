import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireRequestContext } from "~/server/request-context";
import { assertPortalContentOperation } from "./portal-content.policy";
import {
  createPortalArticleSchema,
  createPortalCategorySchema,
  createPortalPageSchema,
  createPortalTemplateSchema,
  portalArticleListQuerySchema,
  portalCategoryListQuerySchema,
  portalPageListQuerySchema,
  portalTemplateListQuerySchema,
  updatePortalArticleSchema,
  updatePortalCategorySchema,
  updatePortalPageSchema,
  updatePortalTemplateSchema,
} from "./portal-content.schema";
import {
  createPortalArticleService,
  createPortalCategoryService,
  createPortalPageService,
  createPortalTemplateService,
  deletePortalArticleService,
  deletePortalCategoryService,
  deletePortalPageService,
  deletePortalTemplateService,
  getPortalArticleService,
  getPortalCategoryService,
  getPortalPageService,
  getPortalTemplateService,
  listPortalArticlesService,
  listPortalCategoriesService,
  listPortalPagesService,
  listPortalTemplatesService,
  publishPortalArticleService,
  updatePortalArticleService,
  updatePortalCategoryService,
  updatePortalPageService,
  updatePortalTemplateService,
} from "./portal-content.service";

async function operationCtx(code: Parameters<typeof assertPortalContentOperation>[1]) {
  const ctx = await requireRequestContext(getRequestHeaders());
  await assertPortalContentOperation(ctx, code);
  return ctx;
}

/* ------------------------------- 分类 ------------------------------- */

export const listPortalCategories = createServerFn({ method: "GET" })
  .validator(portalCategoryListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-categories:read");
    return listPortalCategoriesService(data);
  });

export const getPortalCategory = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-categories:read");
    const row = await getPortalCategoryService(data.id);
    if (!row) throw new Error("NOT_FOUND");
    return row;
  });

export const createPortalCategory = createServerFn({ method: "POST" })
  .validator(createPortalCategorySchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-categories:create");
    return createPortalCategoryService(data);
  });

export const updatePortalCategory = createServerFn({ method: "POST" })
  .validator(updatePortalCategorySchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-categories:update");
    const { id, ...rest } = data;
    return updatePortalCategoryService(id, rest);
  });

export const deletePortalCategory = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-categories:delete");
    return deletePortalCategoryService(data.id);
  });

/* ------------------------------- 文章 ------------------------------- */

export const listPortalArticles = createServerFn({ method: "GET" })
  .validator(portalArticleListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-articles:read");
    return listPortalArticlesService(data);
  });

export const getPortalArticle = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-articles:read");
    const row = await getPortalArticleService(data.id);
    if (!row) throw new Error("NOT_FOUND");
    return row;
  });

export const createPortalArticle = createServerFn({ method: "POST" })
  .validator(createPortalArticleSchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-articles:create");
    return createPortalArticleService(data);
  });

export const updatePortalArticle = createServerFn({ method: "POST" })
  .validator(updatePortalArticleSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-articles:update");
    const { id, ...rest } = data;
    return updatePortalArticleService(id, rest);
  });

export const publishPortalArticle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-articles:update");
    return publishPortalArticleService(data.id);
  });

export const deletePortalArticle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-articles:delete");
    return deletePortalArticleService(data.id);
  });

/* ------------------------------- 页面 ------------------------------- */

export const listPortalPages = createServerFn({ method: "GET" })
  .validator(portalPageListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-pages:read");
    return listPortalPagesService(data);
  });

export const getPortalPage = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-pages:read");
    const row = await getPortalPageService(data.id);
    if (!row) throw new Error("NOT_FOUND");
    return row;
  });

export const createPortalPage = createServerFn({ method: "POST" })
  .validator(createPortalPageSchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-pages:create");
    return createPortalPageService(data);
  });

export const updatePortalPage = createServerFn({ method: "POST" })
  .validator(updatePortalPageSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-pages:update");
    const { id, ...rest } = data;
    return updatePortalPageService(id, rest);
  });

export const deletePortalPage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-pages:delete");
    return deletePortalPageService(data.id);
  });

/* ------------------------------- 模板 ------------------------------- */

export const listPortalTemplates = createServerFn({ method: "GET" })
  .validator(portalTemplateListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-templates:read");
    return listPortalTemplatesService(data);
  });

export const getPortalTemplate = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-templates:read");
    const row = await getPortalTemplateService(data.id);
    if (!row) throw new Error("NOT_FOUND");
    return row;
  });

export const createPortalTemplate = createServerFn({ method: "POST" })
  .validator(createPortalTemplateSchema)
  .handler(async ({ data }) => {
    await operationCtx("portal-templates:create");
    return createPortalTemplateService(data);
  });

export const updatePortalTemplate = createServerFn({ method: "POST" })
  .validator(updatePortalTemplateSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-templates:update");
    const { id, ...rest } = data;
    return updatePortalTemplateService(id, rest);
  });

export const deletePortalTemplate = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("portal-templates:delete");
    return deletePortalTemplateService(data.id);
  });
