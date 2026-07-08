import { createFileRoute } from "@tanstack/react-router";
import { createRoleSchema, roleListQuerySchema } from "~/features/roles/roles.schema";
import { createRoleService, listRolesService } from "~/features/roles/roles.service";
import { requireAdmin } from "~/lib/authorization.server";
import { ensureAdmin, parseJsonBody, parseQuery } from "~/server/handlers";
import { handleApiError, ok, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/roles/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const query = await parseQuery(request, roleListQuerySchema);
          const result = await listRolesService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          await requireAdmin(ctx);
          const body = await parseJsonBody(request, createRoleSchema);
          const result = await createRoleService({ ctx, data: body });
          return ok(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
