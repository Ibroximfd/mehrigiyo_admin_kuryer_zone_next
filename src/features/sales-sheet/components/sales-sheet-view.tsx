"use client";

import { Table, TriangleAlert } from "lucide-react";

import { KeyFigures } from "@/components/kit/key-figures";
import { EmptyView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { groupThousands } from "@/lib/format";

import { cellText, moneyText, shortDate } from "../display";
import type { SheetRange } from "../period";
import { hasCells } from "../types";
import type { SalesSheet } from "../types";
import { useSalesSheet } from "../use-sales-sheet";
import { useSheetPeriod } from "../use-sheet-period";
import { SalesSheetGrid } from "./sales-sheet-grid";
import { SheetExcelButton } from "./sheet-excel-button";
import { SheetPeriodBar } from "./sheet-period-bar";
import { SheetQueryState } from "./sheet-query-state";

/**
 * «Sotuv jadvali» tabi (hujjat 83 §1–§3, §5): davr URLda, bitta so'rov —
 * `chief/report/sales-sheet/`. Sukut — bugun.
 */
export function SalesSheetView() {
  const controls = useSheetPeriod();
  const sheet = useSalesSheet(controls.range);

  return (
    <div className="flex flex-col gap-4">
      <SheetPeriodBar controls={controls}>
        <SheetExcelButton range={controls.range} />
      </SheetPeriodBar>
      <SheetQueryState
        query={sheet}
        deniedTitle="Sotuv jadvali sizga ochilmagan"
        missingTitle="Sotuv jadvali — server hali chiqarmagan"
        skeleton={<SheetSkeleton />}
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
            <SalesSheetBody sheet={data} range={controls.range} onOpenDay={controls.setDay} />
          )
        }
      </SheetQueryState>
    </div>
  );
}

/** Tayyor holat: asosiy raqamlar (`totals`), ogohlantirishlar, jadval va qatorlar izohi. */
export function SalesSheetBody({ sheet, range, onOpenDay }: { sheet: SalesSheet; range: SheetRange; onOpenDay: (day: string) => void }) {
  const { totals } = sheet;
  return (
    <>
      <KeyFigures
        className="sm:grid-cols-3 xl:grid-cols-6"
        items={[
          { label: "Naqd", value: moneyText(totals.cashAmount), hint: "kuryerlar qo'lda olgan" },
          { label: "Onlayn (ilova)", value: moneyText(totals.onlineAmount), hint: "Click · Payme · oldindan" },
          { label: "Manzil soni", value: groupThousands(totals.addresses), hint: "yetkazilgan manzillar" },
          { label: "Borganda atkaz", value: groupThousands(totals.refusedAddresses), hint: "manzilga borib, rad etilgan" },
          { label: "Kuryer xizmati", value: moneyText(totals.fee?.amount ?? null), hint: "bosh kuryer qo'lda yozgan" },
          { label: "Kassaga topshiriladi", value: moneyText(totals.handoverDue), hint: "naqd − kuryer xizmati" },
        ]}
      />
      <ChecksNote sheet={sheet} />
      <AdjustmentsNote sheet={sheet} />
      <SalesSheetGrid sheet={sheet} range={range} onOpenDay={onOpenDay} />
      <SheetLegend />
    </>
  );
}

/**
 * Daftar ≠ zakazlar (`checks[]`, §2.10). Odatda chiqmaydi: daftar va zakaz
 * sotuvi bitta hodisadan yoziladi. Chiqsa — farq ochiq ko'rsatiladi, jadval
 * raqami o'zgartirilmaydi.
 */
function ChecksNote({ sheet }: { sheet: SalesSheet }) {
  if (sheet.checks.length === 0) return null;
  const courierName = (id: number | null) => sheet.couriers.find((row) => row.courier.id === id)?.courier.fullName ?? "—";
  const productOf = (id: number | null) => sheet.products.find((product) => product.id === id);
  return (
    <section role="status" aria-label="Daftar va zakazlar farqi" className="border-warn bg-warn-soft flex items-start gap-2 rounded-2xl border px-4 py-3">
      <TriangleAlert aria-hidden className="text-warn mt-0.5 size-4 shrink-0" />
      <div className="text-ink min-w-0 text-dense">
        <p className="font-semibold">{`Sklad daftari zakazlardagi sotuvdan farq qiladi — ${sheet.checks.length} ta qator`}</p>
        <p className="text-ink-muted mt-0.5 text-meta">Jadval raqamlari daftar bo&apos;yicha. Sabab odatda — qo&apos;lda tuzatish; farqni bosh logist bilan tekshiring.</p>
        <ul className="mt-2 flex flex-col gap-1">
          {sheet.checks.map((check) => {
            const product = productOf(check.productId);
            return (
              <li key={`${check.date}-${check.courierId}-${check.flow}-${check.productId}`}>
                <span className="tabular">{shortDate(check.date)}</span>
                {" · "}
                <span data-no-translit>{courierName(check.courierId)}</span>
                {check.flow === "gift" ? " · Sovg'a · " : " · Sotilgan · "}
                <span className="font-semibold" data-no-translit>
                  {product?.name ?? "—"}
                </span>
                {`: daftarda ${cellText(check.ledger, product)}, zakazlarda ${cellText(check.orders, product)}`}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** `other` noldan farqli (§2.2): davrda tuzatish yoki kuryerdan qaytarish bo'lgan — jadvalda alohida qator chiqadi. */
function AdjustmentsNote({ sheet }: { sheet: SalesSheet }) {
  const names = sheet.couriers.filter((row) => hasCells(row.other)).map((row) => row.courier.fullName);
  if (names.length === 0) return null;
  return (
    <div role="status" className="bg-warn-soft text-warn flex items-start gap-2 rounded-2xl px-4 py-3 text-dense">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">Bu davrda tuzatish yoki qaytarish bor</span>
        {": "}
        <span data-no-translit>{names.join(", ")}</span>
        <span className="block">«Qolgan» shu harakat bilan yopiladi — jadvaldagi «Tuzatish / qaytarish» qatoriga qarang.</span>
      </p>
    </div>
  );
}

/** Qatorlar ma'nosi — rang yagona signal bo'lmasin. */
function SheetLegend() {
  return (
    <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
      <li>
        <strong className="text-ink font-semibold">Berilgan</strong>
        <span> = davr boshidagi qoldiq + davrda ombordan berilgan (katak ustida — alohida)</span>
      </li>
      <li>
        <strong className="text-ok font-semibold">Sotilgan</strong>
        <span> — kuryer ilovada «yetkazdim» qilgan zakazlardan, o&apos;zi yoziladi</span>
      </li>
      <li>
        <strong className="text-gold font-semibold">Sovg&apos;a</strong>
        <span> — sovg&apos;a qilib berilgan</span>
      </li>
      <li>
        <strong className="text-danger font-semibold">Qolgan</strong>
        <span> = berilgan − sotilgan − sovg&apos;a; ertangi kunga o&apos;zi o&apos;tadi</span>
      </li>
    </ul>
  );
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Yuklanmoqda">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
