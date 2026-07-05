import { z } from "zod";

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().optional(),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export function parsePage(input: unknown): PageQuery {
  return pageQuerySchema.parse(input ?? {});
}

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export function toPage<T>(rows: T[], total: number, query: PageQuery): Page<T> {
  return {
    items: rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}
