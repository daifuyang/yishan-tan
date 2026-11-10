import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// JSDOM does not implement ResizeObserver; Radix primitives (e.g. @radix-ui/react-select's
// trigger via use-size) require it for layout measurement and throw on mount without it.
// Stub a minimal observer globally so any test file that mounts a Radix primitive works.
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

afterEach(() => {
  cleanup();
});
