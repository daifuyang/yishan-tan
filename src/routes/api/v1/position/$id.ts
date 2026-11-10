import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPostOperation } from "~/features/posts/posts.policy";
import { updatePostSchema } from "~/features/posts/posts.schema";
import { deletePostService, updatePostService } from "~/features/posts/posts.service";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/position/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          await assertPostOperation(await requireRequestContext(request), "posts:update");
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updatePostSchema);
          const result = await updatePostService(id, body);
          return ok(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertPostOperation(await requireRequestContext(request), "posts:delete");
          const { id } = parseParams(idParamSchema, params);
          await deletePostService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
