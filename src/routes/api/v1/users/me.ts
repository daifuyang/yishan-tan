import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserService } from "~/features/auth/auth.service";
import { handleApiError, json } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/users/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const user = await getCurrentUserService(ctx);
          return json({ user });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
