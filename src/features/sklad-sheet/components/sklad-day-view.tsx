"use client";

import { OctagonAlert, TriangleAlert, Warehouse } from "lucide-react";

import { DayStepper } from "@/components/kit/day-stepper";
import { Section } from "@/components/kit/key-figures";
import { QueryStateView } from "@/components/kit/query-state";
import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";

import type { SkladStockFallback } from "../current-stock";
import { buildDaySheet, stockDrift } from "../day-sheet";
import type { StockDrift } from "../day-sheet";
import { fullDate } from "../period";
import type { SkladSheet } from "../types";
import { useSkladSheet, useSkladSheetPeriod } from "../use-sklad-sheet";
import { groupThousands } from "@/lib/format";
import { qtyCount } from "@/lib/qty-cell";
import { CurrentStockPanel, selectCurrentStock } from "./current-stock-panel";
import { DaySheetTable } from "./day-sheet-table";
import { SkladSheetExcelButton } from "./sklad-sheet-excel-button";

/**
 * Sklad sahifasi (hujjat 85 §1, egasi maketi SkladKun): kun tanlash, hozirgi
 * qoldiq va kunlik harakat jadvali — bitta so'rov (`date_from = date_to`).
 * Sukut — bugun; bugun ochiq bo'lsa jadval o'zi yangilanib turadi.
 */
export function SkladDayView({ fallback }: { fallback: readonly SkladStockFallback[] }) {
  const period = useSkladSheetPeriod();
  const query = { dateFrom: period.day, dateTo: period.day, region: null };
  const isToday = period.day === period.today;
  const sheet = useSkladSheet(query, isToday);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DayStepper day={period.day} today={period.today} onChange={period.setDay} />
        <div className="ml-auto">
          <SkladSheetExcelButton query={query} />
        </div>
      </div>
      <CurrentStockPanel model={selectCurrentStock(sheet, fallback)} />
      <Section title={`${fullDate(period.day)} — kunlik harakat`} description="Kun boshi + korxonadan − sotuv − sovg'a − korxonaga − chiqim ± tuzatish = kun oxiri">
        <QueryStateView
          query={sheet}
          deniedTitle="Sklad jadvali sizga ochilmagan"
          missingTitle="Sklad jadvali — server hali chiqarmagan"
          skeleton={<Skeleton className="h-96 rounded-2xl" aria-label="Yuklanmoqda" />}
        >
          {(data) => <DaySheetBody sheet={data} day={period.day} isToday={isToday} />}
        </QueryStateView>
      </Section>
    </div>
  );
}

/** Tayyor holat: farq va tuzatish ogohlantirishi, jadval va qatorlar izohi. */
export function DaySheetBody({ sheet, day, isToday = false }: { sheet: SkladSheet; day: string; isToday?: boolean }) {
  if (sheet.products.length === 0) {
    return (
      <EmptyView
        Icon={Warehouse}
        title="Bu kunda skladda mol bo'lmagan"
        description="Kun boshida ham, kun davomida ham harakat yo'q. Boshqa kunni tanlang."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  const model = buildDaySheet(sheet, day, isToday);
  const drift = isToday ? stockDrift(sheet, (cell, product) => (cell ? qtyCount(cell, product) : 0)) : [];
  return (
    <>
      <DriftNote drift={drift} />
      {model.hasAdjustment ? (
        <p role="status" className="bg-warn-soft text-warn flex items-start gap-2 rounded-2xl px-4 py-3 text-dense">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-semibold">Bu kunda tuzatish bor</span>
            <span className="block">Kun oxiri shu harakat bilan yopiladi — jadvaldagi «Tuzatish» qatoriga qarang.</span>
          </span>
        </p>
      ) : null}
      <DaySheetTable model={model} products={sheet.products} />
      <DaySheetLegend />
    </>
  );
}

/** Bugungi «kun oxiri» hozirgi Jamidan farq qiladi — server ma'lumotida xato; yashirilmaydi. */
function DriftNote({ drift }: { drift: readonly StockDrift[] }) {
  if (drift.length === 0) return null;
  return (
    <div role="alert" className="border-danger bg-danger-soft text-danger flex items-start gap-2 rounded-2xl border px-4 py-3 text-dense">
      <OctagonAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">Kun oxiri hozirgi qoldiqdan farq qiladi — bosh logistga ayting</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {drift.map((row) => (
            <li key={row.product.id}>
              <span className="font-semibold" data-no-translit>
                {row.product.name}
              </span>
              {`: kun oxiri ${groupThousands(row.closing)}, hozir ${groupThousands(row.now)}`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Qatorlar ma'nosi — rang yagona signal bo'lmasin. */
function DaySheetLegend() {
  return (
    <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
      <li>
        <strong className="text-ink font-semibold">Kun boshiga / kun oxiriga qoldiq</strong>
        <span> — ombor + kuryerlar qo&apos;lida, hammasi bir son</span>
      </li>
      <li>
        <strong className="text-ok font-semibold">Sotuv</strong>
        <span> / </span>
        <strong className="text-gold font-semibold">Sovg&apos;a</strong>
        <span> — kuryer ilovada «yetkazdim» qilganda o&apos;zi yoziladi</span>
      </li>
      <li>
        <strong className="text-ink font-semibold">Korxonadan keldi / korxonaga qaytdi</strong>
        <span> — sklad kirim va qaytarishlaridan</span>
      </li>
      <li>
        <strong className="text-info font-semibold">Logist tasdiqlamagan</strong>
        <span> — kuryer «yetkazdim» bosgan, logist hali tasdiqlamagan (faqat bo&apos;lsa); hozirgi qoldiqdan allaqachon ayirilgan</span>
      </li>
      <li>
        <strong className="text-danger font-semibold">Chiqim</strong>
        <span> — yaroqsiz yoki yo&apos;qolgan mol hisobdan chiqarilgani (faqat bo&apos;lsa)</span>
      </li>
      <li>Donalab sotiladigan mahsulot — faqat donada</li>
    </ul>
  );
}
