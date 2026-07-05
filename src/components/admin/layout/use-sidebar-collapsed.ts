import * as React from "react";

const STORAGE_KEY = "yishan-tan-admin-sidebar-collapsed-v1";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStored(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore quota / privacy mode errors
  }
}

export type SidebarCollapsedState = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
};

export function useSidebarCollapsed(): SidebarCollapsedState {
  const [collapsed, setCollapsedState] = React.useState<boolean>(() => readStored());

  const setCollapsed = React.useCallback((next: boolean) => {
    setCollapsedState(next);
    writeStored(next);
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      writeStored(next);
      return next;
    });
  }, []);

  return { collapsed, toggle, setCollapsed };
}
