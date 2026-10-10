import { createFileRoute } from "@tanstack/react-router";
import { createUserSchema } from "~/features/auth/auth.schema";
import { createUserService } from "~/features/auth/auth.service";
import { assertUserOperation } from "~/features/users/users.policy";
import { userListQuerySchema } from "~/features/users/users.schema";
import { listUsersService } from "~/features/users/users.service";
import { parseQuery } from "~/server/handlers";
import { handleApiError, json, page, parseJson } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/users/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          await assertUserOperation(ctx, "users:create");
          const body = (await parseJson(request)) ?? {};
          const input = createUserSchema.parse(body);
          await assertUserOperation(ctx, "users:create", { roleIds: input.roleIds });
          const result = await createUserService(input, request.headers);
          return json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },

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
