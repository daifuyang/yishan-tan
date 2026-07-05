import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { contextFromRequest } from "~/server/request-context";
import { assertCanManagePosts } from "./posts.policy";
import { createPostSchema, postListQuerySchema, updatePostSchema } from "./posts.schema";
import {
  createPostService,
  deletePostService,
  getPostService,
  listPostsService,
  updatePostService,
} from "./posts.service";

async function adminCtx() {
  const ctx = await contextFromRequest(getRequestHeaders());
  if (!ctx) throw new Error("UNAUTHENTICATED");
  await assertCanManagePosts(ctx);
  return ctx;
}

export const listPosts = createServerFn({ method: "GET" })
  .validator(postListQuerySchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return listPostsService(data);
  });

export const getPost = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const post = await getPostService(data.id);
    if (!post) throw new Error("NOT_FOUND");
    return post;
  });

export const createPost = createServerFn({ method: "POST" })
  .validator(createPostSchema)
  .handler(async ({ data }) => {
    await adminCtx();
    return createPostService(data);
  });

export const updatePost = createServerFn({ method: "POST" })
  .validator(updatePostSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    const { id, ...rest } = data;
    return updatePostService(id, rest);
  });

export const deletePost = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await adminCtx();
    return deletePostService(data.id);
  });
