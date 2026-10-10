import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertMenuOperation } from "~/features/menus/menus.policy";
import { updateMenuSchema } from "~/features/menus/menus.schema";
import { deleteMenuService, updateMenuService } from "~/features/menus/menus.service";
import { parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const idParamSchema = z.object({ id: z.string().uuid() });

export const Route = createFileRoute("/api/v1/menus/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const { id } = parseParams(idParamSchema, params);
          const body = await parseJsonBody(request, updateMenuSchema);
          await assertMenuOperation(
            await requireRequestContext(request),
            "menus:update",
            body.permissionCodes,
          );
          const result = await updateMenuService(id, body);
          return ok(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          await assertMenuOperation(await requireRequestContext(request), "menus:delete");
          const { id } = parseParams(idParamSchema, params);
          await deleteMenuService(id);
          return ok({ ok: true });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
