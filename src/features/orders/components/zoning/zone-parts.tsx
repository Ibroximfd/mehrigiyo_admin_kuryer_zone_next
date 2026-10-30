"use client";

import {
  Bot,
  CirclePause,
  LoaderCircle,
  MapPinned,
  Sparkles,
  TriangleAlert,
  UserPlus,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tierLabel } from "@/features/couriers/candidates";
import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import type { LogistOrder } from "@/features/orders/types";
import {
  useAssignCourier,
  useSetOrderDistrict,
} from "@/features/orders/use-order-zoning-actions";
import {
  actionableSuggestion,
  districtGuessText,
  suggestionMissingText,
  suggestionTitle,
  zoneState,
  zoningLine,
} from "@/features/orders/zoning";
import { AUTO_ASSIGN_MODE_LABELS, districtName } from "@/features/zones/types";
import { useRegionSettings, useRegionsDictionary } from "@/features/zones/use-zones";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Hudud va taqsimlash belgilari (2026-10-15) — doska kartasi, ro'yxat va
 * detal bir xil bo'laklardan foydalanadi.
 */

/** Karta tugmasi bosilganda karta o'zi ochilib ketmasin. */
function stop(event: React.SyntheticEvent) {
  event.stopPropagation();
}

/**
 * Hudud qatori va holat belgilari: tuman · zona, "Zona mos emas",
 * "Avto", "Avto to'xtatilgan", "Zonasiz tuman".
 */
export function ZoneBadges({
  order,
  className,
}: {
  order: LogistOrder;
  className?: string;
}) {
  const zoning = order.zoning;
  const line = zoningLine(zoning);
  const state = zoneState(zoning);
  const mismatch = order.courier !== null && zoning.zoneMatch === false;
  const auto = order.courier !== null && zoning.autoAssigned === true;
  const held = order.courier === null && zoning.suggestion?.autoHold === true;
  const withoutZone = state === "district_without_zone";

  if (!line && !mismatch && !auto && !held) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {line ? (
        <span
          className={cn(CARD_TAG, "bg-subtle text-ink-muted max-w-full")}
          title={withoutZone ? "Zonasiz tuman — admin zonaga qo'shsin" : undefined}
        >
          <MapPinned className="size-3 shrink-0" aria-hidden />
          <span className="truncate" data-no-translit>
            {line}
          </span>
        </span>
      ) : null}
      {withoutZone ? (
        <span className={cn(CARD_TAG, "bg-warn-soft text-warn")}>Zonasiz tuman</span>
      ) : null}
      {mismatch ? (
        <span className={cn(CARD_TAG, "bg-danger-soft text-danger")}>
          <TriangleAlert className="size-3" aria-hidden />
          Zona mos emas
        </span>
      ) : null}
      {auto ? (
        <span className={cn(CARD_TAG, "bg-info-soft text-info")} title="Avto taqsimlash biriktirgan">
          <Bot className="size-3" aria-hidden />
          Avto
        </span>
      ) : null}
      {held ? (
        <span className={cn(CARD_TAG, "bg-amber-soft text-amber-ink")}>
          <CirclePause className="size-3" aria-hidden />
          Avto to&apos;xtatilgan
        </span>
      ) : null}
    </div>
  );
}

/**
 * Taklif chipi: "Taklif: Aziz (asosiy zona)" + bir bosishda "Biriktirish".
 * Faqat tasdiqlangan, kuryersiz buyurtmada. Taklif bo'lmasa — sababi.
 */
export function SuggestionChip({ order }: { order: LogistOrder }) {
  const assign = useAssignCourier();
  const suggestion = actionableSuggestion(order);
  const missing = suggestionMissingText(order);

  if (!suggestion) {
    return missing ? (
      <p className="text-ink-faint flex items-center gap-1 text-fine">
        <Sparkles className="size-3 shrink-0" aria-hidden />
        {missing}
      </p>
    ) : null;
  }

  return (
    <div className="bg-brand-soft flex items-center gap-1.5 rounded-lg py-1 pr-1 pl-2">
      <Sparkles className="text-brand size-3.5 shrink-0" aria-hidden />
      {/* Bo'laklab: ism tarjima qilinmaydi, "Taklif" va zona darajasi — qilinadi. */}
      <span
        className="text-brand min-w-0 flex-1 truncate text-meta font-semibold"
        title={suggestionTitle(suggestion)}
      >
        <span>Taklif:</span>{" "}
        <span data-no-translit>{suggestion.courierName || `#${suggestion.courierId}`}</span>
        {suggestion.tier ? (
          <span className="font-normal"> ({tierLabel(suggestion.tier)})</span>
        ) : null}
        {suggestion.autoHold ? (
          <span className="text-amber-ink font-normal"> · avto to&apos;xtatilgan</span>
        ) : null}
      </span>
      <button
        type="button"
        disabled={assign.isPending}
        onPointerDown={stop}
        onClick={(event) => {
          stop(event);
          if (suggestion.courierId !== null) {
            assign.mutate({ orderId: order.id, courierId: suggestion.courierId });
          }
        }}
        className="bg-brand text-brand-ink hover:bg-brand-hover inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-fine font-semibold transition-colors duration-(--dur-micro) disabled:opacity-60"
      >
        {assign.isPending ? (
          <LoaderCircle className="size-3 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="size-3" aria-hidden />
        )}
        Biriktirish
      </button>
    </div>
  );
}

