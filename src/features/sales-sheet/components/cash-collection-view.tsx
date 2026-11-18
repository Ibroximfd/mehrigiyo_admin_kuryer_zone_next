"use client";

import { Info, Lock, ServerCog, Table } from "lucide-react";

import { EmptyView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { cashStrip } from "../cash-view";
import type { StripItem } from "../cash-view";
import { isSingleDay } from "../period";
import type { SheetRange } from "../period";
import type { SalesSheet } from "../types";
import { useSalesSheet } from "../use-sales-sheet";
import { useSheetPeriod } from "../use-sheet-period";
import { CashCollectionGrid } from "./cash-collection-grid";
import { SheetPeriodBar } from "./sheet-period-bar";
import { SheetQueryState } from "./sheet-query-state";

/**
 * «Pul olish» tabi (hujjat 85 §2): kun yakunida kuryer qancha sotdi, qanchasi
 * onlayn tushdi, skidka, sovg'a va kuryer xizmati — qolganini kuryerdan
 * olasiz. Ma'lumot «Sotuv jadvali» bilan bitta so'rovda (`cash` bloki) — davr
 * ham, kesh ham umumiy.
 */
export function CashCollectionView({ canAccept }: { canAccept: boolean }) {
  const controls = useSheetPeriod();
  const sheet = useSalesSheet(controls.range);

  return (
    <div className="flex flex-col gap-4">
      <SheetPeriodBar controls={controls} />
      <SheetQueryState
        query={sheet}
        deniedTitle="Pul olish sizga ochilmagan"
        missingTitle="Pul olish — server hali chiqarmagan"
        skeleton={<CashSkeleton />}
      >
        {(data) =>
          data.couriers.length === 0 ? (
            <EmptyView
              Icon={Table}
              title="Bu davrda sotuv yo'q"
              description="Kuryerlarga mol berilmagan va yetkazilgan zakaz yo'q. Boshqa kunni yoki kengroq oraliqni tanlang."
              action={
                controls.period === "day" ? (
                  <Button variant="outline" onClick={() => controls.shiftDay(-1)}>
                    Oldingi kunni ko&apos;rish
                  </Button>
                ) : undefined
              }
              className="border-line bg-surface rounded-2xl border"
            />
          ) : (
            <CashCollectionBody sheet={data} range={controls.range} canAccept={canAccept} />
          )
        }
      </SheetQueryState>
    </div>
  );
}

/**
 * Tayyor holat: tenglama, izohlar, jadval. `cash` bloki kelmagan bo'lsa
 * (backend 85 §2 ni hali chiqarmagan) — neytral izoh; sotuv jadvali bu bilan
 * buzilmaydi.
 */
export function CashCollectionBody({ sheet, range, canAccept }: { sheet: SalesSheet; range: SheetRange; canAccept: boolean }) {
  const totals = sheet.totals.cash;
  if (!totals) {
    return (
      <EmptyView
        Icon={ServerCog}
        title="Pul olish — server hali chiqarmagan"
        description="Sotuv jadvali ishlayapti. Kuryerdan pul olish raqamlari backend yangilanishi chiqishi bilan shu yerda ko'rinadi."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  const single = isSingleDay(range);
  return (
    <>
      <CashStrip items={cashStrip(totals, single)} />
      {single ? null : (
        <Note Icon={Info}>Oraliqda — faqat yig&apos;indi. Skidka yozish va «Oldim» — bitta kun tanlanganda.</Note>
      )}
      {single && !canAccept ? (
        <Note Icon={Lock}>Pul qabul qilish dopuski yo&apos;q — faqat ko&apos;rasiz. Dopuskni bosh logist beradi.</Note>
      ) : null}
      <CashCollectionGrid sheet={sheet} totals={totals} range={range} canAccept={canAccept} />
      <CashLegend />
    </>
  );
}

/** Tenglama: Umumiy sotuv − Onlayn − Skidka − Sovg'a − Kuryer xizmati + O'tgan qarz = Olinishi kerak − Olindi. */
function CashStrip({ items }: { items: readonly StripItem[] }) {
  return (
    <section aria-label="Tenglama" className="border-line bg-surface rounded-2xl border p-3">
      <ol className="flex flex-wrap items-stretch gap-2">
        {items.map((item) => (
          <li key={item.label} className="flex min-w-0 flex-1 basis-36 items-center gap-1.5">
            {item.op ? (
              <span aria-hidden className="text-ink-faint w-3 shrink-0 text-center text-lg2 font-semibold">
                {item.op}
              </span>
            ) : null}
            <div className={cn("min-w-0 flex-1 rounded-xl border px-3 py-2", item.result ? "border-brand bg-brand-soft" : "border-line")}>
              <div className="text-ink-muted truncate text-meta font-medium">{item.label}</div>
              <div className={cn("tabular mt-0.5 text-body font-semibold whitespace-nowrap", item.result ? "text-brand" : "text-ink")}>
                {item.value}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Note({ Icon, children }: { Icon: typeof Info; children: React.ReactNode }) {
  return (
    <p role="status" className="bg-subtle text-ink-muted flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta">
      <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Ustunlar ma'nosi — rang yagona signal bo'lmasin. */
function CashLegend() {
  return (
    <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
      <li>
        <strong className="text-ink font-semibold">Umumiy sotuv</strong>
        <span> — sovg&apos;a ham katalog narxida, shuning uchun sovg&apos;a ayiriladi</span>
      </li>
      <li>
        <strong className="text-brand font-semibold">Olinishi kerak</strong>
        <span> = umumiy sotuv − onlayn − skidka − sovg&apos;a − kuryer xizmati + o&apos;tgan qarz</span>
      </li>
      <li>
        <strong className="text-danger font-semibold">Qarz</strong>
        <span> = olinishi kerak − olindi; ertangi kunning «O&apos;tgan qarz»iga o&apos;zi qo&apos;shiladi</span>
      </li>
    </ul>
  );
}

function CashSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Yuklanmoqda">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
