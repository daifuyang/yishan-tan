import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteApiKeyService } from "~/features/users/users.service";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/api-keys/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const ctx = await requireRequestContext(request);
          const { id } = idSchema.parse({ id: params.id });
          await deleteApiKeyService({ userId: ctx.userId, id });
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
