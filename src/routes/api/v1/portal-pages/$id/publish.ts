import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import { publishPortalPageService } from "~/features/portal-content/portal-content.service";
import { parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/portal-pages/$id/publish")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:update",
          );
          const { id } = parseParams(idParamSchema, params);
          const row = await publishPortalPageService(id);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
