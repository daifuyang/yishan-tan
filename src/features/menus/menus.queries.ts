import { queryOptions, useQuery } from "@tanstack/react-query";

import {
  getAuthorizedMenuPaths,
  getAuthorizedMenuTree,
  getMenuTree,
  listMenus,
} from "~/features/menus/menus.actions";
import type { MenuListQuery } from "~/features/menus/menus.schema";
import type { MenuDto, MenuNode } from "~/features/menus/menus.types";

export const menuQueryKey = {
  all: ["menus"] as const,
  tree: () => [...menuQueryKey.all, "tree"] as const,
  lists: () => [...menuQueryKey.all, "list"] as const,
  list: (input: MenuListQuery) => [...menuQueryKey.lists(), input] as const,
  authorizedTree: () => [...menuQueryKey.all, "authorized-tree"] as const,
  authorizedPaths: () => [...menuQueryKey.all, "authorized-paths"] as const,
};

export const menuTreeQueryOptions = (enabled = true) =>
  queryOptions<MenuNode[]>({
    queryKey: menuQueryKey.tree(),
    queryFn: async () => getMenuTree(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled,
  });

export function useMenuTree(enabled = true) {
  return useQuery(menuTreeQueryOptions(enabled));
}

export const menuListQueryOptions = (input: MenuListQuery, enabled = true) =>
  queryOptions<{ items: MenuDto[]; total: number }>({
    queryKey: menuQueryKey.list(input),
    queryFn: async () => listMenus({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled,
  });

export function useMenusList(input: MenuListQuery, enabled = true) {
  return useQuery(menuListQueryOptions(input, enabled));
}

export const authorizedMenuTreeQueryOptions = () =>
  queryOptions<MenuNode[]>({
    queryKey: menuQueryKey.authorizedTree(),
    queryFn: async () => getAuthorizedMenuTree(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

export function useAuthorizedMenuTree() {
  return useQuery(authorizedMenuTreeQueryOptions());
}

export const authorizedMenuPathsQueryOptions = () =>
  queryOptions<string[]>({
    queryKey: menuQueryKey.authorizedPaths(),
    queryFn: async () => getAuthorizedMenuPaths(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

export function useAuthorizedMenuPaths() {
  return useQuery(authorizedMenuPathsQueryOptions());
}
