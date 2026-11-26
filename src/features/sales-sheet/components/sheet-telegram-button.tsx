"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { CopyButton } from "@/components/kit/copy-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { translateText } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

import { rangeTitle } from "../period";
import type { SheetRange } from "../period";
import type { RegionGroup } from "../regions";
import { regionTelegram, salesSheetTelegram } from "../telegram";
import type { SalesSheet } from "../types";

/** Viloyat tanlovi kaliti: `null` kod (viloyatsiz) ham alohida. */
const ALL = "all";
const regionKey = (region: RegionGroup) => `region:${region.code ?? ""}`;

/**
 * «Telegram matni» — Excel tugmasi yonida: ochiq davr jadvalidan Telegram guruhiga
 * yoziladigan matn (logist saytidagi «Telegram uchun matn» uslubi). Hammasi yoki
 * bitta viloyat nusxalanadi. Jadval hali yuklanmagan yoki sotuv yo'q — tugma yopiq.
 */
export function SheetTelegramButton({
  sheet,
  regions,
  range,
  title,
  center = null,
}: {
  sheet: SalesSheet | undefined;
  regions: readonly RegionGroup[] | null;
  range: SheetRange;
  title: string;
  /** Markaz filtri nomi (136-javob) — matnda aytiladi. */
  center?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" disabled={!sheet || sheet.couriers.length === 0} onClick={() => setOpen(true)}>
        <Send />
        Telegram matni
      </Button>
      {open && sheet ? (
        <SheetTelegramDialog sheet={sheet} regions={regions} range={range} title={title} center={center} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function SheetTelegramDialog({
  sheet,
  regions,
  range,
  title,
  center,
  onClose,
}: {
  sheet: SalesSheet;
  regions: readonly RegionGroup[] | null;
  range: SheetRange;
  title: string;
  center: string | null;
  onClose: () => void;
}) {
  const locale = useLocaleStore((state) => state.locale);
  const [scope, setScope] = useState(ALL);
  const input = {
    title,
    range,
    products: sheet.products,
    couriers: sheet.couriers,
    totals: sheet.totals,
    courierless: sheet.courierless,
    regions,
    center,
    // Matn DOM'ga tushmaydi (nusxalanadi) — yorliqlar shu yerda tanlangan tilga o'giriladi.
    t: (text: string) => translateText(text, locale),
  };
  const selected = regions?.find((region) => regionKey(region) === scope) ?? null;
  const text = selected ? regionTelegram(input, selected) : salesSheetTelegram(input);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle>Telegram uchun matn</DialogTitle>
        <DialogDescription>
          <span className="tabular">{rangeTitle(range)}</span>
          {" · "}
          Nol qatorlar matnga kirmaydi.
        </DialogDescription>

        {regions && regions.length > 1 ? (
          <div role="group" aria-label="Qaysi qism" className="bg-surface-3 mt-3 inline-flex w-fit flex-wrap gap-0.5 rounded-lg p-0.5">
            {[{ key: ALL, label: "Hammasi" }, ...regions.map((region) => ({ key: regionKey(region), label: region.name }))].map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={scope === option.key}
                onClick={() => setScope(option.key)}
                className={cn(
                  "h-8 rounded-md px-3 text-dense font-semibold transition-colors",
                  scope === option.key ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* Matn allaqachon tanlangan tilda — DOM tarjimoni unga qayta tegmaydi. */}
        <pre
          data-no-translit
          className="border-line bg-subtle text-ink scrollbar-thin mt-3 max-h-96 overflow-y-auto rounded-xl border px-4 py-3 font-mono text-dense leading-relaxed whitespace-pre-wrap"
        >
          {text}
        </pre>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Yopish
          </Button>
          <CopyButton
            value={text}
            label="Telegram matnini nusxalash"
            successMessage="Matn nusxalandi"
            className="bg-brand text-brand-ink hover:bg-brand-hover hover:text-brand-ink h-9 rounded-lg px-3 font-semibold"
          >
            Nusxa olish
          </CopyButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
