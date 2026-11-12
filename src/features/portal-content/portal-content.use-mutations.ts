import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createPortalArticle,
  createPortalCategory,
  createPortalPage,
  createPortalTemplate,
  deletePortalArticle,
  deletePortalCategory,
  deletePortalPage,
  deletePortalTemplate,
  publishPortalArticle,
  updatePortalArticle,
  updatePortalCategory,
  updatePortalPage,
  updatePortalTemplate,
} from "~/features/portal-content/portal-content.actions";
import { portalContentQueryKey } from "~/features/portal-content/portal-content.queries";
import type {
  CreatePortalArticleInput,
  CreatePortalCategoryInput,
  CreatePortalPageInput,
  CreatePortalTemplateInput,
  UpdatePortalArticleInput,
  UpdatePortalCategoryInput,
  UpdatePortalPageInput,
  UpdatePortalTemplateInput,
} from "~/features/portal-content/portal-content.schema";

function useBulkDelete(ids: string[], run: (id: string) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const settled = await Promise.allSettled(ids.map((id) => run(id)));
      const failed = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
      if (failed.length > 0) {
        const messages = failed.map((f) =>
          f.reason instanceof Error ? f.reason.message : String(f.reason),
        );
        throw new Error(`${failed.length}/${ids.length} 条删除失败：${messages[0]}`);
      }
      return { deleted: ids.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.all });
    },
  });
}

/* ------------------------------- 分类 ------------------------------- */

export function useCreatePortalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortalCategoryInput) => createPortalCategory({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.categories() });
    },
  });
}

export function useUpdatePortalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePortalCategoryInput & { id: string }) =>
      updatePortalCategory({ data: { id, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.categories() });
    },
  });
}

export function useDeletePortalCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deletePortalCategory({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.categories() });
    },
  });
}

export function useBulkDeletePortalCategories(ids: string[]) {
  return useBulkDelete(ids, (id) => deletePortalCategory({ data: { id } }));
}

/* ------------------------------- 文章 ------------------------------- */

export function useCreatePortalArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortalArticleInput) => createPortalArticle({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.articles() });
    },
  });
}

export function useUpdatePortalArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePortalArticleInput & { id: string }) =>
      updatePortalArticle({ data: { id, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.articles() });
    },
  });
}

export function usePublishPortalArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => publishPortalArticle({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.articles() });
    },
  });
}

export function useDeletePortalArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deletePortalArticle({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.articles() });
    },
  });
}

export function useBulkDeletePortalArticles(ids: string[]) {
  return useBulkDelete(ids, (id) => deletePortalArticle({ data: { id } }));
}

/* ------------------------------- 页面 ------------------------------- */

export function useCreatePortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortalPageInput) => createPortalPage({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.pages() });
    },
  });
}

export function useUpdatePortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePortalPageInput & { id: string }) =>
      updatePortalPage({ data: { id, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.pages() });
    },
  });
}

export function useDeletePortalPage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deletePortalPage({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.pages() });
    },
  });
}

export function useBulkDeletePortalPages(ids: string[]) {
  return useBulkDelete(ids, (id) => deletePortalPage({ data: { id } }));
}

/* ------------------------------- 模板 ------------------------------- */

export function useCreatePortalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePortalTemplateInput) => createPortalTemplate({ data }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.templates() });
    },
  });
}

export function useUpdatePortalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePortalTemplateInput & { id: string }) =>
      updatePortalTemplate({ data: { id, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.templates() });
    },
  });
}

export function useDeletePortalTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => deletePortalTemplate({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: portalContentQueryKey.templates() });
    },
  });
}

export function useBulkDeletePortalTemplates(ids: string[]) {
  return useBulkDelete(ids, (id) => deletePortalTemplate({ data: { id } }));
}
