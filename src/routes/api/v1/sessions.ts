import { createFileRoute } from "@tanstack/react-router";
import { createSessionSchema } from "~/features/auth/auth.schema";
import { createSessionService, deleteSessionService } from "~/features/auth/auth.service";
import { handleApiError, json, parseJson } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/sessions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await parseJson(request)) ?? {};
          const input = createSessionSchema.parse(body);
          const result = await createSessionService(input, request.headers);
          return json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const result = await deleteSessionService(ctx);
          return json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
