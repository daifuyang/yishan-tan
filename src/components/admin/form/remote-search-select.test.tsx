// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page } from "~/lib/pagination";
import { RemoteSearchSelect } from "./remote-search-select";
import { SearchSelect, type SearchSelectOption } from "./search-select";

type Params = {
  keyword: string;
  page: number;
  pageSize: number;
  signal: AbortSignal;
};
const voice = {
  value: "zh-CN-YunzeNeural",
  label: "云泽",
  description: "zh-CN-YunzeNeural",
};
const otherVoice = { value: "zh-CN-XiaoxiaoNeural", label: "晓晓" };
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => client.clear());

function mount(
  loadPage: (params: Params) => Promise<Page<SearchSelectOption>>,
  onSubmit = vi.fn(),
) {
  function Fixture() {
    const [value, setValue] = useState<SearchSelectOption | null>(null);
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <RemoteSearchSelect
          id="voice"
          aria-label="主播"
          value={value}
          onChange={setValue}
          queryKey={["voices"]}
          loadPage={loadPage}
        />
        <button type="submit">查询</button>
      </form>
    );
  }
  return render(
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>,
  );
}

/**
 * 打开下拉：Radix Popover 打开时默认会把焦点移到浮层容器，
 * 组件通过 onOpenAutoFocus 阻止默认行为，焦点始终留在输入框上。
 */
async function openSelect(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLElement,
): Promise<void> {
  await user.click(input);
  await waitFor(() => expect(input).toHaveFocus());
}

/** 输入框是 combobox（role="combobox"）。 */
function combobox(name: string | RegExp) {
  return screen.getByRole("combobox", { name });
}

/** 选项渲染为 listbox 里的 role="option"。 */
function option(label: string | RegExp) {
  return within(screen.getByRole("listbox")).getByRole("option", { name: label });
}

describe("RemoteSearchSelect", () => {
  it("loads only on open, pages on demand, preserves a selected label and submits the form", async () => {
    const loader = vi.fn(async ({ page, pageSize }: Params) => ({
      page,
      pageSize,
      total: 51,
      items: page === 1 ? [voice] : [otherVoice],
    }));
    const submit = vi.fn();
    mount(loader, submit);
    expect(loader).not.toHaveBeenCalled();
    const user = userEvent.setup();
    const input = combobox("主播");
    await openSelect(user, input);
    await screen.findByRole("listbox", { name: "主播" });
    expect(loader).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 50,
        keyword: "",
        signal: expect.any(AbortSignal),
      }),
    );
    await user.click(await screen.findByRole("button", { name: "加载更多" }));
    await screen.findByRole("option", { name: /晓晓/ });
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(screen.queryByRole("button", { name: "加载更多" })).not.toBeInTheDocument();
    await user.click(option(/晓晓/));
    expect(input).toHaveValue("晓晓");
    // 选中后浮层收起，输入框回填所选标签；表单照常提交。
    await user.click(screen.getByRole("button", { name: "查询" }));
    expect(submit).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "清空选择" }));
    expect(input).toHaveValue("");
  });

  it("debounces searches, aborts stale requests and keeps the chosen label outside the current results", async () => {
    let staleSignal: AbortSignal | undefined;
    const loader = vi.fn(({ keyword, page, pageSize, signal }: Params) => {
      if (keyword === "旧") {
        staleSignal = signal;
        return new Promise<Page<SearchSelectOption>>(() => {});
      }
      return Promise.resolve({
        page,
        pageSize,
        total: keyword ? 0 : 1,
        items: keyword ? [] : [voice],
      });
    });
    mount(loader);
    const user = userEvent.setup();
    const input = combobox("主播");
    await openSelect(user, input);
    await user.click(await screen.findByRole("option", { name: /云泽/ }));
    expect(input).toHaveValue("云泽");
    await openSelect(user, input);
    const before = loader.mock.calls.length;
    // 打开后立刻打字：焦点留在输入框上，首字符不能丢。
    await user.keyboard("旧");
    expect(input).toHaveValue("旧");
    expect(loader).toHaveBeenCalledTimes(before);
    await waitFor(() => expect(staleSignal).toBeDefined());
    await user.clear(input);
    await user.keyboard("新主播");
    await screen.findByText("未找到匹配项");
    expect(loader).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: "新主播", page: 1 }),
    );
    expect(staleSignal?.aborted).toBe(true);
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("云泽");
  });

  it("shows safe errors and retries failed additional pages without losing previous results", async () => {
    let fail = true;
    const loader = vi.fn(async ({ page, pageSize }: Params) => {
      if (fail) throw new Error("private SQL error");
      return {
        page,
        pageSize,
        total: 51,
        items: page === 1 ? [voice] : [otherVoice],
      };
    });
    mount(loader);
    const user = userEvent.setup();
    await openSelect(user, combobox("主播"));
    await screen.findByText("选项加载失败，请重试");
    expect(screen.queryByText("private SQL error")).not.toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "重试" }));
    await screen.findByRole("option", { name: /云泽/ });
    fail = true;
    await user.click(screen.getByRole("button", { name: "加载更多" }));
    await screen.findByText("选项加载失败，请重试");
    expect(screen.getByRole("option", { name: /云泽/ })).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "重试" }));
    await screen.findByRole("option", { name: /晓晓/ });
    expect(loader).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it("keeps existing local SearchSelect filtering and selection working", async () => {
    const onChange = vi.fn();
    render(
      <SearchSelect
        aria-label="本地主播"
        value={null}
        options={[voice, otherVoice]}
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    const input = combobox("本地主播");
    await openSelect(user, input);
    await user.keyboard("晓");
    expect(input).toHaveValue("晓");
    expect(
      within(screen.getByRole("listbox", { name: "本地主播" })).queryByRole("option", {
        name: /云泽/,
      }),
    ).not.toBeInTheDocument();
    await user.click(option(/晓晓/));
    expect(onChange).toHaveBeenCalledWith(otherVoice.value);
  });

  it("moves the active option with arrow keys and selects it with Enter", async () => {
    const onChange = vi.fn();
    render(
      <SearchSelect
        aria-label="本地主播"
        value={null}
        options={[voice, otherVoice]}
        onChange={onChange}
      />,
    );
    const user = userEvent.setup();
    const input = combobox("本地主播");
    await openSelect(user, input);

    const first = screen.getByRole("option", { name: /云泽/ });
    const second = screen.getByRole("option", { name: /晓晓/ });

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", first.id);
    expect(first).toHaveClass("bg-line-soft");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", second.id);

    // 上下键循环
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", first.id);
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", second.id);

    // Home / End 跳到首尾
    await user.keyboard("{Home}");
    expect(input).toHaveAttribute("aria-activedescendant", first.id);
    await user.keyboard("{End}");
    expect(input).toHaveAttribute("aria-activedescendant", second.id);

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(otherVoice.value);
  });

  it("closes the overlay with Escape and returns the focus to the input", async () => {
    render(
      <SearchSelect
        aria-label="本地主播"
        value={null}
        options={[voice, otherVoice]}
        onChange={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    const input = combobox("本地主播");
    await openSelect(user, input);
    await screen.findByRole("listbox", { name: "本地主播" });

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("listbox", { name: "本地主播" })).not.toBeInTheDocument(),
    );
    expect(input).toHaveFocus();
  });
});
