import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/display";
import { ResourcePage } from "@/components/admin/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLoginLogsList } from "~/features/login-logs/login-logs.queries";
import type { ListLoginLogsQuery } from "~/features/login-logs/login-logs.schema";
import type { LoginLogDto } from "~/features/login-logs/login-logs.types";

type StatusFilter = "all" | "success" | "failed";

type FilterState = {
  keyword: string;
  status: StatusFilter;
  ipAddress: string;
  userAgent: string;
  createdFrom: string;
  createdTo: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  status: "all",
  ipAddress: "",
  userAgent: "",
  createdFrom: "",
  createdTo: "",
};

const FILTER_CONTROL_CLASS = "h-8 w-full text-[13px]";
const TABLE_ACTION_CLASS =
  "h-auto rounded-none px-0 py-0 text-[13px] font-normal text-brand-600 hover:bg-transparent hover:text-brand-700 hover:no-underline disabled:text-text-mute";
const MONO_CLASS = "font-mono text-[12px] text-text-soft";

export const Route = createFileRoute("/admin/login-logs")({
  component: AdminLoginLogsPage,
});

function toQuery(state: FilterState, page: number, pageSize: number): ListLoginLogsQuery {
  const trim = (v: string) => v.trim() || undefined;
  return {
    page,
    pageSize,
    keyword: trim(state.keyword),
    status: state.status === "all" ? undefined : state.status,
    createdFrom: trim(state.createdFrom),
    createdTo: trim(state.createdTo),
  };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function truncate(value: string | null | undefined, max: number): string {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function matchesIpFilter(value: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  if (!value) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

function matchesUserAgentFilter(value: string | null | undefined, needle: string): boolean {
  if (!needle) return true;
  if (!value) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

function AdminLoginLogsPage() {
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [viewing, setViewing] = React.useState<LoginLogDto | null>(null);

  const query = toQuery(filters, page, pageSize);
  const list = useLoginLogsList(query);

  const allItems = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  // IP / User Agent 是只读客户端筛选，避免再发一次查询
  const items = React.useMemo(
    () =>
      allItems.filter(
        (item) =>
          matchesIpFilter(item.ipAddress, filters.ipAddress) &&
          matchesUserAgentFilter(item.userAgent, filters.userAgent),
      ),
    [allItems, filters.ipAddress, filters.userAgent],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: filter fields used only as trigger for reset
  React.useEffect(() => {
    setPage(1);
  }, [
    filters.keyword,
    filters.status,
    filters.ipAddress,
    filters.userAgent,
    filters.createdFrom,
    filters.createdTo,
  ]);

  const applyFilterPatch = React.useCallback((patch: Partial<FilterState>) => {
    setFilters((s) => ({ ...s, ...patch }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const columns: ResourceColumn<LoginLogDto>[] = [
    {
      key: "username",
      header: "账号",
      width: "160px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-strong" title={row.username ?? ""}>
          {row.username ?? <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      width: "130px",
      cell: (row) => (
        <span className={MONO_CLASS} title={row.ipAddress ?? ""}>
          {row.ipAddress ?? <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "userAgent",
      header: "User Agent",
      width: "240px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.userAgent ?? ""}>
          {row.userAgent ? truncate(row.userAgent, 60) : <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "状态",
      width: "100px",
      cell: (row) => (
        <StatusBadge
          tone={row.status === "success" ? "success" : "danger"}
          label={row.status === "success" ? "成功" : "失败"}
          variant="soft"
        />
      ),
    },
    {
      key: "message",
      header: "消息",
      width: "200px",
      cell: (row) => (
        <span className="truncate text-[13px] text-text-soft" title={row.message ?? ""}>
          {row.message ? truncate(row.message, 40) : <span className="text-text-mute">—</span>}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "登录时间",
      width: "170px",
      cell: (row) => (
        <span className="text-[13px] text-text-soft">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      width: "120px",
      sticky: "right",
      cell: (row) => (
        <div className="flex items-center justify-end whitespace-nowrap">
          <Button
            type="button"
            variant="link"
            size="sm"
            className={TABLE_ACTION_CLASS}
            onClick={(e) => {
              e.stopPropagation();
              setViewing(row);
            }}
          >
            查看详情
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ResourcePage
        title="登录日志"
        description="记录所有用户的登录尝试（仅管理员可见，只读）。"
        filterColumns={3}
        filterCollapsible
        filter={
          <>
            <QueryFormItem label="用户名" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                placeholder="模糊匹配"
                value={filters.keyword}
                onChange={(e) => applyFilterPatch({ keyword: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-status">
              <Select
                value={filters.status}
                onValueChange={(v) => applyFilterPatch({ status: v as StatusFilter })}
              >
                <SelectTrigger id="filter-status" className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="success">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                </SelectContent>
              </Select>
            </QueryFormItem>

            <QueryFormItem label="IP" htmlFor="filter-ip">
              <Input
                id="filter-ip"
                className={FILTER_CONTROL_CLASS}
                placeholder="客户端过滤"
                value={filters.ipAddress}
                onChange={(e) => applyFilterPatch({ ipAddress: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="User Agent" htmlFor="filter-ua">
              <Input
                id="filter-ua"
                className={FILTER_CONTROL_CLASS}
                placeholder="客户端过滤"
                value={filters.userAgent}
                onChange={(e) => applyFilterPatch({ userAgent: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="开始时间" htmlFor="filter-from">
              <Input
                id="filter-from"
                type="date"
                className={FILTER_CONTROL_CLASS}
                value={filters.createdFrom}
                onChange={(e) => applyFilterPatch({ createdFrom: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="结束时间" htmlFor="filter-to">
              <Input
                id="filter-to"
                type="date"
                className={FILTER_CONTROL_CLASS}
                value={filters.createdTo}
                onChange={(e) => applyFilterPatch({ createdTo: e.target.value })}
              />
            </QueryFormItem>
          </>
        }
        filterValues={filters}
        onFilterChange={(next) =>
          setFilters({
            keyword: String(next.keyword ?? ""),
            status: (next.status as StatusFilter) ?? "all",
            ipAddress: String(next.ipAddress ?? ""),
            userAgent: String(next.userAgent ?? ""),
            createdFrom: String(next.createdFrom ?? ""),
            createdTo: String(next.createdTo ?? ""),
          })
        }
        onFilterReset={handleResetFilters}
        filterLoading={list.isFetching}
        toolbarTitle="日志列表"
        tableProps={{
          columns: columns as ResourceColumn<LoginLogDto>[],
          data: items,
          rowKey: (row) => row.id,
          page,
          pageSize,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
          loading: list.isFetching,
          emptyTitle: "暂无日志",
          emptyDescription: list.isError
            ? "加载登录日志失败，请稍后重试或检查后端日志。"
            : "当前筛选条件下没有匹配的日志记录。",
          emptyAction: list.isError ? (
            <Button type="button" size="sm" variant="outline" onClick={() => void list.refetch()}>
              重试
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handleResetFilters}>
              清空筛选
            </Button>
          ),
          error: list.isError
            ? list.error instanceof Error
              ? list.error.message
              : "加载失败"
            : undefined,
        }}
      />

      <LoginLogDetailSheet log={viewing} onOpenChange={(open) => !open && setViewing(null)} />
    </>
  );
}

function LoginLogDetailSheet({
  log,
  onOpenChange,
}: {
  log: LoginLogDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={log !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>登录日志详情</SheetTitle>
          <SheetDescription>{log ? formatDateTime(log.createdAt) : ""}</SheetDescription>
        </SheetHeader>

        {log ? (
          <div className="mt-6 space-y-4 text-[13px]">
            <DetailRow label="账号" value={log.username ?? "—"} mono />
            <DetailRow label="状态">
              <StatusBadge
                tone={log.status === "success" ? "success" : "danger"}
                label={log.status === "success" ? "成功" : "失败"}
                variant="soft"
              />
            </DetailRow>
            <DetailRow label="IP 地址" value={log.ipAddress ?? "—"} mono />
            <DetailRow label="User Agent" value={log.userAgent ?? "—"} mono break />
            <DetailRow label="消息" value={log.message ?? "—"} break />
            <DetailRow label="登录时间" value={formatDateTime(log.createdAt)} />
            <DetailRow label="用户 ID" value={log.userId ?? "—"} mono />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
  children,
  mono,
  break: shouldBreak,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  mono?: boolean;
  break?: boolean;
}) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-3">
      <span className="text-text-mute">{label}</span>
      <div className="min-w-0 text-text-strong">
        {children ?? (
          <span
            className={[mono ? "font-mono text-[12px]" : "", shouldBreak ? "break-all" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
