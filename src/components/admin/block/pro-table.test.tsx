// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ResourceColumn } from "../data-table/resource-table";
import { ProTable } from "./pro-table";

type Row = { id: string; name: string };

const columns: ResourceColumn<Row>[] = [{ key: "name", header: "名称", cell: (row) => row.name }];

function renderTable(props: Partial<React.ComponentProps<typeof ProTable<Row>>> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onSubmit = vi.fn();
  const onChange = vi.fn();
  render(
    <ProTable<Row>
      columns={columns}
      data={[{ id: "1", name: "晓晓" }]}
      rowKey={(row) => row.id}
      search={{
        fields: [
          {
            name: "name",
            label: "音色名称",
            render: ({ value, onChange: setValue, id }) => (
              <input id={id} value={value} onChange={(event) => setValue(event.target.value)} />
            ),
          },
        ],
        defaultValues: { name: "" },
        onSubmit,
      }}
      pagination={{ current: 2, pageSize: 20, total: 100, onChange }}
      {...props}
    />,
    { wrapper },
  );
  return { onSubmit, onChange };
}

describe("ProTable", () => {
  it("renders search, table and the unified pagination bar", () => {
    renderTable();
    expect(screen.getByLabelText("音色名称")).toBeInTheDocument();
    expect(screen.getByText("晓晓")).toBeInTheDocument();
    // 分页条统一：左汇总 + 右页码 + 每页条数选择器。
    expect(screen.getByText("共 100 条，第 2/5 页")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "分页" })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("20 / 页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 5 页" })).toBeInTheDocument();
  });

  it("keeps the search draft until submit", async () => {
    const { onSubmit } = renderTable();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("音色名称"), "云泽");
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "查询" }));
    expect(onSubmit).toHaveBeenCalledWith({ name: "云泽" });
  });

  it("clears the draft on 重置", async () => {
    const { onSubmit } = renderTable();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("音色名称"), "云泽");
    await user.click(screen.getByRole("button", { name: "重置" }));
    expect(screen.getByLabelText("音色名称")).toHaveValue("");
    expect(onSubmit).toHaveBeenCalledWith({ name: "" });
  });

  it("forwards pagination changes to the onChange callback", async () => {
    const { onChange } = renderTable();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "第 3 页" }));
    expect(onChange).toHaveBeenCalledWith(3, 20);
  });

  it("renders inline variant without the page cards", () => {
    const { container } = render(
      <ProTable<Row>
        variant="inline"
        columns={columns}
        data={[{ id: "1", name: "晓晓" }]}
        rowKey={(row) => row.id}
      />,
    );
    // inline 形态不套卡片（page 形态用的是 shadow-card 的 Card）。
    expect(container.querySelectorAll('[class*="shadow-card"]').length).toBe(0);
    expect(screen.getByText("晓晓")).toBeInTheDocument();
  });

  it("renders page variant inside cards", () => {
    const { container } = render(
      <ProTable<Row>
        variant="page"
        columns={columns}
        data={[{ id: "1", name: "晓晓" }]}
        rowKey={(row) => row.id}
      />,
    );
    expect(container.querySelectorAll('[class*="shadow-card"]').length).toBeGreaterThan(0);
  });
});
