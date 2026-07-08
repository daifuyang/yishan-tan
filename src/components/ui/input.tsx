import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  /** Antd-style hover-shown clear icon. Only works for controlled inputs (value + onChange). */
  allowClear?: boolean;
};

function Input({
  className,
  type,
  allowClear,
  value,
  onChange,
  onMouseDown,
  disabled,
  readOnly,
  name,
  ...props
}: InputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const hasValue = value !== undefined && value !== null && String(value) !== "";
  const showClear = Boolean(allowClear) && hasValue && !disabled && !readOnly;

  const handleClear = () => {
    if (!onChange) return;
    const synthetic = {
      target: { value: "", name },
      currentTarget: { value: "", name },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(synthetic);
    inputRef.current?.focus();
  };

  if (!allowClear) {
    return (
      <input
        ref={inputRef}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-text-mute selection:bg-brand-100 selection:text-brand-700 border-line flex h-8 w-full min-w-0 rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px]",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          className,
        )}
        value={value}
        onChange={onChange}
        onMouseDown={onMouseDown}
        disabled={disabled}
        readOnly={readOnly}
        name={name}
        {...props}
      />
    );
  }

  return (
    <div className="group/slot relative" data-slot="input-wrapper">
      <input
        ref={inputRef}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-text-mute selection:bg-brand-100 selection:text-brand-700 border-line flex h-8 w-full min-w-0 rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px]",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
          "pr-7",
          className,
        )}
        value={value}
        onChange={onChange}
        onMouseDown={onMouseDown}
        disabled={disabled}
        readOnly={readOnly}
        name={name}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="清空"
        aria-hidden={!showClear}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClear}
        className={cn(
          "absolute right-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-text-mute transition-colors hover:bg-muted hover:text-text-strong",
          showClear ? "invisible group-hover/slot:visible" : "pointer-events-none invisible",
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export { Input };
