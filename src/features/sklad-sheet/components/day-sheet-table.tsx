import { cn } from "@/lib/utils";

import type { DaySheetLine, DaySheetModel } from "../day-sheet";
import type { SkladProduct } from "../types";
import { BLOCK_START, CELL, FlowCells, HEAD, ProductHeads, ROW_TONE, SheetScroll } from "./sheet-parts";

/*
 * Yopishgan ustunlar faqat keng ekranda (`md`): uchala bosh ustun (hudud,
 * kuryer, qator yorlig'i) birga yopishadi — telefonda ular ekranning yarmini
 * egallardi, shuning uchun u yerda butun jadval siljiydi. Kengliklar qat'iy:
 * keyingi ustun shu masofada yopishadi.
 */
const REGION_COL = "w-24 min-w-24 md:sticky md:left-0 md:w-28 md:max-w-28 md:min-w-28";
const COURIER_COL = "w-28 min-w-28 md:sticky md:left-28 md:w-36 md:max-w-36 md:min-w-36";
const LABEL_COL = "w-16 min-w-16 md:sticky md:left-64 md:w-16 md:max-w-16";
/** Jami qatorlar yorlig'i — uchala bosh ustun kengligida. */
const SPAN_COL = "md:sticky md:left-0";

/**
 * Kunlik jadval (hujjat 85 §1, egasi sheet'i 17.11.2026): ustunlar — Hudud ·
 * Kuryer · qator · mahsulotlar · Summa. Hamma son serverdan, bu yerda faqat chiziladi.
 */
export function DaySheetTable({ model, products }: { model: DaySheetModel; products: readonly SkladProduct[] }) {
  const columns = products.length + 4;
  return (
    <SheetScroll label="Kunlik harakat">
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD, REGION_COL, "z-20 px-3 text-left")}>
            Hudud
          </th>
          <th scope="col" className={cn(HEAD, COURIER_COL, "z-20 text-left")}>
            Kuryer
          </th>
          <th scope="col" className={cn(HEAD, LABEL_COL, "z-20 border-r text-left")}>
            <span className="sr-only">Qator</span>
          </th>
          <ProductHeads products={products} />
          <th scope="col" className={cn(HEAD, "min-w-28 border-l px-3 text-right")}>
            Summa
          </th>
        </tr>
      </thead>
      <tbody>
        {model.head.map((line) => (
          <SheetLine key={line.key} line={line} products={products} />
        ))}
        {model.couriers.length > 0 ? (
          model.couriers.map((line) => <SheetLine key={line.key} line={line} products={products} />)
        ) : (
          <tr>
            <td colSpan={columns} className={cn(CELL, BLOCK_START, "text-ink-muted border-l-0 px-3 py-3 text-center")}>
              Bu kunda yetkazilgan zakaz yo&apos;q
            </td>
          </tr>
        )}
        {model.tail.map((line, index) => (
          <SheetLine key={line.key} line={line} products={products} start={index === 0} />
        ))}
      </tbody>
    </SheetScroll>
  );
}

function SheetLine({ line, products, start = false }: { line: DaySheetLine; products: readonly SkladProduct[]; start?: boolean }) {
  if (line.kind === "total") {
    return (
      <tr>
        <th
          scope="row"
          colSpan={3}
          className={cn(CELL, SPAN_COL, "z-10 border-l-0 border-r px-3 text-left whitespace-nowrap", ROW_TONE[line.tone], start && BLOCK_START)}
        >
          {line.label}
        </th>
        <FlowCells flow={line.flow} products={products} tone={line.tone} zero={line.zero} signed={line.signed} className={cn(start && BLOCK_START)} />
      </tr>
    );
  }
  return (
    <tr>
      {line.blockStart ? (
        <>
          <th scope="rowgroup" rowSpan={2} className={cn(CELL, REGION_COL, BLOCK_START, "bg-surface text-ink z-10 border-l-0 px-3 text-left font-semibold")}>
            <span className="line-clamp-2 break-words">{line.regionName}</span>
          </th>
          <th scope="rowgroup" rowSpan={2} className={cn(CELL, COURIER_COL, BLOCK_START, "bg-surface text-ink z-10 text-left font-normal")}>
            {line.courierName ? (
              <span className="line-clamp-2 break-words" data-no-translit title={line.courierName}>
                {line.courierName}
              </span>
            ) : (
              <span className="text-ink-muted">Kuryersiz</span>
            )}
          </th>
        </>
      ) : null}
      <th scope="row" className={cn(CELL, LABEL_COL, "z-10 border-r text-left text-meta font-semibold", ROW_TONE[line.tone], line.blockStart && BLOCK_START)}>
        {line.flowLabel}
      </th>
      <FlowCells flow={line.flow} products={products} tone={line.tone} className={cn(line.blockStart && BLOCK_START)} />
    </tr>
  );
}
