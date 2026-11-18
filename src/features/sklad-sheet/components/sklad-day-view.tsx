"use client";

import { TriangleAlert, Warehouse } from "lucide-react";

import { DayStepper } from "@/components/kit/day-stepper";
import { Section } from "@/components/kit/key-figures";
import { QueryStateView } from "@/components/kit/query-state";
import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";

import type { SkladStockFallback } from "../current-stock";
import { buildDaySheet } from "../day-sheet";
import { fullDate } from "../period";
import type { SkladSheet } from "../types";
import { useSkladSheet, useSkladSheetPeriod } from "../use-sklad-sheet";
import { CurrentStockPanel, selectCurrentStock } from "./current-stock-panel";
import { DaySheetTable } from "./day-sheet-table";
import { SkladSheetExcelButton } from "./sklad-sheet-excel-button";

/**
 * «Kunlik» ko'rinish (hujjat 85 §1, egasi maketi SkladKun): kun tanlash,
 * hozirgi qoldiq va kunlik harakat jadvali — bitta so'rov
 * (`date_from = date_to`). Sukut — bugun.
 */
export function SkladDayView({ fallback }: { fallback: readonly SkladStockFallback[] }) {
  const period = useSkladSheetPeriod();
  const query = { dateFrom: period.day, dateTo: period.day, region: null };
  const sheet = useSkladSheet(query);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <DayStepper day={period.day} today={period.today} onChange={period.setDay} />
        <div className="ml-auto">
          <SkladSheetExcelButton query={query} />
        </div>
      </div>
      <CurrentStockPanel model={selectCurrentStock(sheet, fallback)} />
      <Section title={`${fullDate(period.day)} — kunlik harakat`} description="Kun boshi + korxonadan − sotuv − sovg'a − korxonaga = kun oxiri">
        <QueryStateView
          query={sheet}
          deniedTitle="Sklad jadvali sizga ochilmagan"
          missingTitle="Sklad jadvali — server hali chiqarmagan"
          skeleton={<Skeleton className="h-96 rounded-2xl" aria-label="Yuklanmoqda" />}
        >
          {(data) => <DaySheetBody sheet={data} day={period.day} />}
        </QueryStateView>
      </Section>
    </div>
  );
}

/** Tayyor holat: tuzatish ogohlantirishi, jadval va qatorlar izohi. */
export function DaySheetBody({ sheet, day }: { sheet: SkladSheet; day: string }) {
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
  const model = buildDaySheet(sheet, day);
  return (
    <>
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
      <li>Donalab sotiladigan mahsulot — faqat donada</li>
    </ul>
  );
}
