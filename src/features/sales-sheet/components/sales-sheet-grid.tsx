"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { oneOffHref } from "@/lib/filter-memory";
import { groupThousands } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import type { CourierCash } from "../cash";
import { cellText, fullDate, moneyText, shortDate } from "../display";
import { isSingleDay } from "../period";
import type { SheetRange } from "../period";
import type { RegionGroup } from "../regions";
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

/** O'ngdagi pul va son ustunlari soni (`MoneyCells`) — viloyat sarlavhasi butun qatorga cho'zilishi uchun. */
const MONEY_COLUMNS = 8;

/**
 * Kunlik sotuv jadvali (hujjat 83 §1–§2): har kuryer — blok, mahsulot — ustun.
 * O'ngda pul, manzillar, kuryer xizmati, kassaga topshiriladigan naqd va
 * kuryer topshirgani. Hamma son serverdan — bu yerda faqat chiziladi. Kuryer
 * xizmati bitta kun ochiq bo'lsa tahrirlanadi; oraliqda — yig'indi.
 *
 * Viloyatlar kesimi (egasi, 2026-11-19; `regions` — `useSheetRegions`):
 *   • bitta kun — viloyat sarlavhasi, uning kuryerlari, «{viloyat} jami», oxirida «JAMI»;
 *   • hafta / oy / oraliq — kuryer bloklarisiz: har viloyat bitta blok, oxirida «JAMI».
 * `regions: null` (viloyat hali aniqlanmagan) — avvalgidek, kuryerlar guruhsiz.
 */
