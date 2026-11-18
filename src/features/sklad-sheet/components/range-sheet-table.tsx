import Link from "next/link";

import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import { fullDate, shortDate } from "../period";
import type { RangeDayLine, RangeSheetModel } from "../range-sheet";
import type { SkladProduct } from "../types";
import { BLOCK_START, CELL, FlowCells, HEAD, MISSING, ProductHeads, ROW_TONE, SheetScroll } from "./sheet-parts";

/*
 * Sana ustuni har doim chapda yopishadi (tor — telefonda ham joy oladi), qator
 * yorlig'i — keng ekranda undan keyin. Kengliklar qat'iy: yorliq shu masofada yopishadi.
 */
const DATE_COL = "sticky left-0 w-20 max-w-20 min-w-20";
const LABEL_COL = "w-16 min-w-16 md:sticky md:left-20 md:max-w-16";
/** O'ng tomondagi kunlik ustunlar (manzil, xizmat) — ikki qatorga cho'zilgan. */
const SIDE = "border-line tabular border-b border-l px-2 py-2 text-center align-middle whitespace-nowrap";

/**
 * Sanadan sanagacha jadvali (hujjat 85 §1.5, egasi maketi SkladHafta): har kun —
 * sotuv va sovg'a qatori, o'ngda manzil soni, borib atkaz, kuryer xizmati narxi
 * va jami (`address_rows`, yo'q — «—»). Sana bosilsa — o'sha kunning kunlik jadvali.
 */
export function RangeSheetTable({
  model,
  products,
  dayHref,
}: {
  model: RangeSheetModel;
  products: readonly SkladProduct[];
  dayHref: (day: string) => string;
}) {
  return (
    <SheetScroll label="Kunlik savdo">
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD, DATE_COL, "z-20 px-3 text-left")}>
            Sana
          </th>
          <th scope="col" className={cn(HEAD, LABEL_COL, "z-20 border-r text-left")}>
            <span className="sr-only">Qator</span>
          </th>
          <ProductHeads products={products} />
          <th scope="col" className={cn(HEAD, "min-w-28 border-l px-3 text-right")}>
            Umumiy summa
          </th>
          <th scope="col" className={cn(HEAD, "min-w-16 border-l text-center")}>
            Manzil soni
          </th>
          <th scope="col" className={cn(HEAD, "min-w-16 border-l text-center")}>
            Borib atkaz
          </th>
          <th scope="col" className={cn(HEAD, "min-w-24 border-l text-right")}>
            Kuryer xizmat narxi
          </th>
          <th scope="col" className={cn(HEAD, "min-w-28 border-l px-3 text-right")}>
            Kuryer xizmati jami
          </th>
        </tr>
      </thead>
      <tbody>
        {model.days.map((day) => (
          <DayRows key={day.date} day={day} products={products} href={dayHref(day.date)} />
        ))}
        <TotalRows model={model} products={products} />
      </tbody>
    </SheetScroll>
  );
}

function DayRows({ day, products, href }: { day: RangeDayLine; products: readonly SkladProduct[]; href: string }) {
  const address = day.address;
  return (
    <>
      <tr>
        <th scope="rowgroup" rowSpan={2} className={cn(CELL, DATE_COL, BLOCK_START, "bg-info-soft z-10 border-l-0 px-3 text-left")}>
          <Link
            href={href}
            aria-label={`${fullDate(day.date)} kunini ochish`}
            className="text-info tabular font-semibold underline-offset-2 hover:underline focus-visible:underline"
          >
            {shortDate(day.date)}
          </Link>
        </th>
        <FlowLabel label="sotuv" tone="ok" start />
        <FlowCells flow={day.sold} products={products} tone="ok" className={BLOCK_START} />
        <td rowSpan={2} className={cn(SIDE, BLOCK_START, "text-ink font-semibold")}>
          {numberText(address?.addresses ?? null)}
        </td>
        <td rowSpan={2} className={cn(SIDE, BLOCK_START, "text-danger font-semibold")}>
          {/* Atkaz yo'q kun — bo'sh katak (egasi sheet'idagidek). */}
          {address?.refusedAddresses === 0 ? null : numberText(address?.refusedAddresses ?? null)}
        </td>
        <td rowSpan={2} className={cn(SIDE, BLOCK_START, "text-ink-muted text-right")}>
          {numberText(address?.rate ?? null)}
        </td>
        <td rowSpan={2} className={cn(SIDE, BLOCK_START, "text-ink px-3 text-right font-semibold")}>
          {numberText(address?.fee ?? null)}
        </td>
      </tr>
      <tr>
        <FlowLabel label="sovg'a" tone="gift" />
        <FlowCells flow={day.gift} products={products} tone="gift" />
      </tr>
    </>
  );
}

/**
 * «Itogo»: sotuv va sovg'a — davr bo'yicha serverning `sold`/`gift` i; manzil va
 * atkaz — kunlik sonlar yig'indisi. Kuryer xizmati jami — pul, server davr
 * jamisini bermaguncha «—» (frontend pulni qo'shmaydi).
 */
function TotalRows({ model, products }: { model: RangeSheetModel; products: readonly SkladProduct[] }) {
  const { totals } = model;
  const start = "border-t-4 border-t-line-strong";
  return (
    <>
      <tr>
        <th scope="rowgroup" rowSpan={2} className={cn(CELL, DATE_COL, start, "bg-subtle text-ink z-10 border-l-0 px-3 text-left font-bold")}>
          Itogo
        </th>
        <FlowLabel label="sotuv" tone="okStrong" className={start} />
        <FlowCells flow={totals.sold} products={products} tone="okStrong" className={start} />
        <td rowSpan={2} className={cn(SIDE, start, "bg-subtle text-ink font-bold")}>
          {numberText(totals.addresses)}
        </td>
        <td rowSpan={2} className={cn(SIDE, start, "bg-subtle text-danger font-bold")}>
          {numberText(totals.refusedAddresses)}
        </td>
        <td rowSpan={2} className={cn(SIDE, start, "bg-subtle")} />
        <td rowSpan={2} title="Server davr jamisini hali bermaydi" className={cn(SIDE, start, "bg-subtle text-ink-muted px-3 text-right")}>
          {MISSING}
        </td>
      </tr>
      <tr>
        <FlowLabel label="sovg'a" tone="giftStrong" />
        <FlowCells flow={totals.gift} products={products} tone="giftStrong" />
      </tr>
    </>
  );
}

function FlowLabel({
  label,
  tone,
  start = false,
  className,
}: {
  label: "sotuv" | "sovg'a";
  tone: "ok" | "gift" | "okStrong" | "giftStrong";
  start?: boolean;
  className?: string;
}) {
  return (
    <th scope="row" className={cn(CELL, LABEL_COL, "z-10 border-r text-left text-meta font-semibold", ROW_TONE[tone], start && BLOCK_START, className)}>
      {label}
    </th>
  );
}

/** Son yoki pul — «2 150 000»; server bermagan (`null`) — «—». */
function numberText(value: number | null): string {
  return value === null ? MISSING : groupThousands(value);
}
