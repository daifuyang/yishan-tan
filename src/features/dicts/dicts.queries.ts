import { queryOptions, useQuery } from "@tanstack/react-query";

import { listDictData, listDictTypes } from "~/features/dicts/dicts.actions";
import type { DictDataListQuery, DictTypeListQuery } from "~/features/dicts/dicts.schema";
import type { DictDataDto, DictTypeListItemDto } from "~/features/dicts/dicts.types";

export const dictsQueryKey = {
  all: ["dicts"] as const,
  types: () => [...dictsQueryKey.all, "types"] as const,
  typeList: (input: DictTypeListQuery) => [...dictsQueryKey.types(), input] as const,
  datas: () => [...dictsQueryKey.all, "datas"] as const,
  dataList: (input: DictDataListQuery) => [...dictsQueryKey.datas(), input] as const,
  dataByCode: (code: string) => [...dictsQueryKey.datas(), { code }] as const,
};

export const dictTypesListQueryOptions = (input: DictTypeListQuery) =>
  queryOptions<{ items: DictTypeListItemDto[]; total: number }>({
    queryKey: dictsQueryKey.typeList(input),
    queryFn: async () => listDictTypes({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useDictTypesList(input: DictTypeListQuery) {
  return useQuery(dictTypesListQueryOptions(input));
}

export const dictDataListQueryOptions = (input: DictDataListQuery) =>
  queryOptions<{ items: DictDataDto[]; total: number }>({
    queryKey: dictsQueryKey.dataList(input),
    queryFn: async () => listDictData({ data: input }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

export function useDictDataList(input: DictDataListQuery) {
  return useQuery(dictDataListQueryOptions(input));
}

const DICT_DATA_BY_CODE_QUERY: DictDataListQuery = {
  page: 1,
  pageSize: 100,
  status: "enabled",
};

/**
 * 按 typeCode 拉取启用的字典数据，供 settings / 角色 / 部门表单的 Select 选项源使用。
 * 字典数据极少变更，使用更长的 staleTime 减少无效请求。
 */
export function useDictDataByCode(code: string) {
  return useQuery({
    queryKey: dictsQueryKey.dataByCode(code),
    queryFn: async () =>
      listDictData({
        data: { ...DICT_DATA_BY_CODE_QUERY, typeCode: code },
      }),
    enabled: Boolean(code),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