export function SalesSheetGrid({
  sheet,
  range,
  onOpenDay,
  regions = null,
}: {
  sheet: SalesSheet;
  range: SheetRange;
  onOpenDay: (day: string) => void;
  regions?: readonly RegionGroup[] | null;
}) {
  const single = isSingleDay(range);
  const columns = 2 + sheet.products.length + MONEY_COLUMNS;
  // Davr almashsa blok yangidan quriladi — tahrirdagi summa boshqa kunga o'tib ketmaydi.
  const courierBlock = (courier: CourierSheet) => (
    <CourierBlock key={`${courier.courier.id}:${range.dateFrom}:${range.dateTo}`} courier={courier} products={sheet.products} range={range} onOpenDay={onOpenDay} />
  );
  return (
    <SheetScroll label="Sotuv jadvali">
      <thead>
        <tr>
          <LeadHeads lead={regions && !single ? "Viloyat" : "Kuryer"} label="Qator" />
          <ProductHeads products={sheet.products} />
          <HeadCell align="right" className="min-w-28">Naqd</HeadCell>
          <HeadCell align="right" className="min-w-28">Onlayn (ilova)</HeadCell>
          <HeadCell align="right" className="min-w-24">Skidka</HeadCell>
          <HeadCell className="min-w-16">Manzil soni</HeadCell>
          <HeadCell className="min-w-16">Borganda atkaz</HeadCell>
          <HeadCell align="right" className="min-w-36">Kuryer xizmati (qo&apos;lda)</HeadCell>
          <HeadCell align="right" className="min-w-32">Topshiradi (naqd − xizmat)</HeadCell>
          <HeadCell align="right" className="min-w-28">Topshirdi</HeadCell>
        </tr>
      </thead>
      {regions === null
        ? sheet.couriers.map(courierBlock)
        : regions.map((region) =>
            single ? (
              <Fragment key={region.code ?? ""}>
                <RegionHead region={region} columns={columns} />
                {region.couriers.map(courierBlock)}
                <tbody>
                  <FigureRows
                    figures={region.totals}
                    products={sheet.products}
                    variant="region"
                    lead={<RegionLead title={`${region.name} jami`} couriers={region.couriers.length} />}
                    fee={<FeeSum fee={region.totals.fee} hint="qo'lda yozilgan" />}
                  />
                </tbody>
              </Fragment>
            ) : (
              <tbody key={region.code ?? ""}>
                <FigureRows
                  figures={region.totals}
                  products={sheet.products}
                  lead={<RegionLead title={region.name} couriers={region.couriers.length} />}
                  fee={<FeeSum fee={region.totals.fee} hint="kunma-kun yoziladi" />}
                />
              </tbody>
            ),
          )}
      <tfoot>
        <FigureRows
          figures={sheet.totals}
          products={sheet.products}
          variant="total"
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

/**
 * Viloyat sarlavhasi (bitta kun) — butun qatorga cho'zilgan; nom chapda
 * yopishgan: jadval yonga siljiganda ham ko'rinib turadi.
 */
function RegionHead({ region, columns }: { region: RegionGroup; columns: number }) {
  return (
    <tbody>
      <tr>
        <th scope="rowgroup" colSpan={columns} className={cn("border-line bg-surface-3 border-b px-3 py-2 text-left font-normal", BLOCK_START)}>
          <span className="sticky left-3 inline-flex items-baseline gap-2">
            <span className="text-ink text-body font-bold">{region.name}</span>
            <span className="text-ink-muted text-meta">{`${region.couriers.length} ta kuryer`}</span>
          </span>
        </th>
      </tr>
    </tbody>
  );
}

/** Viloyat bloki boshi: nomi (yoki «… jami») va kuryerlar soni. Nom DOM'da tarjima qilinadi (lug'atdagi viloyat). */
function RegionLead({ title, couriers }: { title: string; couriers: number }) {
  return (
    <>
      <span className="text-ink block text-body font-bold">{title}</span>
      <span className="text-ink-muted block text-fine">{`${couriers} ta kuryer`}</span>
    </>
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

/** Blok turi: kuryer (yoki oraliqda viloyat) — oddiy; viloyat jami va «JAMI» — xira fonli yig'indi. */
type BlockVariant = "plain" | "region" | "total";

/** Bitta blok qatorlari: chapda blok boshi, o'rtada mahsulot qatorlari, o'ngda pul kataklari (hamma qatorga cho'zilgan). */
function FigureRows({
  figures,
  products,
  lead,
  fee,
  variant = "plain",
}: {
  figures: SheetFigures;
  products: readonly SheetProduct[];
  lead: React.ReactNode;
  fee: React.ReactNode;
  variant?: BlockVariant;
}) {
  const rows = rowsOf(figures);
  return (
    <>
      {rows.map((row, index) => (
        <tr key={row.flow}>
          {index === 0 ? (
            <LeadCell rowSpan={rows.length} className={variant === "plain" ? undefined : "bg-subtle"}>
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
          {index === 0 ? <MoneyCells figures={figures} rowSpan={rows.length} fee={fee} variant={variant} /> : null}
        </tr>
      ))}
    </>
  );
}

const MONEY = cn(CELL, BLOCK_START);

function MoneyCells({ figures, rowSpan, fee, variant }: { figures: SheetFigures; rowSpan: number; fee: React.ReactNode; variant: BlockVariant }) {
  const surface = variant === "plain" ? "bg-surface" : "bg-subtle";
  const total = variant === "total";
  return (
    <>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Amount value={figures.cashAmount} hint="qo'lda olgan" />
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Amount value={figures.onlineAmount} hint="Click · Payme" />
      </td>
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Amount value={figures.discountAmount} hint="ball + qo'lda" />
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
      <td rowSpan={rowSpan} className={cn(MONEY, surface, "text-right")}>
        <Handed cash={figures.cash} />
      </td>
    </>
  );
}

/**
 * «Topshirdi» — «Pul olish»da kuryerdan olingan pul (`cash.received`), ostida
 * «kerak» — olinishi kerak (`cash.due_total`, o'tgan qarz bilan). Blok kelmasa — «—».
 */
function Handed({ cash }: { cash: CourierCash | null }) {
  return (
    <>
      <span className={cn("tabular block text-body font-semibold whitespace-nowrap", cash?.received ? "text-ink" : "text-ink-faint")}>
        {moneyText(cash?.received ?? null)}
      </span>
      {cash ? <span className="text-ink-faint block text-fine whitespace-nowrap">{`kerak ${moneyText(cash.dueTotal)}`}</span> : null}
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
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(day.discountAmount)}</td>
      <td className={cn(DAY_CELL, "text-center")}>{groupThousands(day.addresses)}</td>
      <td className={cn(DAY_CELL, "text-center")}>{groupThousands(day.refusedAddresses)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(day.fee?.amount ?? null)}</td>
      <td className={cn(DAY_CELL, "text-brand text-right font-semibold")}>{moneyText(day.handoverDue)}</td>
      <td className={cn(DAY_CELL, "text-right")}>{moneyText(day.cash?.received ?? null)}</td>
    </tr>
  );
}
