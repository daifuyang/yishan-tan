import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { assertSystemSettingKey } from "~/features/system-settings/system-settings.policy";
import { setSystemOptionSchema } from "~/features/system-settings/system-settings.schema";
import {
  getSystemOptionService,
  setSystemOptionService,
} from "~/features/system-settings/system-settings.service";
import { ensureAdmin, parseJsonBody, parseParams } from "~/server/handlers";
import { handleApiError, ok } from "~/server/http";

const keyParamSchema = z.object({ key: z.string().min(1) });

export const Route = createFileRoute("/api/v1/system-options/$key")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          await ensureAdmin(request);
          const { key } = parseParams(keyParamSchema, params);
          const row = await getSystemOptionService(key);
          return ok(row);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          await ensureAdmin(request);
          const { key } = parseParams(keyParamSchema, params);
          assertSystemSettingKey(key);
          const body = await parseJsonBody(request, setSystemOptionSchema);
          const dto = await setSystemOptionService({ key, ...body });
          return ok(dto);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
