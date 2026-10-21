"use client";

import { useId, useMemo, useState } from "react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { SearchInput } from "@/shared/ui/search-input";

import {
  filterDistrictGroups,
  groupDistrictOptions,
  type DistrictOption,
  type TakenDistrict,
} from "../model/district-groups";

type DistrictPickerProps = {
  options: readonly DistrictOption[];
  editingZoneId: number | null;
  zoneNames: ReadonlyMap<number, string>;
  value: readonly string[];
  onChange: (codes: string[]) => void;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Tumanlar ko'p tanlovi: zonasizlar birinchi, keyin shu zonadagilar,
 * oxirida boshqa zonadagilar (o'chirilgan holda, qaysi zonada ekani bilan).
 */
export function DistrictPicker({ options, editingZoneId, zoneNames, value, onChange, invalid, describedBy }: DistrictPickerProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const groups = useMemo(
    () => filterDistrictGroups(groupDistrictOptions(options, editingZoneId, zoneNames), query),
    [options, editingZoneId, zoneNames, query],
  );

  const toggle = (code: string, checked: boolean) => {
    onChange(checked ? [...value, code] : value.filter((item) => item !== code));
  };

  const isEmpty = groups.unzoned.length + groups.current.length + groups.taken.length === 0;

  return (
    <div
      className={cn("flex flex-col gap-2 rounded-xl border border-line p-2", invalid && "border-danger")}
      aria-describedby={describedBy}
    >
      <div className="flex items-center gap-2">
        <SearchInput value={query} onValueChange={setQuery} placeholder={t.zones.districtsSearch} className="flex-1" />
        <span className="shrink-0 px-2 text-xs text-ink-muted tabular" aria-live="polite">
          {t.zones.districtsSelected(value.length)}
        </span>
      </div>
      <div className="max-h-(--list-max-h) overflow-y-auto overscroll-contain">
        {isEmpty ? <p className="px-2 py-6 text-center text-sm text-ink-faint">{t.zones.noDistricts}</p> : null}
        <OptionGroup title={t.zones.groupUnzoned} options={groups.unzoned} selected={selected} onToggle={toggle} />
        <OptionGroup title={t.zones.groupCurrent} options={groups.current} selected={selected} onToggle={toggle} />
        <TakenGroup title={t.zones.groupTaken} options={groups.taken} />
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: readonly DistrictOption[];
  selected: ReadonlySet<string>;
  onToggle: (code: string, checked: boolean) => void;
}) {
  const groupId = useId();
  if (options.length === 0) return null;
  return (
    <div role="group" aria-labelledby={groupId} className="py-1">
      <p id={groupId} className="sticky top-0 z-10 bg-surface px-2 py-1.5 text-xs font-medium text-ink-faint">
        {title} · {options.length}
      </p>
      <ul>
        {options.map((option) => (
          <li key={option.code}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface-2 sm:min-h-9">
              <Checkbox checked={selected.has(option.code)} onCheckedChange={(checked) => onToggle(option.code, checked === true)} />
              <span className="flex-1 truncate">{option.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TakenGroup({ title, options }: { title: string; options: readonly TakenDistrict[] }) {
  const t = useT();
  const groupId = useId();
  if (options.length === 0) return null;
  return (
    <div role="group" aria-labelledby={groupId} className="py-1">
      <p id={groupId} className="sticky top-0 z-10 bg-surface px-2 py-1.5 text-xs font-medium text-ink-faint">
        {title} · {options.length}
      </p>
      <ul>
        {options.map((option) => (
          <li key={option.code} className="flex min-h-11 items-center gap-3 px-2 text-sm text-ink-faint sm:min-h-9">
            <Checkbox checked={false} disabled aria-label={`${option.name} — ${t.zones.takenBy(option.zoneName)}`} />
            <span className="flex-1 truncate">{option.name}</span>
            <span className="max-w-40 shrink-0 truncate text-xs">{t.zones.takenBy(option.zoneName)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
