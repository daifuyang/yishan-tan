import { createFileRoute } from "@tanstack/react-router";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import {
  createPortalArticleSchema,
  portalArticleListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import {
  createPortalArticleService,
  listPortalArticlesService,
} from "~/features/portal-content/portal-content.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/portal-articles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-articles:read",
          );
          const query = await parseQuery(request, portalArticleListQuerySchema);
          const result = await listPortalArticlesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-articles:create",
          );
          const body = await parseJsonBody(request, createPortalArticleSchema);
          const result = await createPortalArticleService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
