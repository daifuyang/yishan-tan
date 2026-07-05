import { z } from "zod";

export const loginLogStatusSchema = z.enum(["success", "failed"]);

export const listLoginLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
  status: loginLogStatusSchema.optional(),
  userId: z.string().uuid().optional(),
  createdFrom: z.string().trim().optional(),
  createdTo: z.string().trim().optional(),
});

export type ListLoginLogsQuery = z.infer<typeof listLoginLogsSchema>;
