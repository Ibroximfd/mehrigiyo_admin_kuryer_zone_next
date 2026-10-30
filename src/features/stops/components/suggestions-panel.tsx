"use client";

import { Combine, LoaderCircle, MapPin, Phone, Sparkles, TriangleAlert, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { suggestionBlocker, suggestionKey } from "@/features/stops/types";
import type { StopSuggestion } from "@/features/stops/types";
import { cn } from "@/lib/utils";

/**
 * Birlashtirish takliflari (2026-10-29). Asosiy qoida — **manzil ham,
 * mijoz telefoni ham bir xil**: bunday guruhlar ogohlantirish bilan
 * tepada turadi, logist ko'rib birlashtiradi. Zakazlar har xil kuryerda
 * bo'lsa tugma qulf — avval bitta kuryer biriktiriladi.
 * Taklif yo'q bo'lsa panel chiqmaydi.
 */
export function SuggestionsPanel({
  suggestions,
  pendingKey,
  autoPending,
  onMerge,
  onMergeAll,
}: {
  suggestions: StopSuggestion[];
  pendingKey: string | null;
  autoPending: boolean;
  onMerge: (suggestion: StopSuggestion) => void;
  onMergeAll: () => void;
}) {
  if (suggestions.length === 0) return null;
  const busy = autoPending || pendingKey !== null;
  const samePhone = suggestions.filter((suggestion) => suggestion.match === "phone_address").length;

  return (
    <section
      className={cn(
        "flex flex-col gap-2.5 rounded-xl border px-4 py-3.5",
        samePhone > 0 ? "border-warn/40 bg-warn-soft/60" : "border-info/40 bg-info-soft/50",
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        {samePhone > 0 ? (
          <TriangleAlert className="text-warn size-4" aria-hidden />
        ) : (
          <Sparkles className="text-info size-4" aria-hidden />
        )}
        <h2 className="text-ink text-dense font-semibold">
          Birlashtirish mumkin · {suggestions.length}
        </h2>
        <Button
          type="button"
          size="sm"
          className="ml-auto"
          disabled={busy}
          onClick={onMergeAll}
        >
          {autoPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Combine className="size-3.5" />}
          Hammasini birlashtirish
        </Button>
      </header>
      {samePhone > 0 ? (
        <p role="status" className="text-warn text-meta font-medium">
          {`${samePhone} ta guruhda manzil va mijoz telefoni bir xil — tekshirib, bitta manzilga birlashtiring.`}
        </p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => {
          const key = suggestionKey(suggestion);
          const blocker = suggestionBlocker(suggestion);
          return (
            <li
              key={key}
              className="bg-surface border-line flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-meta"
            >
              <span data-no-translit className="text-ink tabular font-semibold">
                {suggestion.orderNumbers.join(" + ") || `${suggestion.orderIds.length} ta buyurtma`}
              </span>
              {suggestion.match === "phone_address" ? (
                <span className="bg-warn-soft text-warn rounded-md px-1.5 py-0.5 text-fine font-semibold">
                  Telefon bir xil
                </span>
              ) : null}
              {suggestion.clientPhone ? (
                <span className="text-ink-muted inline-flex items-center gap-1">
                  <Phone className="size-3" aria-hidden />
                  <span data-no-translit className="tabular">{suggestion.clientPhone}</span>
                  {suggestion.clientName ? <span data-no-translit>· {suggestion.clientName}</span> : null}
                </span>
              ) : null}
              <span className="text-ink-muted inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span data-no-translit className="truncate">{suggestion.addressText || "—"}</span>
              </span>
              {suggestion.courier?.fullName ? (
                <span data-no-translit className="text-ink-muted inline-flex items-center gap-1">
                  <Truck className="size-3" aria-hidden />
                  {suggestion.courier.fullName}
                </span>
              ) : null}
              {blocker ? <span className="text-warn text-meta">{blocker}</span> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                disabled={busy || blocker !== null}
                title={blocker ?? undefined}
                onClick={() => onMerge(suggestion)}
              >
                {pendingKey === key ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                Birlashtirish
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
