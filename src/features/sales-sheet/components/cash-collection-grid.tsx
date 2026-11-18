"use client";

import { HandCoins } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { CourierCash } from "../cash";
import { addressNote, cashAction } from "../cash-view";
import { moneyText } from "../display";
import { isSingleDay } from "../period";
import type { SheetRange } from "../period";
import type { CourierSheet, SalesSheet } from "../types";
import { CashReceiptDialog } from "./cash-receipt-dialog";
import { CourierDiscountEditor } from "./courier-discount-editor";
import { BLOCK_START, CELL, HeadCell, SheetScroll } from "./sheet-table";

/** Kuryer ustuni — chapda yopishgan, kengligi qat'iy. */
const LEAD_WIDTH = "w-32 min-w-32 max-w-32 sm:w-44 sm:min-w-44 sm:max-w-44";

const LEAD_HEAD = cn(
  "border-line bg-subtle text-ink-muted sticky top-0 left-0 z-30 border-r border-b px-3 py-2.5 text-left align-middle text-meta font-semibold",
  LEAD_WIDTH,
);

const LEAD_CELL = cn("border-line sticky left-0 z-10 border-r border-b px-3 py-2 text-left align-middle font-normal", LEAD_WIDTH);

const MONEY = cn(CELL, "tabular text-right whitespace-nowrap");

/**
 * Kuryerdan pul olish jadvali (hujjat 85 §2, egasi maketi): har kuryer — bir
 * qator, o'ngda «Olinishi kerak», «Olindi», «Qarz» va «Oldim». Hamma son
 * serverdan — bu yerda faqat chiziladi. Skidka va «Oldim» — faqat bitta kun
 * ochiq bo'lsa; oraliqda — yig'indi (o'qish uchun).
 */
export function CashCollectionGrid({
  sheet,
  totals,
  range,
  canAccept,
}: {
  sheet: SalesSheet;
  totals: CourierCash;
  range: SheetRange;
  canAccept: boolean;
}) {
  const single = isSingleDay(range);
  const [openId, setOpenId] = useState<number | null>(null);
  const opened = sheet.couriers.find((row) => row.courier.id === openId) ?? null;

  return (
    <>
      <SheetScroll label="Kuryerdan pul olish">
        <thead>
          <tr>
            <th scope="col" className={LEAD_HEAD}>
              Kuryer
            </th>
            <HeadCell align="right" className="min-w-28">
              Umumiy sotuv
            </HeadCell>
            <HeadCell align="right" className="min-w-28">
              Onlayn (Click · Payme)
            </HeadCell>
            <HeadCell align="right" className="min-w-32">
              {single ? "Skidka (o'zingiz yozasiz)" : "Skidka"}
            </HeadCell>
            <HeadCell align="right" className="min-w-24">
              Sovg&apos;a
            </HeadCell>
            <HeadCell align="right" className="min-w-24">
              Kuryer xizmati
            </HeadCell>
            <HeadCell align="right" className="min-w-24">
              {single ? "O'tgan qarz" : "Davr boshidagi qarz"}
            </HeadCell>
            <HeadCell align="right" className="min-w-28">
              Olinishi kerak
            </HeadCell>
            <HeadCell align="right" className="min-w-24">
              Olindi
            </HeadCell>
            <HeadCell align="right" className="min-w-24">
              {single ? "Qarz (ertaga)" : "Davr oxiridagi qarz"}
            </HeadCell>
            {single ? <HeadCell className="min-w-32">Amal</HeadCell> : null}
          </tr>
        </thead>
        <tbody>
          {sheet.couriers.map((row) => (
            // Davr almashsa qator yangidan quriladi — tahrirdagi skidka boshqa kunga o'tib ketmaydi.
            <CourierCashRow
              key={`${row.courier.id}:${range.dateFrom}:${range.dateTo}`}
              row={row}
              date={range.dateFrom}
              single={single}
              canAccept={canAccept}
              onOpen={() => setOpenId(row.courier.id)}
            />
          ))}
        </tbody>
        <tfoot>
          <TotalRow totals={totals} couriers={sheet.couriers.length} single={single} />
        </tfoot>
      </SheetScroll>
      {opened?.cash && single ? (
        <CashReceiptDialog courier={opened.courier} date={range.dateFrom} cash={opened.cash} canAccept={canAccept} onClose={() => setOpenId(null)} />
      ) : null}
    </>
  );
}

