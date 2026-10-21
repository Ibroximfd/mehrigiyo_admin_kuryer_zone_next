"use client";

import type { ComponentProps } from "react";

import { useT } from "@/shared/i18n/locale";
import { NativeSelect } from "@/shared/ui/native-select";

import type { Filial, FilialGroups } from "../model/filial";

type FilialSelectProps = Omit<ComponentProps<"select">, "value" | "onChange" | "children"> & {
  groups: FilialGroups;
  isLoading: boolean;
  value: number | null;
  onValueChange: (value: number | null) => void;
};

/**
 * Kassa filiali: zona viloyati filiallari tepada, keyin boshqa viloyatlar,
 * nofaollar oxirida (tanlab bo'lmaydi). Asosiy filial belgilanadi.
 */
export function FilialSelect({ groups, isLoading, value, onValueChange, disabled, ...props }: FilialSelectProps) {
  const t = useT();
  const label = (filial: Filial) => {
    const marks = [filial.isMain ? t.zones.filialMain : null, filial.isActive ? null : t.zones.filialInactive].filter(Boolean);
    return marks.length ? `${filial.name} (${marks.join(", ")})` : filial.name;
  };
  const sections = [
    { key: "regional", title: t.zones.filialGroupRegion, items: groups.regional },
    { key: "other", title: t.zones.filialGroupOther, items: groups.other },
    { key: "inactive", title: t.zones.filialGroupInactive, items: groups.inactive },
  ].filter((section) => section.items.length > 0);
  const isEmpty = sections.length === 0;

  return (
    <NativeSelect
      {...props}
      disabled={disabled || isLoading}
      value={value === null ? "" : String(value)}
      onChange={(event) => onValueChange(event.target.value ? Number(event.target.value) : null)}
    >
      <option value="">{isLoading ? t.common.loading : isEmpty ? t.zones.filialsEmpty : t.zones.filialPlaceholder}</option>
      {sections.map((section) => (
        <optgroup key={section.key} label={section.title}>
          {section.items.map((filial) => (
            <option key={filial.id} value={filial.id} disabled={!filial.isActive && filial.id !== value}>
              {label(filial)}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
