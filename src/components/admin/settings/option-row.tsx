import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDictDataByCode } from "~/features/dicts/dicts.queries";
import type { DictDataDto } from "~/features/dicts/dicts.types";
import type { SystemOptionDef } from "~/features/system-settings/system-settings.groups";

export type OptionRowProps = {
  option: SystemOptionDef;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
  id?: string;
};

const TEXTAREA_CLASS =
  "border-line flex w-full min-w-0 rounded-[4px] border bg-white px-3 py-2 text-[13px] leading-[1.5] text-text-strong transition-colors outline-none focus-visible:border-brand-500 focus-visible:ring-brand-500 focus-visible:ring-[1px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40";

/**
 * 根据 option.type 渲染对应的输入控件：
 *  - text / textarea / number：本地控件
 *  - switch：Checkbox（无独立 Switch 组件时统一使用）
 *  - select：通过 useDictDataByCode 拉字典数据
 */
export function OptionRow({ option, value, onChange, disabled, id }: OptionRowProps) {
  const generatedId = React.useId();
  const inputId = id ?? `option-${option.key}-${generatedId}`;
  const descriptionId = `${inputId}-description`;

  if (option.type === "select") {
    return (
      <SelectOptionRow
        option={option}
        inputId={inputId}
        descriptionId={descriptionId}
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (option.type === "switch") {
    const checked = Boolean(value);
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Checkbox
            id={inputId}
            checked={checked}
            disabled={disabled}
            onCheckedChange={(next) => onChange(next === true)}
            aria-describedby={option.description ? descriptionId : undefined}
          />
          <Label htmlFor={inputId} className="cursor-pointer text-[13px] text-text-strong">
            {option.label}
          </Label>
        </div>
        {option.description ? (
          <p id={descriptionId} className="pl-6 text-[12px] text-text-mute">
            {option.description}
          </p>
        ) : null}
      </div>
    );
  }

  if (option.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-[13px] text-text-strong">
          {option.label}
        </Label>
        <textarea
          id={inputId}
          rows={4}
          disabled={disabled}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={option.placeholder}
          aria-describedby={option.description ? descriptionId : undefined}
          className={cn(TEXTAREA_CLASS, "min-h-[96px] resize-y")}
        />
        {option.description ? (
          <p id={descriptionId} className="text-[12px] text-text-mute">
            {option.description}
          </p>
        ) : null}
      </div>
    );
  }

  if (option.type === "number") {
    const numberValue =
      typeof value === "number" && Number.isFinite(value)
        ? value
        : typeof value === "string" && value !== ""
          ? Number(value)
          : Number.NaN;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-[13px] text-text-strong">
          {option.label}
        </Label>
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          disabled={disabled}
          value={Number.isFinite(numberValue) ? String(numberValue) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(Number.NaN);
              return;
            }
            const parsed = Number(raw);
            onChange(Number.isFinite(parsed) ? parsed : Number.NaN);
          }}
          placeholder={option.placeholder}
          aria-describedby={option.description ? descriptionId : undefined}
        />
        {option.description ? (
          <p id={descriptionId} className="text-[12px] text-text-mute">
            {option.description}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-[13px] text-text-strong">
        {option.label}
      </Label>
      <Input
        id={inputId}
        type="text"
        disabled={disabled}
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={option.placeholder}
        aria-describedby={option.description ? descriptionId : undefined}
      />
      {option.description ? (
        <p id={descriptionId} className="text-[12px] text-text-mute">
          {option.description}
        </p>
      ) : null}
    </div>
  );
}

type SelectOptionRowProps = {
  option: SystemOptionDef;
  inputId: string;
  descriptionId: string;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
};

function SelectOptionRow({
  option,
  inputId,
  descriptionId,
  value,
  onChange,
  disabled,
}: SelectOptionRowProps) {
  const dictQuery = useDictDataByCode(option.dictCode ?? "");
  const items: DictDataDto[] = dictQuery.data?.items ?? [];
  const stringValue = value == null ? "" : String(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="text-[13px] text-text-strong">
        {option.label}
      </Label>
      <Select
        value={stringValue || undefined}
        onValueChange={(next) => onChange(next)}
        disabled={disabled || dictQuery.isLoading}
      >
        <SelectTrigger
          id={inputId}
          aria-describedby={option.description ? descriptionId : undefined}
        >
          <SelectValue placeholder={dictQuery.isLoading ? "加载中…" : "请选择"} />
        </SelectTrigger>
        <SelectContent>
          {items.length === 0 ? (
            <SelectItem value="__empty__" disabled>
              暂无可选项
            </SelectItem>
          ) : (
            items.map((item) => (
              <SelectItem key={item.id} value={item.value}>
                {item.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {option.description ? (
        <p id={descriptionId} className="text-[12px] text-text-mute">
          {option.description}
        </p>
      ) : null}
    </div>
  );
}
