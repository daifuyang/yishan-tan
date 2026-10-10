import { createFileRoute } from "@tanstack/react-router";
import { createUserSchema } from "~/features/auth/auth.schema";
import { createUserService } from "~/features/auth/auth.service";
import { assertUserOperation } from "~/features/users/users.policy";
import { handleApiError, json, parseJson } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/users")({
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
    },
  },
});
