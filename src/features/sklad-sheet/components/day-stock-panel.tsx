"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Info, ServerCog } from "lucide-react";

import { KeyFigures, Section } from "@/components/kit/key-figures";
import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { groupThousands } from "@/lib/format";

import type { SkladStockFallback } from "../current-stock";
import { buildDayStock, dayStockOf } from "../day-state";
import { fullDate } from "../period";
import type { SkladSheet } from "../types";
import { CurrentStockPanel, CurrentStockSection, currentStockOf, StockFigures, StockTableOrEmpty } from "./current-stock-panel";

const STATE_HINT =
  "Kuryerlar sotuv qilmasdan oldingi holat — sotuv va sovg'a bu yerda ayrilmaydi, ular ayrilgan qoldiq ertangi kun boshiga o'tadi. Sariq — minimaldan kam · qizil — tugagan yoki minus";

/**
 * Sahifa tepasi: so'rov tayyor bo'lsa — kunning saqlangan holati, aks holda
 * skelet. Vaqtinchalik (`placeholderData`) javob — boshqa kunniki: holat sanaga
 * bog'liq, shuning uchun u chizilmaydi. So'rov yiqilgan yoki oflayn: bugun —
 * sahifa yuklagan sklad qoldig'i («Hozirgi qoldiq»), o'tgan kun — hech narsa
 * (sababi pastdagi jadval o'rnida aytiladi).
 */
export function DayStockSlot({
  query,
  day,
  isToday,
  fallback,
}: {
  query: UseQueryResult<SkladSheet>;
  day: string;
  isToday: boolean;
  fallback: readonly SkladStockFallback[];
}) {
  if (query.data !== undefined && !query.isPlaceholderData) {
    return <DayStockPanel sheet={query.data} day={day} isToday={isToday} fallback={fallback} />;
  }
  if (query.isError || query.fetchStatus === "paused") {
    return isToday ? <CurrentStockPanel model={currentStockOf(undefined, fallback)} /> : null;
  }
  return (
    <>
      <Skeleton className="h-20 rounded-2xl" aria-label="Yuklanmoqda" />
      <Skeleton className="h-44 rounded-2xl" />
    </>
  );
}

/**
 * Kunning saqlangan holati (egasi, 2026-11-23): Jami · kuryerlarga berilgan ·
 * omborda qolgan — kuryerlar sotuv qilmasdan oldingi holat, kun davomida
 * sotuvdan o'zgarmaydi; o'tgan kunda — o'sha kunning holati (`day-state`).
 *
 * Server bo'linishni (`day_state`, hujjat 117) hali bermasa: jadvalda faqat
 * «Jami», bugun esa bo'linish yo'qolmasligi uchun avvalgi «Hozirgi qoldiq»
 * ham qoladi — server chiqargach u o'zi yo'qoladi.
 */
export function DayStockPanel({
  sheet,
  day,
  isToday,
  fallback,
}: {
  sheet: SkladSheet;
  day: string;
  isToday: boolean;
  fallback: readonly SkladStockFallback[];
}) {
  const stock = dayStockOf(sheet);
  const model = stock ? buildDayStock(sheet.products, stock, sheet.current?.min) : null;
  const live = isToday && model?.kind !== "split" ? currentStockOf(sheet, fallback) : null;

  return (
    <>
      {model?.kind === "split" ? (
        <StockFigures model={model.table} />
      ) : live ? (
        <StockFigures model={live} />
      ) : model ? (
        <KeyFigures
          items={[
            { label: "Jami", value: groupThousands(model.total) },
            { label: "Mahsulot turi", value: groupThousands(model.table.columns.length) },
          ]}
        />
      ) : null}
      <Section title={`${fullDate(day)} — kun holati`} description={STATE_HINT}>
        {model ? (
          <StockTableOrEmpty model={model.table} label="Kun holati" />
        ) : (
          <EmptyView
            Icon={ServerCog}
            title="Kun holati — server hali chiqarmagan"
            description="Backend yangilanishi chiqishi bilan raqamlar shu yerda ko'rinadi. Qolgan bo'limlar odatdagidek ishlaydi."
            className="border-line bg-surface rounded-2xl border"
          />
        )}
        {model?.kind === "total" && model.table.columns.length > 0 ? (
          <p role="status" className="bg-info-soft text-info flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>Kuryerlarga berilgani va omborda qolgani bu kun uchun serverda hali yo&apos;q — backend yangilanishi chiqqach shu yerda ko&apos;rinadi.</span>
          </p>
        ) : null}
      </Section>
      {live ? <CurrentStockSection model={live} /> : null}
    </>
  );
}
