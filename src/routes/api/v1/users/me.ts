import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserService } from "~/features/auth/auth.service";
import { changePasswordSchema } from "~/features/users/users.schema";
import { changeMyPasswordService } from "~/features/users/users.service";
import { parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

export const Route = createFileRoute("/api/v1/users/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const user = await getCurrentUserService(ctx);
          return ok({ user });
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const ctx = await requireRequestContext(request);
          const body = await parseJsonBody(request, changePasswordSchema);
          await changeMyPasswordService({ userId: ctx.userId, ...body });
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
