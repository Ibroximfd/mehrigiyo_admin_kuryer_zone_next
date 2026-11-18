"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { oneOffHref } from "@/lib/filter-memory";
import { groupThousands } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { cellText, fullDate, moneyText, shortDate } from "../display";
import { isSingleDay } from "../period";
import type { SheetRange } from "../period";
import { cellOf, hasCells, isZeroCell } from "../types";
import type { CourierFee, CourierSheet, SalesSheet, SheetDay, SheetFigures, SheetFlow, SheetProduct } from "../types";
import { CourierFeeEditor } from "./courier-fee-editor";
import { BLOCK_START, CELL, HeadCell, LeadCell, LeadHeads, ProductHeads, QtyCells, RowLabel, SheetScroll } from "./sheet-table";
import type { RowTone } from "./sheet-table";

const FLOW_ROWS: ReadonlyArray<{ flow: SheetFlow; label: string; tone: RowTone }> = [
  { flow: "given", label: "Berilgan", tone: "plain" },
  { flow: "sold", label: "Sotilgan", tone: "ok" },
  { flow: "gift", label: "Sovg'a", tone: "gold" },
  { flow: "other", label: "Tuzatish / qaytarish", tone: "muted" },
  { flow: "closing", label: "Qolgan", tone: "danger" },
];

/**
 * Egasi jadvalidagi to'rt qator. Beshinchisi — «Tuzatish / qaytarish» (`other`,
 * §2.2) — faqat shunday harakat bo'lgan blokda chiqadi: usiz «Qolgan»
 * tenglamasi ko'zga yopilmaydi.
 */
function rowsOf(figures: SheetFigures) {
  return FLOW_ROWS.filter((row) => row.flow !== "other" || hasCells(figures.other));
}

/** «Berilgan» tarkibi (§2.2): davr boshidagi qoldiq + davrda berilgan — katak izohida. */
function givenTitle(figures: SheetFigures, product: SheetProduct): string | undefined {
  const opening = cellOf(figures.opening, product.id);
  const issued = cellOf(figures.issued, product.id);
  if (isZeroCell(opening) && isZeroCell(issued)) return undefined;
  return `Boshida ${cellText(opening, product)} + berildi ${cellText(issued, product)}`;
}

/**
 * Kunlik sotuv jadvali (hujjat 83 §1–§2): har kuryer — blok, mahsulot — ustun.
 * O'ngda pul, manzillar, kuryer xizmati va kassaga topshiriladigan naqd.
 * Hamma son serverdan — bu yerda faqat chiziladi. Kuryer xizmati bitta kun
 * ochiq bo'lsa tahrirlanadi; oraliqda — yig'indi (kunma-kun yoziladi).
 */
export function SalesSheetGrid({ sheet, range, onOpenDay }: { sheet: SalesSheet; range: SheetRange; onOpenDay: (day: string) => void }) {
  return (
    <SheetScroll label="Sotuv jadvali">
      <thead>
        <tr>
          <LeadHeads lead="Kuryer" label="Qator" />
          <ProductHeads products={sheet.products} />
          <HeadCell align="right" className="min-w-28">Naqd</HeadCell>
          <HeadCell align="right" className="min-w-28">Onlayn (ilova)</HeadCell>
          <HeadCell className="min-w-16">Manzil soni</HeadCell>
          <HeadCell className="min-w-16">Borganda atkaz</HeadCell>
          <HeadCell align="right" className="min-w-36">Kuryer xizmati (qo&apos;lda)</HeadCell>
          <HeadCell align="right" className="min-w-32">Topshiradi (naqd − xizmat)</HeadCell>
        </tr>
      </thead>
      {sheet.couriers.map((courier) => (
        // Davr almashsa blok yangidan quriladi — tahrirdagi summa boshqa kunga o'tib ketmaydi.
        <CourierBlock key={`${courier.courier.id}:${range.dateFrom}:${range.dateTo}`} courier={courier} products={sheet.products} range={range} onOpenDay={onOpenDay} />
      ))}
      <tfoot>
        <FigureRows
          figures={sheet.totals}
          products={sheet.products}
          total
          lead={
            <>
              <span className="text-ink block text-title">JAMI</span>
              <span className="text-ink-muted block text-fine">{`${sheet.couriers.length} ta kuryer`}</span>
            </>
          }
          fee={<FeeSum fee={sheet.totals.fee} hint="qo'lda yozilgan" />}
        />
      </tfoot>
    </SheetScroll>
  );
}

function CourierBlock({
  courier,
  products,
  range,
  onOpenDay,
}: {
  courier: CourierSheet;
  products: readonly SheetProduct[];
  range: SheetRange;
  onOpenDay: (day: string) => void;
}) {
  const [daysOpen, setDaysOpen] = useState(false);
  const { id, fullName } = courier.courier;
  return (
    <tbody>
      <FigureRows
        figures={courier}
        products={products}
        lead={
          <>
            <span className="text-ink block truncate text-body font-bold" data-no-translit title={fullName}>
              {fullName}
            </span>
            {courier.openOrders > 0 ? (
              <span className="text-ink-muted block text-fine">{`${groupThousands(courier.openOrders)} ta zakaz qoldi`}</span>
            ) : null}
            <Link
              href={oneOffHref(ROUTES.orders, { scope: "delivered", courier: id, from: range.dateFrom, to: range.dateTo })}
              className="text-brand mt-0.5 block text-fine font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Zakazlarini ochish
            </Link>
            {courier.days.length > 0 ? (
              <button
                type="button"
                aria-expanded={daysOpen}
                onClick={() => setDaysOpen((open) => !open)}
                className="text-ink-muted hover:text-ink mt-1 inline-flex items-center gap-1 text-fine font-semibold focus-visible:underline focus-visible:outline-none"
              >
                Kunma-kun
                <ChevronDown aria-hidden className={cn("size-3.5 transition-transform", daysOpen && "rotate-180")} />
              </button>
            ) : null}
          </>
        }
        fee={
          isSingleDay(range) ? (
            <CourierFeeEditor courier={courier.courier} date={range.dateFrom} fee={courier.fee} />
          ) : (
            <FeeSum fee={courier.fee} hint="kunma-kun yoziladi" />
          )
        }
      />
      {daysOpen ? courier.days.map((day) => <DayRow key={day.date} day={day} products={products} onOpen={() => onOpenDay(day.date)} />) : null}
    </tbody>
  );
}

