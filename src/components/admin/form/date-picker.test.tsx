// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DatePicker } from "./date-picker";

it("confirms date and time in one panel before updating the form", () => {
  render(
    <form aria-label="策略">
      <DatePicker mode="datetime" name="effectiveFrom" />
    </form>,
  );
  const form = screen.getByRole<HTMLFormElement>("form", { name: "策略" });
  const read = () => new FormData(form).get("effectiveFrom");

  expect(read()).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "请选择日期和时间" }));
  fireEvent.click(screen.getByRole("button", { name: "今天" }));
  // 选日期只是草稿，不写表单。
  expect(read()).toBe("");
  const hour = within(screen.getByRole("group", { name: "小时" })).getByRole("button", {
    name: "15",
  });
  const minute = within(screen.getByRole("group", { name: "分钟" })).getByRole("button", {
    name: "30",
  });
  fireEvent.wheel(hour, { deltaY: 2, deltaMode: 1 });
  expect(hour.parentElement?.scrollTop).toBe(56);
  expect(minute.parentElement?.scrollTop).toBe(0);
  expect(hour.getAttribute("aria-pressed")).toBe("false");
  fireEvent.click(hour);
  fireEvent.click(minute);
  fireEvent.click(screen.getByRole("button", { name: "确定" }));
  expect(read()).toMatch(/^\d{4}-\d{2}-\d{2}T15:30$/);
  expect(screen.queryByRole("group", { name: "分钟" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "清空" }));
  expect(read()).toBe("");
});

it("selects a date and reports the ISO value in date mode", () => {
  const onChange = vi.fn();
  render(<DatePicker mode="date" value="2026-03-05" onChange={onChange} />);
  const trigger = screen.getByRole("button", { name: "请选择日期" });
  expect(trigger).toHaveTextContent("2026年3月5日");
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "今天" }));
  expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
});
