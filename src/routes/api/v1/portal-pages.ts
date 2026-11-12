import { createFileRoute } from "@tanstack/react-router";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import {
  createPortalPageSchema,
  portalPageListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import {
  createPortalPageService,
  listPortalPagesService,
} from "~/features/portal-content/portal-content.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/portal-pages")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:read",
          );
          const query = await parseQuery(request, portalPageListQuerySchema);
          const result = await listPortalPagesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-pages:create",
          );
          const body = await parseJsonBody(request, createPortalPageSchema);
          const result = await createPortalPageService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
