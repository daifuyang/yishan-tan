import { createFileRoute } from "@tanstack/react-router";
import { loginLogListQuerySchema } from "~/features/users/users.schema";
import { listMyLoginLogsService } from "~/features/users/users.service";
import { parseQuery } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/users/me/login-logs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const query = await parseQuery(request, loginLogListQuerySchema);
          const result = await listMyLoginLogsService({ userId: ctx.userId, ...query });
          return ok(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
