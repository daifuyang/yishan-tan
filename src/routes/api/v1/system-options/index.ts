import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { batchGetSystemOptionsService } from "~/features/system-settings/system-settings.service";
import { ensureAdmin, parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";

const batchGetSchema = z.object({ keys: z.array(z.string()).max(100) });

export const Route = createFileRoute("/api/v1/system-options/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const body = await parseJsonBody(request, batchGetSchema);
          const result = await batchGetSystemOptionsService(body.keys);
          return ok({ items: result });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
