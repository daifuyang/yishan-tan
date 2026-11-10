import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { Page } from "~/lib/pagination";

import { SearchSelect, type SearchSelectOption, type SearchSelectProps } from "./search-select";

export type RemoteSearchSelectProps = Pick<
  SearchSelectProps,
  "id" | "aria-label" | "placeholder" | "searchPlaceholder" | "disabled" | "className" | "emptyText"
> & {
  value: SearchSelectOption | null;
  onChange: (option: SearchSelectOption | null) => void;
  queryKey: readonly string[];
  loadPage: (params: {
    keyword: string;
    page: number;
    pageSize: number;
    signal: AbortSignal;
  }) => Promise<Page<SearchSelectOption>>;
};

const PAGE_SIZE = 50;
const SEARCH_DELAY_MS = 300;

export function RemoteSearchSelect({
  value,
  onChange,
  queryKey,
  loadPage,
  ...props
}: RemoteSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  // 防抖:输入停止 SEARCH_DELAY_MS 之后才真正发起查询
  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(search.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const pendingSearch = search.trim() !== keyword;

  const query = useInfiniteQuery({
    queryKey: ["remote-search-select", ...queryKey, keyword],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      loadPage({ keyword, page: pageParam, pageSize: PAGE_SIZE, signal }),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: open && !pendingSearch,
    staleTime: 30_000,
    retry: false,
  });

  const options = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page.items) ?? []).map((option) => [
        option.value,
        option,
      ]),
    ).values(),
  );

  return (
    <SearchSelect
      {...props}
      value={value?.value ?? null}
      selectedOption={value}
      options={options}
      filterOptions={false}
      onChange={(next) =>
        onChange(next ? (options.find((option) => option.value === next) ?? null) : null)
      }
      onSearchChange={setSearch}
      onOpenChange={(next) => {
        setOpen(next);
        setKeyword("");
      }}
      loading={pendingSearch || query.isLoading || (query.isFetching && !query.data)}
      loadingMore={query.isFetchingNextPage}
      error={query.isError}
      onRetry={() => {
        if (query.isFetchNextPageError) void query.fetchNextPage();
        else void query.refetch();
      }}
      hasMore={query.hasNextPage}
      onLoadMore={() => {
        if (!query.isFetching) void query.fetchNextPage();
      }}
    />
  );
}
