import type { DbMenu } from "~/../db/schema";

export type MenuDto = {
  id: string;
  parentId: string | null;
  name: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  type: "group" | "menu" | "action";
  permission: string | null;
  sort: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
};

export type MenuNode = MenuDto & { children: MenuNode[] };

export type ListMenusService = (input: {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: "enabled" | "disabled";
  type?: "group" | "menu" | "action";
}) => Promise<{ items: MenuDto[]; total: number }>;

export type GetMenuTreeService = () => Promise<MenuNode[]>;

export type GetAuthorizedMenuTreeService = (userId: string) => Promise<MenuNode[]>;

export type GetAuthorizedMenuPathsService = (userId: string) => Promise<string[]>;

export type CreateMenuService = (input: {
  parentId?: string | null;
  name: string;
  path?: string;
  component?: string;
  icon?: string;
  type?: "group" | "menu" | "action";
  permission?: string;
  sort?: number;
  status?: "enabled" | "disabled";
}) => Promise<MenuDto>;

export type UpdateMenuService = (
  id: string,
  input: Partial<Omit<Parameters<CreateMenuService>[0], never>>,
) => Promise<MenuDto>;

export type DeleteMenuService = (id: string) => Promise<{ ok: true }>;

export type DbMenuRow = DbMenu;
