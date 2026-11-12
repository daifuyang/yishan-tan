import { createFileRoute } from "@tanstack/react-router";
import { assertPortalContentOperation } from "~/features/portal-content/portal-content.policy";
import {
  createPortalTemplateSchema,
  portalTemplateListQuerySchema,
} from "~/features/portal-content/portal-content.schema";
import {
  createPortalTemplateService,
  listPortalTemplatesService,
} from "~/features/portal-content/portal-content.service";
import { parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/portal-templates")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-templates:read",
          );
          const query = await parseQuery(request, portalTemplateListQuerySchema);
          const result = await listPortalTemplatesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          await assertPortalContentOperation(
            await requireRequestContext(request),
            "portal-templates:create",
          );
          const body = await parseJsonBody(request, createPortalTemplateSchema);
          const result = await createPortalTemplateService(body);
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