/** Bitta blok qatorlari: chapda blok boshi, o'rtada mahsulot qatorlari, o'ngda pul kataklari (hamma qatorga cho'zilgan). */
function FigureRows({
  figures,
  products,
  lead,
  fee,
  total = false,
}: {
  figures: SheetFigures;
  products: readonly SheetProduct[];
  lead: React.ReactNode;
  fee: React.ReactNode;
  total?: boolean;
}) {
  const rows = rowsOf(figures);
  return (
    <>
      {rows.map((row, index) => (
        <tr key={row.flow}>
          {index === 0 ? (
            <LeadCell rowSpan={rows.length} className={total ? "bg-subtle" : undefined}>
              {lead}
            </LeadCell>
          ) : null}
          <RowLabel tone={row.tone} start={index === 0}>
            {row.label}
          </RowLabel>
          <QtyCells
            cells={figures[row.flow]}
            products={products}
            tone={row.tone}
            zero={row.flow === "closing" ? "show" : "blank"}
            signed={row.flow === "other"}
            start={index === 0}
            titleOf={row.flow === "given" ? (product) => givenTitle(figures, product) : undefined}
          />
          {index === 0 ? <MoneyCells figures={figures} rowSpan={rows.length} fee={fee} total={total} /> : null}
        </tr>
      ))}
    </>
  );
}

const MONEY = cn(CELL, BLOCK_START);

function MoneyCells({ figures, rowSpan, fee, total }: { figures: SheetFigures; rowSpan: number; fee: React.ReactNode; total: boolean }) {
  const surface = total ? "bg-subtle" : "bg-surface";
  return (
    <>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Amount value={figures.cashAmount} hint="qo'lda olgan" />
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Amount value={figures.onlineAmount} hint="Click · Payme" />
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-ink tabular text-center text-lg2 font-semibold")}>
        {groupThousands(figures.addresses)}
      </td>
      <td
        rowSpan={rowSpan}
        className={cn(MONEY, surface, "tabular text-center text-lg2 font-semibold", figures.refusedAddresses > 0 ? "text-danger" : "text-ink-faint")}
      >
        {groupThousands(figures.refusedAddresses)}
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, "bg-subtle")}>
        {fee}
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, "text-right", total ? "bg-brand text-brand-ink" : "bg-brand-soft text-brand")}>
        <span className="tabular block text-body font-bold whitespace-nowrap">{moneyText(figures.handoverDue)}</span>
        <span className="block text-fine">{total ? "kassaga topshiriladi" : "kassaga"}</span>
      </td>
    </>
  );
}

function Amount({ value, hint }: { value: number; hint: string }) {
  return (
    <>
      <span className="text-ink tabular block text-body font-semibold whitespace-nowrap">{moneyText(value)}</span>
      <span className="text-ink-faint block text-fine">{hint}</span>
    </>
  );
}

/** Kuryer xizmati — faqat o'qish: oraliqda kunlik yozuvlar yig'indisi, «JAMI» da hamma kuryer. */
function FeeSum({ fee, hint }: { fee: CourierFee | null; hint: string }) {
  return (
    <div className="text-right">
      <span className="text-ink tabular block text-body font-semibold whitespace-nowrap">{moneyText(fee?.amount ?? null)}</span>
      <span className="text-ink-faint block text-fine">{hint}</span>
    </div>
  );
}

const DAY_CELL = cn(CELL, "bg-surface text-ink-muted tabular whitespace-nowrap");

/**
 * Kunma-kun (oraliqda, `days[]`): bir kun — bir qator, ustunlar jadval bilan
 * bir xil. Mahsulotlarda o'sha kunning sotuvi; sana bosilsa o'sha kun ochiladi
 * (to'liq to'rt qator va kuryer xizmatini yozish shu yerda).
 */
function DayRow({ day, products, onOpen }: { day: SheetDay; products: readonly SheetProduct[]; onOpen: () => void }) {
  return (
    <tr>
      <th scope="row" className="border-line bg-surface sticky left-0 z-10 border-r border-b px-3 py-2 text-left font-normal">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${fullDate(day.date)} kunini ochish`}
          className="text-brand tabular text-meta font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {shortDate(day.date)}
        </button>
      </th>
      <RowLabel tone="ok">Sotilgan</RowLabel>
      <QtyCells cells={day.sold} products={products} tone="ok" />
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(day.cashAmount)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(day.onlineAmount)}</td>
      <td className={cn(DAY_CELL, "text-center")}>{groupThousands(day.addresses)}</td>
      <td className={cn(DAY_CELL, "text-center")}>{groupThousands(day.refusedAddresses)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(day.fee?.amount ?? null)}</td>
      <td className={cn(DAY_CELL, "text-brand text-right font-semibold")}>{moneyText(day.handoverDue)}</td>
    </tr>
  );
}
