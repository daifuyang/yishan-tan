import { createFileRoute } from "@tanstack/react-router";
import { createUserSchema } from "~/features/auth/auth.schema";
import { createUserService } from "~/features/auth/auth.service";
import { handleApiError, json, parseJson } from "~/server/http";

export const Route = createFileRoute("/api/v1/users")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await parseJson(request)) ?? {};
          const input = createUserSchema.parse(body);
          const result = await createUserService(input, request.headers);
          return json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
