"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { usePermissionCatalog } from "../hooks";
import { isRoleDefault } from "../types";

/**
 * Dopusk belgilari: rol sukutidagilar belgilangan va qulf, qo'shimchalar
 * tanlanadi (masalan logistga «Moliya»).
 */
export function LogistPermissionPicker({
  role,
  value,
  onChange,
  disabled = false,
}: {
  role: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const { catalog, isPending } = usePermissionCatalog();
  if (isPending) {
    return (
      <div className="space-y-2" aria-label="Yuklanmoqda">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-7 rounded-md" />
        ))}
      </div>
    );
  }
  const selected = new Set(value);
  return (
    <ul className="grid gap-x-3 gap-y-0.5 sm:grid-cols-2">
      {catalog.map((item) => {
        const locked = isRoleDefault(role, item.key);
        return (
          <li key={item.key}>
            <label
              title={item.key}
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1 text-dense",
                locked || disabled ? "cursor-default" : "hover:bg-subtle cursor-pointer",
              )}
            >
              <Checkbox
                checked={locked || selected.has(item.key)}
                disabled={locked || disabled}
                onCheckedChange={(next) => {
                  const out = new Set(selected);
                  if (next === true) out.add(item.key);
                  else out.delete(item.key);
                  onChange([...out]);
                }}
              />
              <span className={cn("min-w-0 flex-1 truncate", locked ? "text-ink-muted" : "text-ink")}>{item.label}</span>
              {locked ? <span className="text-ink-faint text-fine">sukut</span> : null}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
