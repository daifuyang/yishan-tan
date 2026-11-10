export type LoginLogDto = {
  id: string;
  userId: string | null;
  username: string | null;
  status: "success" | "failed";
  message: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ListLoginLogsService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: "success" | "failed";
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: "createdAt" | "username" | "status";
  sortOrder?: "asc" | "desc";
}) => Promise<{ items: LoginLogDto[]; total: number }>;
