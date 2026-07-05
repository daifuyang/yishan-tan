import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPost, deletePost, updatePost } from "~/features/posts/posts.actions";
import { postsQueryKey } from "~/features/posts/posts.queries";
import type { CreatePostInput, UpdatePostInput } from "~/features/posts/posts.schema";

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePostInput) => {
      return createPost({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
  });
}

type UpdatePostInputWithId = UpdatePostInput & { id: string };

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePostInputWithId) => {
      return updatePost({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deletePost({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
  });
}
