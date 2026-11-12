import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  getPortalArticle,
  getPortalCategory,
  getPortalPage,
  getPortalTemplate,
  listPortalArticles,
  listPortalCategories,
  listPortalPages,
  listPortalTemplates,
} from "~/features/portal-content/portal-content.actions";
import type {
  PortalArticleListQuery,
  PortalCategoryListQuery,
  PortalPageListQuery,
  PortalTemplateListQuery,
} from "~/features/portal-content/portal-content.schema";
import type {
  PortalArticleDto,
  PortalCategoryDto,
  PortalPageDto,
  PortalTemplateDto,
} from "~/features/portal-content/portal-content.types";

export const portalContentQueryKey = {
  all: ["portal-content"] as const,
  categories: () => [...portalContentQueryKey.all, "categories"] as const,
  categoryList: (input: PortalCategoryListQuery) =>
    [...portalContentQueryKey.categories(), input] as const,
  categoryById: (id: string) => [...portalContentQueryKey.categories(), { id }] as const,
  articles: () => [...portalContentQueryKey.all, "articles"] as const,
  articleList: (input: PortalArticleListQuery) =>
    [...portalContentQueryKey.articles(), input] as const,
  articleById: (id: string) => [...portalContentQueryKey.articles(), { id }] as const,
  pages: () => [...portalContentQueryKey.all, "pages"] as const,
  pageList: (input: PortalPageListQuery) => [...portalContentQueryKey.pages(), input] as const,
  pageById: (id: string) => [...portalContentQueryKey.pages(), { id }] as const,
  templates: () => [...portalContentQueryKey.all, "templates"] as const,
  templateList: (input: PortalTemplateListQuery) =>
    [...portalContentQueryKey.templates(), input] as const,
  templateById: (id: string) => [...portalContentQueryKey.templates(), { id }] as const,
};

export const portalCategoriesListQueryOptions = (input: PortalCategoryListQuery) =>
  queryOptions<{ items: PortalCategoryDto[]; total: number }>({
    queryKey: portalContentQueryKey.categoryList(input),
    queryFn: async () => listPortalCategories({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function usePortalCategoriesList(input: PortalCategoryListQuery, enabled = true) {
  return useQuery({ ...portalCategoriesListQueryOptions(input), enabled });
}

export function usePortalCategory(id: string | null) {
  return useQuery({
    queryKey: portalContentQueryKey.categoryById(id ?? ""),
    queryFn: async () => getPortalCategory({ data: { id: id ?? "" } }),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * 拉取全部分类，用于「上级分类」树选择器。
 *
 * 单页上限 100 条，这里按页翻完（最多 20 页 = 2000 条），避免分类超过一页时
 * 树里只出现一部分节点。
 */
export function usePortalCategoryOptions(enabled = true) {
  return useQuery({
    queryKey: [...portalContentQueryKey.categories(), "options"],
    queryFn: async () => {
      const items: PortalCategoryDto[] = [];
      let page = 1;
      let total = 0;
      for (;;) {
        const data = await listPortalCategories({ data: { page, pageSize: 100 } });
        items.push(...data.items);
        total = data.total;
        if (items.length >= total || data.items.length === 0 || page >= 20) break;
        page += 1;
      }
      return { items, total };
    },
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export const portalArticlesListQueryOptions = (input: PortalArticleListQuery) =>
  queryOptions<{ items: PortalArticleDto[]; total: number }>({
    queryKey: portalContentQueryKey.articleList(input),
    queryFn: async () => listPortalArticles({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function usePortalArticlesList(input: PortalArticleListQuery, enabled = true) {
  return useQuery({ ...portalArticlesListQueryOptions(input), enabled });
}

export function usePortalArticle(id: string | null) {
  return useQuery({
    queryKey: portalContentQueryKey.articleById(id ?? ""),
    queryFn: async () => getPortalArticle({ data: { id: id ?? "" } }),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export const portalPagesListQueryOptions = (input: PortalPageListQuery) =>
  queryOptions<{ items: PortalPageDto[]; total: number }>({
    queryKey: portalContentQueryKey.pageList(input),
    queryFn: async () => listPortalPages({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function usePortalPagesList(input: PortalPageListQuery, enabled = true) {
  return useQuery({ ...portalPagesListQueryOptions(input), enabled });
}

export function usePortalPage(id: string | null) {
  return useQuery({
    queryKey: portalContentQueryKey.pageById(id ?? ""),
    queryFn: async () => getPortalPage({ data: { id: id ?? "" } }),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export const portalTemplatesListQueryOptions = (input: PortalTemplateListQuery) =>
  queryOptions<{ items: PortalTemplateDto[]; total: number }>({
    queryKey: portalContentQueryKey.templateList(input),
    queryFn: async () => listPortalTemplates({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function usePortalTemplatesList(input: PortalTemplateListQuery, enabled = true) {
  return useQuery({ ...portalTemplatesListQueryOptions(input), enabled });
}

export function usePortalTemplate(id: string | null) {
  return useQuery({
    queryKey: portalContentQueryKey.templateById(id ?? ""),
    queryFn: async () => getPortalTemplate({ data: { id: id ?? "" } }),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/** 按类型拉取启用模板，作为文章 / 页面的模板下拉选项源。 */
export function usePortalTemplateOptions(type: "article", enabled = true) {
  return useQuery({
    queryKey: [...portalContentQueryKey.templates(), "options", type],
    queryFn: async () =>
      listPortalTemplates({
        data: { page: 1, pageSize: 100, type, status: "enabled" },
      }),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
