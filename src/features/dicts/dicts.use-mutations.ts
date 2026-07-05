import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createDictData,
  createDictType,
  deleteDictData,
  deleteDictType,
  updateDictData,
  updateDictType,
} from "~/features/dicts/dicts.actions";
import { dictsQueryKey } from "~/features/dicts/dicts.queries";
import type {
  CreateDictDataInput,
  CreateDictTypeInput,
  UpdateDictDataInput,
  UpdateDictTypeInput,
} from "~/features/dicts/dicts.schema";

export function useCreateDictType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDictTypeInput) => {
      return createDictType({ data });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictsQueryKey.types() });
    },
  });
}

type UpdateDictTypeInputWithId = UpdateDictTypeInput & { id: string };

export function useUpdateDictType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDictTypeInputWithId) => {
      return updateDictType({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictsQueryKey.types() });
    },
  });
}

export function useDeleteDictType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDictType({ data: { id } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictsQueryKey.types() });
    },
  });
}

export function useCreateDictData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDictDataInput) => {
      return createDictData({ data });
    },
    onSuccess: async () => {
      // dict_data 变更会影响 dict_type 列表上的 dataCount 聚合，需要同步清空类型列表缓存
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dictsQueryKey.datas() }),
        queryClient.invalidateQueries({ queryKey: dictsQueryKey.types() }),
      ]);
    },
  });
}

type UpdateDictDataInputWithId = UpdateDictDataInput & { id: string };

export function useUpdateDictData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDictDataInputWithId) => {
      return updateDictData({ data: { id, ...data } });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dictsQueryKey.datas() }),
        queryClient.invalidateQueries({ queryKey: dictsQueryKey.types() }),
      ]);
    },
  });
}

export function useDeleteDictData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return deleteDictData({ data: { id } });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dictsQueryKey.datas() }),
        queryClient.invalidateQueries({ queryKey: dictsQueryKey.types() }),
      ]);
    },
  });
}
