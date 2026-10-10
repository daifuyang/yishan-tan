import { Checkbox } from "@/components/ui/checkbox";
import { useId } from "react";
import { PERMISSION_CATALOG, type PermissionCode } from "~/lib/permission-catalog";

export function PermissionFields({
  value,
  onChange,
  description = "菜单决定页面入口；操作权限单独授予。编辑用户不自动授予分配角色权限。",
}: { value: PermissionCode[]; onChange: (value: PermissionCode[]) => void; description?: string }) {
  const id = useId();
  return (
    <fieldset className="space-y-2 rounded-md border border-line p-3">
      <legend className="px-1 text-body text-text-strong">用户管理操作权限</legend>
      <p className="text-caption text-text-mute">{description}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PERMISSION_CATALOG.map((permission) => (
          <label
            key={permission.code}
            htmlFor={`${id}-${permission.code}`}
            className="flex items-center gap-2 text-body text-text-strong"
          >
            <Checkbox
              id={`${id}-${permission.code}`}
              checked={value.includes(permission.code)}
              onCheckedChange={(checked) =>
                onChange(
                  checked === true
                    ? [...value, permission.code]
                    : value.filter((code) => code !== permission.code),
                )
              }
            />
            {permission.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
