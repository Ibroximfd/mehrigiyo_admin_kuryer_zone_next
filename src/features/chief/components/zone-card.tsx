"use client";

import { Pencil, Trash2, UsersRound } from "lucide-react";

import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { regionLabel } from "@/features/orders/regions";
import type { Zone } from "@/features/zones/types";
import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import { EMPTY_COUNTS, shareOf } from "../zone-stats";
import type { AreaStats, OrderCounts } from "../zone-stats";
import { codesByRegion } from "../zones";

/** Sonlar holati: yuklanmoqda · tayyor · backend hali bermaydi (chizilmaydi). */
export type CountsState = { kind: "loading" } | { kind: "ready"; stats: AreaStats | null } | { kind: "hidden" };

/**
 * Zona kartasi (hujjat 69 §3): katta umumiy son, holat bo'yicha bo'linish va
 * har tuman yonida shu davrdagi zakazlar soni — eng ko'pi tepada.
 *
 * Faqat OCHIQ zakazlar (egasi, 2026-11-23): kuryersiz + kuryerda. Yetkazilgani
 * bu sahifada ko'rsatilmaydi — taqsimlashga xalaqit berardi.
 */
export function ZoneCard({
  zone,
  counts,
  couriers,
  ownRegions,
  districtLabel,
  canManage,
  onEdit,
  onDelete,
}: {
  zone: Zone;
  counts: CountsState;
  couriers: number;
  ownRegions: readonly string[];
  districtLabel: (code: string) => string;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stats = counts.kind === "ready" ? counts.stats : null;
  // Javobda yo'q tuman — zakazi yo'q (0); `open: null` — server bo'linishni bermagan.
  const districtOf = (code: string): OrderCounts => stats?.districts.get(code) ?? EMPTY_COUNTS;
  const openIn = (code: string) => districtOf(code).open ?? 0;
  const groups = codesByRegion(zone.districtCodes, ownRegions).map(
    ([region, codes]) => [region, [...codes].sort((a, b) => openIn(b) - openIn(a))] as const,
  );
  const multiRegion = groups.length > 1;
  const top = Math.max(1, ...zone.districtCodes.map(openIn));

  return (
    <li
      className={cn(
        "border-line bg-surface flex flex-col overflow-hidden rounded-2xl border",
        !zone.isActive && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2 px-4 pt-4">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-ink truncate text-body font-semibold" data-no-translit>
              {zone.name}
            </span>
            {zone.isActive ? null : <StatusPill label="o'chirilgan" color="var(--ink-faint)" size="sm" />}
          </span>
          <span className="text-ink-faint mt-0.5 flex flex-wrap items-center gap-x-2 text-meta">
            <span>{zone.regions.map(regionLabel).join(" · ") || "Viloyatsiz"}</span>
            <span className="inline-flex items-center gap-1">
              <UsersRound aria-hidden className="size-3" />
              {`${couriers} kuryer`}
            </span>
          </span>
        </span>
        {canManage ? (
          <span className="-mt-1 -mr-1 flex shrink-0">
            <Button size="icon-sm" variant="ghost" aria-label={`${zone.name}: tahrirlash`} title="Tahrirlash" onClick={onEdit}>
              <Pencil />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label={`${zone.name}: o'chirish`} title="O'chirish" onClick={onDelete}>
              <Trash2 />
            </Button>
          </span>
        ) : null}
      </div>

      {counts.kind === "hidden" ? null : <ZoneTotals state={counts} />}

      <div className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        {zone.districtCodes.length === 0 ? (
          <span className="text-warn text-meta">Tuman biriktirilmagan</span>
        ) : (
          groups.map(([region, codes]) => (
            <div key={region} className="flex flex-col gap-1">
              {multiRegion ? <p className="text-ink-faint text-micro uppercase">{regionLabel(region)}</p> : null}
              <ul className="flex flex-col">
                {codes.map((code) => (
                  <DistrictRow
                    key={code}
                    name={districtLabel(code)}
                    counts={counts.kind === "ready" ? districtOf(code) : null}
                    loading={counts.kind === "loading"}
                    share={shareOf(openIn(code), top)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </li>
  );
}

/** Katta son (ochiq zakazlar) + bo'linish chizig'i: kuryersiz · kuryerda. */
function ZoneTotals({ state }: { state: Exclude<CountsState, { kind: "hidden" }> }) {
  if (state.kind === "loading") {
    return (
      <div className="px-4 pt-3" aria-busy>
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
      </div>
    );
  }
  const counts: OrderCounts = state.stats ?? EMPTY_COUNTS;
  return (
    <div className="px-4 pt-3">
      <p className="flex items-baseline gap-1.5">
        <span className="text-ink tabular text-display">{counts.open === null ? "—" : groupThousands(counts.open)}</span>
        <span className="text-ink-muted text-dense">zakaz</span>
      </p>
      <StateBar counts={counts} />
      <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-meta">
        <Legend tone="bg-warn" label="kuryersiz" value={counts.incoming} />
        <Legend tone="bg-brand" label="kuryerda" value={counts.withCourier} />
      </dl>
    </div>
  );
}

function StateBar({ counts }: { counts: OrderCounts }) {
  const whole = counts.incoming + counts.withCourier;
  const parts = [
    { key: "incoming", value: counts.incoming, tone: "bg-warn" },
    { key: "courier", value: counts.withCourier, tone: "bg-brand" },
  ].filter((part) => part.value > 0);
  return (
    <div className="bg-subtle mt-2 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
      {parts.map((part) => (
        // Kenglik — hisoblangan ulush, tokenli qiymat emas.
        <span key={part.key} className={part.tone} style={{ width: `${shareOf(part.value, whole) * 100}%` }} />
      ))}
    </div>
  );
}

function Legend({ tone, label, value }: { tone: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 rounded-full", tone)} />
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink tabular font-medium">{groupThousands(value)}</dd>
    </div>
  );
}

/**
 * Tuman satri: nom, kuryersiz zakazlar (bo'lsa — taqsimlash kerak) va katta ochiq son.
 * Son ataylab yirik — bosh kuryer zonani bir qarashda o'qiydi (egasi, 2026-11-23).
 */
function DistrictRow({
  name,
  counts,
  loading,
  share,
}: {
  name: string;
  /** `null` — sonlar ko'rsatilmaydi (yuklanmoqda yoki backend bermaydi). */
  counts: OrderCounts | null;
  loading: boolean;
  share: number;
}) {
  const open = counts?.open ?? null;
  return (
    <li className="relative flex items-center gap-2.5 rounded-md px-2 py-1.5">
      {open !== null && open > 0 ? (
        // Fon chizig'i — zonadagi eng ko'p tumanga nisbatan; kenglik hisoblanadi.
        <span aria-hidden className="bg-brand-soft absolute inset-y-0 left-0 rounded-md" style={{ width: `${share * 100}%` }} />
      ) : null}
      <span className="text-ink relative min-w-0 flex-1 truncate text-body" data-no-translit>
        {name}
      </span>
      {counts !== null && counts.incoming > 0 ? (
        <span className="text-warn tabular relative shrink-0 text-meta font-medium">{`${groupThousands(counts.incoming)} kuryersiz`}</span>
      ) : null}
      {loading ? (
        <Skeleton className="relative h-6 w-8 rounded" />
      ) : counts !== null ? (
        <span
          className={cn(
            "tabular relative min-w-8 shrink-0 text-right text-title",
            open !== null && open > 0 ? "text-ink" : "text-ink-faint font-normal",
          )}
        >
          {open === null ? "—" : groupThousands(open)}
        </span>
      ) : null}
    </li>
  );
}
