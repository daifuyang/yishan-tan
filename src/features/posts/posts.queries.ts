import { queryOptions, useQuery } from "@tanstack/react-query";

import { getPost, listPosts } from "~/features/posts/posts.actions";
import type { PostListQuery } from "~/features/posts/posts.schema";
import type { PostDto } from "~/features/posts/posts.types";

export const postsQueryKey = {
  all: ["posts"] as const,
  lists: () => [...postsQueryKey.all, "list"] as const,
  list: (input: PostListQuery) => [...postsQueryKey.lists(), input] as const,
  details: () => [...postsQueryKey.all, "detail"] as const,
  detail: (id: string) => [...postsQueryKey.details(), id] as const,
};

export const postsListQueryOptions = (input: PostListQuery) =>
  queryOptions<{ items: PostDto[]; total: number }>({
    queryKey: postsQueryKey.list(input),
    queryFn: async () => listPosts({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function usePostsList(input: PostListQuery) {
  return useQuery(postsListQueryOptions(input));
}

export const postDetailQueryOptions = (id: string) =>
  queryOptions<PostDto | null>({
    queryKey: postsQueryKey.detail(id),
    queryFn: async () => getPost({ data: { id } }),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

export function usePostDetail(id: string) {
  return useQuery(postDetailQueryOptions(id));
}
