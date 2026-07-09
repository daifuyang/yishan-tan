import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser } from "~/features/auth/auth.actions";
import {
  deleteUser,
  exportUsers,
  resetUserPassword,
  updateUser,
} from "~/features/users/users.actions";
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

/**
 * 管理员重置用户密码。返回新生成的临时密码（明文，仅展示一次），
 * 缓存层无需 invalidate（用户列表字段不包含密码）。
 */
export function useResetUserPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      return resetUserPassword({ data: { userId } });
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

export function useBulkDeleteUsers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // 与 useBulkUpdateUserStatus 一致：用 Promise.allSettled 让单条失败不阻塞其他删除，
      // 最终把失败条数与首条错误信息聚合抛出，由 useMutation 的 errorMessage 透传给 UI。
      const settled = await Promise.allSettled(ids.map((id) => deleteUser({ data: { id } })));
      const failed = settled.filter((s) => s.status === "rejected") as PromiseRejectedResult[];
      if (failed.length > 0) {
        const messages = failed.map((f) =>
          f.reason instanceof Error ? f.reason.message : String(f.reason),
        );
        throw new Error(`${failed.length}/${ids.length} 条删除失败：${messages[0]}`);
      }
      return { deleted: ids.length };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey.all });
    },
  });
}

/**
 * 导出当前筛选条件下全部用户为 CSV。
 * 返回 CSV 字符串，调用方负责触发浏览器下载（Blob + a[download]）。
 */
export function useExportUsers() {
  return useMutation({
    mutationFn: async (
      input: Parameters<typeof exportUsers>[never] extends never
        ? never
        : Parameters<typeof exportUsers>[0]["data"],
    ) => {
      return exportUsers({ data: input });
    },
  });
}
