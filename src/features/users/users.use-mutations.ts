import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser } from "~/features/auth/auth.actions";
import { deleteUser, updateUser } from "~/features/users/users.actions";
import { usersQueryKey } from "~/features/users/users.queries";

/**
 * admin 新增用户输入：与 createUserSchema 字段对应（auth.feature）。
 * phone / displayName / roleIds 在 createUserSchema 都是 optional；status 默认 enabled。
 * roleIds：未传 = 不处理；传空数组 = 清空；传非空 = 全量替换（事务 delete+insert，与 updateUserService 同语义）。
 */
type CreateUserInput = {
  email: string;
  username: string;
  password: string;
  name?: string;
  displayName?: string;
  phone?: string;
  status?: "enabled" | "disabled";
  deptId?: string | null;
  postIds?: string[];
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  remark?: string | null;
  roleIds?: string[];
};

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      return createUser({ data: input });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey.all });
    },
  });
}

type UpdateUserInput = {
  id: string;
  data: {
    name?: string;
    displayName?: string;
    phone?: string;
    email?: string;
    status?: "enabled" | "disabled";
    deptId?: string | null;
    postIds?: string[];
    gender?: "male" | "female" | "other" | null;
    birthDate?: string | null;
    remark?: string | null;
    roleIds?: string[];
  };
};

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: UpdateUserInput) => {
      return updateUser({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteUser({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey.all });
    },
  });
}

type BulkUpdateStatusInput = {
  ids: string[];
  status: "enabled" | "disabled";
};

export function useBulkUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: BulkUpdateStatusInput) => {
      const settled = await Promise.allSettled(
        ids.map((id) => updateUser({ data: { id, status } })),
      );
      const failed = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
      if (failed.length > 0) {
        const messages = failed.map((f) =>
          f.reason instanceof Error ? f.reason.message : String(f.reason),
        );
        throw new Error(`${failed.length}/${ids.length} 条更新失败：${messages[0]}`);
      }
      return { updated: ids.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey.all });
    },
  });
}
