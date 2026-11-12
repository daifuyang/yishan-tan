import { createFileRoute } from "@tanstack/react-router";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import {
  createPortalCategorySchema,
  portalCategoryListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import {
  createPortalCategoryService,
  listPortalCategoriesService,
} from "~/features/portal-content/portal-content.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/portal-categories")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-categories:read",
          );
          const query = await parseQuery(request, portalCategoryListQuerySchema);
          const result = await listPortalCategoriesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-categories:create",
          );
          const body = await parseJsonBody(request, createPortalCategorySchema);
          const result = await createPortalCategoryService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
