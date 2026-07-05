import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createApiKeyService, listApiKeysService } from "~/features/users/users.service";
import { parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const createSchema = z.object({ name: z.string().max(50).optional() });

export const Route = createFileRoute("/api/v1/api-keys/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const list = await listApiKeysService({ userId: ctx.userId });
          return ok({ items: list });
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const body = await parseJsonBody(request, createSchema);
          const result = await createApiKeyService({ userId: ctx.userId, name: body.name });
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
