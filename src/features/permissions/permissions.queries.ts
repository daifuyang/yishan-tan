import { useQuery } from "@tanstack/react-query";
import { getMyPermissions, getUserFormOptions } from "./permissions.actions";

export function useMyPermissions() {
  return useQuery({
    queryKey: ["permissions", "me"],
    queryFn: () => getMyPermissions(),
    staleTime: 0,
  });
}

export function useUserFormOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["permissions", "user-form"],
    queryFn: () => getUserFormOptions(),
    enabled,
    staleTime: 0,
  });
}
