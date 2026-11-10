// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ResourcePagination, type ResourcePaginationProps } from "./resource-pagination";

describe("ResourcePagination", () => {
  it("can render a compact navigation-only mode for public resource libraries", () => {
    const props = {
      current: 1,
      pageSize: 12,
      total: 48,
      onChange: vi.fn(),
      showTotal: false,
      showSizeChanger: false,
    } as ResourcePaginationProps;

    render(<ResourcePagination {...props} />);

    expect(screen.getByRole("navigation", { name: "分页" })).toBeInTheDocument();
    expect(screen.queryByText(/共 48 条/)).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders the unified summary and the current page", () => {
    render(
      <ResourcePagination
        current={2}
        pageSize={20}
        total={100}
        onChange={vi.fn()}
        showSizeChanger
      />,
    );

    expect(screen.getByText("共 100 条，第 2/5 页")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "第 2 页" })).toHaveAttribute("aria-current", "page");
    // 每页条数下拉有明确的可访问名，页码/翻页按钮也都有可访问名。
    expect(screen.getByRole("combobox", { name: "每页条数" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一页" })).toBeInTheDocument();
  });

  it("reports page changes and clamps them to the available range", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ResourcePagination current={2} pageSize={20} total={100} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "第 3 页" }));
    expect(onChange).toHaveBeenCalledWith(3, 20);

    // 第一页时「上一页」禁用，不会回调越界页码。
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalledWith(0, 20);
  });
});
