import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSystemSettingOperation } from "~/features/system-settings/system-settings.policy";
import { batchGetSystemOptionsService } from "~/features/system-settings/system-settings.service";
import { parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";
import { requireRequestContext } from "~/server/request-context";

const batchGetSchema = z.object({ keys: z.array(z.string()).max(100) });

export const Route = createFileRoute("/api/v1/system-options/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await assertSystemSettingOperation(await requireRequestContext(request), "settings:read");
          const body = await parseJsonBody(request, batchGetSchema);
          const result = await batchGetSystemOptionsService(body.keys);
          return ok({ items: result });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
