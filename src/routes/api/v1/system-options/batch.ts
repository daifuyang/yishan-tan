import { createFileRoute } from "@tanstack/react-router";
import { assertSystemSettingKey } from "~/features/system-settings/system-settings.policy";
import { batchSetSystemOptionSchema } from "~/features/system-settings/system-settings.schema";
import { setSystemOptionService } from "~/features/system-settings/system-settings.service";
import { ensureAdmin, parseJsonBody } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";

export const Route = createFileRoute("/api/v1/system-options/batch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await ensureAdmin(request);
          const body = await parseJsonBody(request, batchSetSystemOptionSchema);
          for (const item of body.items) assertSystemSettingKey(item.key);
          const results: Array<{ key: string; ok: boolean; value?: string }> = [];
          for (const item of body.items) {
            try {
              const dto = await setSystemOptionService(item);
              results.push({ key: item.key, ok: true, value: dto.value });
            } catch (err) {
              results.push({ key: item.key, ok: false });
              void err;
            }
          }
          return ok({ updatedCount: results.filter((r) => r.ok).length, results });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