/**
 * Hududi noma'lum buyurtma: GPS/manzil taxmini bo'lsa — "Taklif: Qo'qon
 * shahri (70%)" + "Tasdiqlash" (`PATCH {district}`).
 */
export function DistrictGuessChip({ order }: { order: LogistOrder }) {
  const save = useSetOrderDistrict();
  const guess = order.zoning.districtGuess;
  if (!guess || zoneState(order.zoning) !== "unknown") return null;

  return (
    <div className="bg-warn-soft flex items-center gap-1.5 rounded-lg py-1 pr-1 pl-2">
      <MapPinned className="text-warn size-3.5 shrink-0" aria-hidden />
      <span className="text-warn min-w-0 flex-1 truncate text-meta font-semibold">
        Taklif: <span data-no-translit>{districtGuessText(guess)}</span>
      </span>
      <button
        type="button"
        disabled={save.isPending}
        onPointerDown={stop}
        onClick={(event) => {
          stop(event);
          save.mutate({ orderId: order.id, district: guess.district });
        }}
        className="border-warn/40 text-warn hover:bg-surface inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-fine font-semibold transition-colors duration-(--dur-micro) disabled:opacity-60"
      >
        {save.isPending ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : null}
        Tasdiqlash
      </button>
    </div>
  );
}

const NO_DISTRICT = "__none__";

/**
 * Tumanni qo'lda tanlash — viloyat ma'lum bo'lsa faqat uning tumanlari.
 * Saqlangach zona serverda qayta hisoblanadi.
 */
export function DistrictPicker({
  order,
  disabled,
}: {
  order: LogistOrder;
  disabled: boolean;
}) {
  const dictionary = useRegionsDictionary();
  const save = useSetOrderDistrict();
  const locale = useLocaleStore((state) => state.locale);
  const region = order.deliveryInfo?.region ?? null;
  const regions = (dictionary.data ?? []).filter(
    (item) => !region || item.region === region,
  );
  const current = order.zoning.district;

  return (
    <Select
      value={current ?? NO_DISTRICT}
      onValueChange={(value) =>
        save.mutate({ orderId: order.id, district: value === NO_DISTRICT ? null : value })
      }
      disabled={disabled || dictionary.isPending || dictionary.isError || save.isPending}
    >
      <SelectTrigger className="h-9 w-full" aria-label="Tuman">
        <SelectValue
          placeholder={dictionary.isError ? "Tumanlar yuklanmadi" : "Tuman tanlang…"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_DISTRICT}>Aniqlanmagan</SelectItem>
        {current && !regions.some((item) => item.districts.some((d) => d.code === current)) ? (
          <SelectItem value={current}>
            <span data-no-translit>{order.zoning.districtDisplay ?? current}</span>
          </SelectItem>
        ) : null}
        {regions.map((item) => (
          <SelectGroup key={item.region}>
            {regions.length > 1 ? (
              <SelectLabel>
                <span data-no-translit>{item.name}</span>
              </SelectLabel>
            ) : null}
            {item.districts
              .filter((district) => district.isActive || district.code === current)
              .map((district) => (
                <SelectItem key={district.code} value={district.code}>
                  <span data-no-translit>{districtName(district, locale)}</span>
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Viloyatning avto-taqsimlash rejimi — faqat ma'lumot (admin sozlaydi). */
export function RegionAutoAssignNote({ region }: { region: string | null }) {
  const settings = useRegionSettings(region);
  if (!settings.data) return null;
  return (
    <span className="text-ink-faint flex items-center gap-1 text-fine">
      <Bot className="size-3 shrink-0" aria-hidden />
      {AUTO_ASSIGN_MODE_LABELS[settings.data.autoAssign]}
    </span>
  );
}
