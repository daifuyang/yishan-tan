import { createFileRoute } from "@tanstack/react-router";
import { assertUserOperation } from "~/features/users/users.policy";
import { userListQuerySchema } from "~/features/users/users.schema";
import { listUsersService } from "~/features/users/users.service";
import { parseQuery } from "~/server/handlers";
import { handleApiError, page } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/users/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await assertUserOperation(await requireRequestContext(request), "users:read");
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
