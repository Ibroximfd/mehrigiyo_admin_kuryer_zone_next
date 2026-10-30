"use client";

import { PencilLine, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

import { districtName, districtOptions, findDistrict } from "../types";
import { useRegionsDictionary } from "../use-zones";

export const MANUAL_DISTRICT_LABEL = "Ro'yxatda yo'q — qo'lda yozaman";

export type DistrictChoice = { district: string; manual: boolean };

const NONE = "__none__";
const MANUAL = "__manual__";

/**
 * Tuman / shahar tanlovi — viloyatga bog'liq, faqat faol tumanlar (CRM
 * `features/geo/components/district-select.tsx` bilan bir xil holatlar):
 *
 *   viloyat yo'q → o'chiq; lug'at yuklanmoqda → skeleton; xato / internet
 *   yo'q → izoh + "Qayta urinish" + "Qo'lda yozish" (forma to'xtab
 *   qolmasin); tayyor → ro'yxat, oxirida "qo'lda yozaman".
 *
 * Joriy kod ro'yxatda bo'lmasa (nofaol yoki boshqa viloyat) ham ko'rinadi —
 * `fallbackLabel` (`district_display`) bilan; qayta tanlashni ota so'raydi.
 */
export function DistrictSelect({
  id,
  region,
  value,
  manual,
  onChange,
  fallbackLabel,
  invalid = false,
  describedBy,
  className,
}: {
  id: string;
  region: string;
  value: string;
  manual: boolean;
  onChange: (choice: DistrictChoice) => void;
  /** Lug'atda topilmagan joriy kod uchun nom (`district_display`). */
  fallbackLabel?: string | null;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const dictionary = useRegionsDictionary();
  const online = useOnlineStatus();
  const locale = useLocaleStore((state) => state.locale);

  if (!region) {
    return (
      <Select value={NONE} disabled>
        <SelectTrigger id={id} className={cn("h-9 w-full", className)} aria-describedby={describedBy}>
          <SelectValue placeholder="Avval viloyatni tanlang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Avval viloyatni tanlang</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Tarmoqsiz so'rov TanStack'da "pauza"da turadi — skeleton abadiy qolmasin.
  const unavailable =
    !dictionary.data && (dictionary.isError || dictionary.fetchStatus === "paused" || !online);

  if (dictionary.isPending && !unavailable) {
    return (
      <div aria-busy role="status" className="relative">
        <Skeleton className="h-9 w-full rounded-lg" />
        <span className="sr-only">Tumanlar yuklanmoqda</span>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-meta",
          online ? "border-danger/40 bg-danger-soft text-danger" : "border-line bg-subtle text-ink-muted",
        )}
      >
        {online ? null : <WifiOff className="size-3.5 shrink-0" aria-hidden />}
        <span className="min-w-0 flex-1">
          {online ? "Tumanlar ro'yxati yuklanmadi" : "Internet yo'q — tumanlar ro'yxati yuklanmadi"}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void dictionary.refetch()}
          disabled={dictionary.isFetching}
        >
          <RefreshCw className={cn(dictionary.isFetching && "animate-spin")} aria-hidden />
          Qayta urinish
        </Button>
        {manual ? null : (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ district: "", manual: true })}>
            Qo&apos;lda yozish
          </Button>
        )}
      </div>
    );
  }

  const options = districtOptions(dictionary.data, region);
  const current = findDistrict(dictionary.data, value);
  // Joriy kod shu viloyatning faol ro'yxatida yo'q — alohida qator bilan ko'rinadi.
  const stale = Boolean(value) && !options.some((district) => district.code === value);
  const selected = manual ? MANUAL : value || NONE;

  return (
    <Select
      value={selected}
      onValueChange={(next) => {
        // Radix bo'sh qiymat bilan chaqirsa (forma reset/autofill) — jimgina tozalanmasin.
        if (!next) return;
        if (next === MANUAL) onChange({ district: "", manual: true });
        else onChange({ district: next === NONE ? "" : next, manual: false });
      }}
    >
      <SelectTrigger
        id={id}
        className={cn("h-9 w-full", className)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Tumanni tanlang" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Tanlanmagan</SelectItem>
        {stale ? (
          <SelectItem value={value}>
            <span data-no-translit>{current ? districtName(current, locale) : (fallbackLabel ?? value)}</span>
          </SelectItem>
        ) : null}
        {options.map((district) => (
          <SelectItem key={district.code} value={district.code}>
            <span data-no-translit>{districtName(district, locale)}</span>
          </SelectItem>
        ))}
        {options.length === 0 ? (
          <SelectItem value="__empty__" disabled>
            Bu viloyatda tumanlar yo&apos;q
          </SelectItem>
        ) : null}
        <SelectSeparator />
        <SelectItem value={MANUAL}>
          <PencilLine className="text-brand" aria-hidden />
          {MANUAL_DISTRICT_LABEL}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
