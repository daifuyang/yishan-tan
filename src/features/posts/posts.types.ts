import type { DbPost } from "~/../db/schema";

export type PostDto = {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
  sort: number;
  status: "enabled" | "disabled";
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ListPostsService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  departmentId?: string;
  sortMin?: number;
  status?: "enabled" | "disabled";
  createdFrom?: string;
  createdTo?: string;
}) => Promise<{ items: PostDto[]; total: number }>;

export type GetPostService = (id: string) => Promise<PostDto | null>;

export type CreatePostService = (input: {
  name: string;
  departmentId: string;
  sort?: number;
  status?: "enabled" | "disabled";
}) => Promise<PostDto>;

export type UpdatePostService = (
  id: string,
  input: {
    name?: string;
    departmentId?: string;
    sort?: number;
    status?: "enabled" | "disabled";
  },
) => Promise<PostDto>;

export type DeletePostService = (id: string) => Promise<{ ok: true }>;

export type DbPostRow = DbPost;
