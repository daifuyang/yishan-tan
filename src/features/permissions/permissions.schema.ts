import { z } from "zod";
import { PERMISSION_CODES } from "~/lib/permission-catalog";

export const permissionCodeSchema = z.enum(PERMISSION_CODES);
export const permissionCodesSchema = z
  .array(permissionCodeSchema)
  .max(100)
  .transform((codes) => [...new Set(codes)]);
