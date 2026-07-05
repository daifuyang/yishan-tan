import { createFileRoute } from "@tanstack/react-router";
import { userListQuerySchema } from "~/features/users/users.schema";
import { listUsersService } from "~/features/users/users.service";
import { ensureAdmin, parseQuery } from "~/server/handlers";
import { handleApiError, page } from "~/server/http";

export const Route = createFileRoute("/api/v1/users/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const query = await parseQuery(request, userListQuerySchema);
          const result = await listUsersService(query);
          return page(result.items, result.total, query.page, query.pageSize);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