function CourierCashRow({
  row,
  date,
  single,
  canAccept,
  onOpen,
}: {
  row: CourierSheet;
  date: string;
  single: boolean;
  canAccept: boolean;
  onOpen: () => void;
}) {
  const { cash } = row;
  const { fullName } = row.courier;
  return (
    <tr>
      <th scope="row" className={cn(LEAD_CELL, "bg-surface")}>
        <span className="text-ink block truncate text-body font-bold" data-no-translit title={fullName}>
          {fullName}
        </span>
        <span className="text-ink-muted block text-fine">{addressNote(row.addresses, row.refusedAddresses)}</span>
      </th>
      {cash ? (
        <>
          <td className={cn(MONEY, "text-ink font-semibold")}>{moneyText(cash.salesAmount)}</td>
          <td className={cn(MONEY, "text-ink")}>{moneyText(cash.onlineAmount)}</td>
          <td className={cn(CELL, "bg-subtle")}>
            {single ? (
              <CourierDiscountEditor courier={row.courier} date={date} cash={cash} />
            ) : (
              <span className="text-ink tabular block text-right whitespace-nowrap">{moneyText(cash.discountAmount)}</span>
            )}
          </td>
          <td className={cn(MONEY, "text-gold")}>{moneyText(cash.giftAmount)}</td>
          <td className={cn(MONEY, "text-ink")}>{moneyText(cash.feeAmount)}</td>
          <td className={cn(MONEY, cash.openingDebt !== null && cash.openingDebt > 0 ? "text-danger" : "text-ink-faint")}>{moneyText(cash.openingDebt)}</td>
          <td className={cn(MONEY, "bg-brand-soft text-brand text-body font-bold")}>{moneyText(cash.dueTotal)}</td>
          {/* Hali olinmagan (0) — «—», maketdagidek; server bermagani ham «—». */}
          <td className={cn(MONEY, cash.received ? "text-ink font-semibold" : "text-ink-faint")}>{cash.received ? groupThousands(cash.received) : "—"}</td>
          <td className={cn(MONEY, "font-bold", debtTone(cash.closingDebt))}>{moneyText(cash.closingDebt)}</td>
          {single ? (
            <td className={cn(CELL, "text-center")}>
              <CashActionCell action={cashAction(cash, { single, canAccept })} courierName={fullName} onOpen={onOpen} />
            </td>
          ) : null}
        </>
      ) : (
        <td colSpan={single ? 10 : 9} className={cn(CELL, "text-ink-faint text-meta")}>
          Bu kuryer bo&apos;yicha pul hisobi kelmadi
        </td>
      )}
    </tr>
  );
}

/** Qarz rangi: qolgan bo'lsa — qizil, yopilgan (yoki ortiqcha olingan) — yashil; noma'lum — xira. */
function debtTone(debt: number | null): string {
  if (debt === null) return "text-ink-faint";
  return debt > 0 ? "text-danger" : "text-ok";
}

function CashActionCell({ action, courierName, onOpen }: { action: ReturnType<typeof cashAction>; courierName: string; onOpen: () => void }) {
  if (action === "take") {
    return (
      <Button size="sm" className="w-full" onClick={onOpen}>
        <HandCoins />
        Oldim
      </Button>
    );
  }
  if (action === "taken") {
    // Qarz yopilgan — yozuvlarni ko'rish (va kerak bo'lsa bekor qilish) shu oynada.
    return (
      <Button size="sm" variant="ghost" className="text-ok w-full" aria-label={`${courierName}: olingan pullar`} onClick={onOpen}>
        ✓ olindi
      </Button>
    );
  }
  return <span className="text-ink-faint">—</span>;
}

function TotalRow({ totals, couriers, single }: { totals: CourierCash; couriers: number; single: boolean }) {
  const total = cn(MONEY, BLOCK_START, "bg-subtle text-ink font-bold");
  return (
    <tr>
      <th scope="row" className={cn(LEAD_CELL, BLOCK_START, "bg-subtle")}>
        <span className="text-ink block text-title">Jami</span>
        <span className="text-ink-muted block text-fine">{`${couriers} ta kuryer`}</span>
      </th>
      <td className={total}>{moneyText(totals.salesAmount)}</td>
      <td className={total}>{moneyText(totals.onlineAmount)}</td>
      <td className={total}>{moneyText(totals.discountAmount)}</td>
      <td className={total}>{moneyText(totals.giftAmount)}</td>
      <td className={total}>{moneyText(totals.feeAmount)}</td>
      <td className={total}>{moneyText(totals.openingDebt)}</td>
      <td className={cn(MONEY, BLOCK_START, "bg-brand text-brand-ink text-body font-bold")}>{moneyText(totals.dueTotal)}</td>
      <td className={total}>{moneyText(totals.received)}</td>
      <td className={cn(total, debtTone(totals.closingDebt))}>{moneyText(totals.closingDebt)}</td>
      {single ? <td className={cn(CELL, BLOCK_START, "bg-subtle")} /> : null}
    </tr>
  );
}
