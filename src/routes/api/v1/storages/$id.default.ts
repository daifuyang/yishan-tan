import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { setDefaultStorageService } from "~/features/storages/storages.service";
import { requireAdmin } from "~/lib/authorization.server";
import { parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/storages/$id/default")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const ctx = await requireRequestContext(request);
          await requireAdmin(ctx);
          const { id } = parseParams(idParamSchema, params);
          const storage = await setDefaultStorageService(id);
          return ok(storage);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
