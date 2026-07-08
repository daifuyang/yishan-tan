import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

import { QueryFormItem, type ResourceColumn } from "@/components/admin/data-table";
import { FILTER_CONTROL_CLASS, TABLE_ACTION_CLASS } from "@/components/admin/data-table/tokens";
import { StatusBadge } from "@/components/admin/display";
import { DateRangePicker, DetailSheet, DetailSheetRow } from "@/components/admin/form";
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
import { useLoginLogsList } from "~/features/login-logs/login-logs.queries";
import type { ListLoginLogsQuery } from "~/features/login-logs/login-logs.schema";
import type { LoginLogDto } from "~/features/login-logs/login-logs.types";
import { MONO_CELL } from "~/lib/classes";

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
  if (Number.isNaN(d.getTime())) return "--";
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
  const [draft, setDraft] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [viewing, setViewing] = React.useState<LoginLogDto | null>(null);

  const query = toQuery(filters, page, pageSize);
  const list = useLoginLogsList(query);

  const allItems = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  // IP / User Agent 是只读客户端筛选，避免再发一次查询。
  // 客户端过滤使用 draft，IP/UA 输入即生效，提交按钮仅承担"对齐 ResourcePage 形态"职责。
  const items = React.useMemo(
    () =>
      allItems.filter(
        (item) =>
          matchesIpFilter(item.ipAddress, draft.ipAddress) &&
          matchesUserAgentFilter(item.userAgent, draft.userAgent),
      ),
    [allItems, draft.ipAddress, draft.userAgent],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (page > totalPages && total > 0) setPage(totalPages);
  }, [page, totalPages, total]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft fields used only as trigger for reset
  React.useEffect(() => {
    setPage(1);
  }, [
    draft.keyword,
    draft.status,
    draft.ipAddress,
    draft.userAgent,
    draft.createdFrom,
    draft.createdTo,
  ]);

  const applyDraftPatch = React.useCallback((patch: Partial<FilterState>) => {
    setDraft((s) => ({ ...s, ...patch }));
  }, []);

  const handleFilterSubmit = () => {
    setFilters(draft);
  };

  const handleResetFilters = React.useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  const columns: ResourceColumn<LoginLogDto>[] = [
    {
      key: "username",
      header: "账号",
      width: "160px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-strong"
          title={row.username ?? ""}
        >
          {row.username ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      width: "130px",
      cell: (row) => (
        <span className={MONO_CELL} title={row.ipAddress ?? ""}>
          {row.ipAddress ?? <span className="text-text-mute">--</span>}
        </span>
      ),
    },
    {
      key: "userAgent",
      header: "User Agent",
      width: "240px",
      cell: (row) => (
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.userAgent ?? ""}
        >
          {row.userAgent ? truncate(row.userAgent, 60) : <span className="text-text-mute">--</span>}
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
        <span
          className="break-words whitespace-normal text-[13px] text-text-soft"
          title={row.message ?? ""}
        >
          {row.message ? truncate(row.message, 40) : <span className="text-text-mute">--</span>}
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
        filterColumns={3}
        filterCollapsible
        filterDefaultCollapsed
        filter={
          <>
            <QueryFormItem label="用户名" htmlFor="filter-keyword">
              <Input
                id="filter-keyword"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="模糊匹配"
                value={draft.keyword}
                onChange={(e) => applyDraftPatch({ keyword: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="状态" htmlFor="filter-status">
              <Select
                value={draft.status}
                onValueChange={(v) => applyDraftPatch({ status: v as StatusFilter })}
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
                allowClear
                placeholder="客户端过滤"
                value={draft.ipAddress}
                onChange={(e) => applyDraftPatch({ ipAddress: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="User Agent" htmlFor="filter-ua">
              <Input
                id="filter-ua"
                className={FILTER_CONTROL_CLASS}
                allowClear
                placeholder="客户端过滤"
                value={draft.userAgent}
                onChange={(e) => applyDraftPatch({ userAgent: e.target.value })}
              />
            </QueryFormItem>

            <QueryFormItem label="登录时间" htmlFor="filter-created-range">
              <DateRangePicker
                id="filter-created-range"
                value={{ start: draft.createdFrom || null, end: draft.createdTo || null }}
                onChange={(r) =>
                  applyDraftPatch({ createdFrom: r.start ?? "", createdTo: r.end ?? "" })
                }
              />
            </QueryFormItem>
          </>
        }
        filterValues={draft}
        onFilterSubmit={handleFilterSubmit}
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
    <DetailSheet
      open={log !== null}
      onOpenChange={onOpenChange}
      title="登录日志详情"
      description={log ? formatDateTime(log.createdAt) : ""}
      size="md"
    >
      {log ? (
        <>
          <DetailSheetRow label="账号" value={log.username ?? "--"} mono />
          <DetailSheetRow label="状态">
            <StatusBadge
              tone={log.status === "success" ? "success" : "danger"}
              label={log.status === "success" ? "成功" : "失败"}
              variant="soft"
            />
          </DetailSheetRow>
          <DetailSheetRow label="IP 地址" value={log.ipAddress ?? "--"} mono />
          <DetailSheetRow label="User Agent" value={log.userAgent ?? "--"} mono break />
          <DetailSheetRow label="消息" value={log.message ?? "--"} break />
          <DetailSheetRow label="登录时间" value={formatDateTime(log.createdAt)} />
          <DetailSheetRow label="用户 ID" value={log.userId ?? "--"} mono />
        </>
      ) : null}
    </DetailSheet>
  );
}
