import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { deleteSession } from "~/features/auth/auth.actions";
import { currentUserQueryKey } from "~/features/auth/auth.queries";

type LogoutOptions = {
  redirectTo?: string;
};

export function useLogout(options: LogoutOptions = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const { redirectTo = "/login" } = options;

  return useMutation({
    mutationFn: async () => {
      await deleteSession();
      return { ok: true as const };
    },
    onSuccess: async () => {
      queryClient.setQueryData(currentUserQueryKey, null);
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      await router.invalidate();
      await navigate({ to: redirectTo });
    },
  });
}
