import { createFileRoute } from "@tanstack/react-router";
import { assertPostOperation } from "~/features/posts/posts.policy";
import { createPostSchema, postListQuerySchema } from "~/features/posts/posts.schema";
import { createPostService, listPostsService } from "~/features/posts/posts.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/position")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertPostOperation(await requireRequestContext(request), "posts:read");
          const query = await parseQuery(request, postListQuerySchema);
          const result = await listPostsService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertPostOperation(await requireRequestContext(request), "posts:create");
          const body = await parseJsonBody(request, createPostSchema);
          const result = await createPostService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
