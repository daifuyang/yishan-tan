import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updatePostSchema } from "~/features/posts/posts.schema";
import { deletePostService, updatePostService } from "~/features/posts/posts.service";
import { requireAdmin } from "~/lib/authorization.server";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

async function ensureAdminCtx(request: Request) {
  const ctx = await requireRequestContext(request);
  await requireAdmin(ctx);
  return ctx;
}

export const Route = createFileRoute("/api/v1/posts/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          await ensureAdminCtx(request);
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
          await ensureAdminCtx(request);
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
