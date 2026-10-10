import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireRequestContext } from "~/server/request-context";
import { assertPostOperation } from "./posts.policy";
import { createPostSchema, postListQuerySchema, updatePostSchema } from "./posts.schema";
import {
  createPostService,
  deletePostService,
  getPostDepartmentOptionsService,
  getPostService,
  listPostsService,
  updatePostService,
} from "./posts.service";

async function operationCtx(code: Parameters<typeof assertPostOperation>[1]) {
  const ctx = await requireRequestContext(getRequestHeaders());
  await assertPostOperation(ctx, code);
  return ctx;
}

export const listPosts = createServerFn({ method: "GET" })
  .validator(postListQuerySchema)
  .handler(async ({ data }) => {
    await operationCtx("posts:read");
    return listPostsService(data);
  });

export const getPost = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("posts:read");
    const post = await getPostService(data.id);
    if (!post) throw new Error("NOT_FOUND");
    return post;
  });

export const createPost = createServerFn({ method: "POST" })
  .validator(createPostSchema)
  .handler(async ({ data }) => {
    await operationCtx("posts:create");
    return createPostService(data);
  });

export const updatePost = createServerFn({ method: "POST" })
  .validator(updatePostSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("posts:update");
    const { id, ...rest } = data;
    return updatePostService(id, rest);
  });

export const deletePost = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await operationCtx("posts:delete");
    return deletePostService(data.id);
  });

export const getPostDepartmentOptions = createServerFn({ method: "GET" })
  .validator(z.object({ operation: z.enum(["read", "create", "update"]) }))
  .handler(async ({ data }) => {
    await operationCtx(`posts:${data.operation}`);
    return getPostDepartmentOptionsService();
  });
