import * as React from "react";
import type { UseFormReturn } from "react-hook-form";

import { FormDialog } from "./form-dialog";
import { FormSheet } from "./form-sheet";

type FormLayerSharedProps = Omit<
  Parameters<typeof FormDialog>[0],
  "contentClassName" | "size" | "side"
> & {
  /** 断点 key，命中及以上走 Dialog；未命中走 Sheet。默认 "md"（≥768px）。 */
  breakpoint?: "md" | "lg";
  /** Sheet 出现的方向，仅移动端生效。默认 "right"。 */
  side?: "right" | "left";
  /** Dialog 尺寸。默认 "md"。 */
  dialogSize?: Parameters<typeof FormDialog>[0]["size"];
  /** Sheet 尺寸。默认 "md"。 */
  sheetSize?: Parameters<typeof FormSheet>[0]["size"];
};

const BREAKPOINT_QUERY: Record<NonNullable<FormLayerSharedProps["breakpoint"]>, string> = {
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
};

function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (cb: (e: MediaQueryListEvent) => void) => {
      if (typeof window === "undefined") return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [query],
  );

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = React.useCallback(() => false, []);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ResponsiveFormLayer(props: FormLayerSharedProps) {
  const {
    breakpoint = "md",
    side = "right",
    dialogSize = "md",
    sheetSize = "md",
    open,
    onOpenChange,
    title,
    description,
    submitLabel,
    cancelLabel,
    loading,
    form,
    onSubmit,
    children,
    footer,
    dismissible,
    errorMessage,
  } = props;

  const isWide = useMediaQuery(BREAKPOINT_QUERY[breakpoint]);

  if (isWide) {
    return (
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        loading={loading}
        size={dialogSize}
        form={form as UseFormReturn<Record<string, unknown>> | undefined}
        onSubmit={onSubmit}
        footer={footer}
        dismissible={dismissible}
        errorMessage={errorMessage}
      >
        {children}
      </FormDialog>
    );
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      loading={loading}
      size={sheetSize}
      side={side}
      form={form as UseFormReturn<Record<string, unknown>> | undefined}
      onSubmit={onSubmit}
      footer={footer}
      dismissible={dismissible}
      errorMessage={errorMessage}
    >
      {children}
    </FormSheet>
  );
}

export { FormDialog, FormSheet };
export type { FormLayerSharedProps };
