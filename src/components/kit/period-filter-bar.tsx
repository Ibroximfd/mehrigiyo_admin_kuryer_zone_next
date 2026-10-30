"use client";

import { useQuery } from "@tanstack/react-query";

import { DateRangeField } from "@/components/kit/date-range";
import { fetchSkladFilials } from "@/features/sklad/api";
import type { PeriodFilterControls } from "@/hooks/use-period-filter";
import { PERIOD_PRESETS } from "@/lib/period-filter";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Filial + sana — Moliya, Analitika va AI uchun bitta filtr qatori
 * (dizayn 4/7, «1»): «Filial» yorlig'i + chiplar (Barcha filiallar, har
 * filial), «Sana» yorlig'i + presetlar + aniq oraliq. O'ngda `children`
 * — bo'lim tablari va h.k.
 */
export function PeriodFilterBar({
  controls,
  children,
  className,
}: {
  controls: PeriodFilterControls;
  children?: React.ReactNode;
  className?: string;
}) {
  const filials = useQuery({
    queryKey: queryKeys.skladFilials,
    queryFn: ({ signal }) => fetchSkladFilials(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const filialId = controls.filter.filialId;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2", className)}>
      <FilterLabel>Filial</FilterLabel>
      <div role="group" aria-label="Filial" className="flex flex-wrap items-center gap-1.5">
        <FilterChip active={filialId === null} onClick={() => controls.setFilial(null)}>
          Barcha filiallar
        </FilterChip>
        {(filials.data ?? []).map((filial) => (
          <FilterChip key={filial.id} active={filialId === filial.id} onClick={() => controls.setFilial(filial.id)}>
            <span data-no-translit>{filial.name}</span>
          </FilterChip>
        ))}
      </div>

      <FilterLabel className="ml-2">Sana</FilterLabel>
      <div role="group" aria-label="Davr" className="flex flex-wrap items-center gap-1.5">
        {PERIOD_PRESETS.map((preset) => (
          <FilterChip key={preset.value} active={controls.preset === preset.value} onClick={() => controls.setPreset(preset.value)}>
            {preset.label}
          </FilterChip>
        ))}
        <DateRangeField from={controls.filter.from} to={controls.filter.to} onChange={controls.setRange} />
      </div>

      {children ? <div className="ml-auto flex flex-wrap items-center gap-1.5">{children}</div> : null}
    </div>
  );
}

function FilterLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-ink-faint text-micro mr-1 uppercase", className)}>{children}</span>;
}

/** Dizayndagi `.chip`: 8px burchak, tanlangani brend rangida. */
export function FilterChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-dense font-medium whitespace-nowrap transition-colors",
        active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}
