"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { HandCoins, Wallet } from "lucide-react";

import { Section } from "@/components/kit/key-figures";
import { QueryStateView } from "@/components/kit/query-state";
import { EmptyView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BLOCK_START, CELL, HeadCell, SheetScroll } from "@/features/sales-sheet/components/sheet-table";
import { SheetPeriodBar } from "@/features/sales-sheet/components/sheet-period-bar";
import { moneyText } from "@/features/sales-sheet/display";
import type { SheetPeriodControls } from "@/features/sales-sheet/use-sheet-period";
import { groupThousands } from "@/lib/format";
import { PIECE_UNIT } from "@/lib/item-ref";
import { columnUnit, qtyText } from "@/lib/qty-cell";
import { cn } from "@/lib/utils";

import type { CashSheet, CashSheetFilial, CashSheetMoney, CashSheetProduct, ProductRow } from "../cash-sheet";
import { CASH_PERIODS, canHandOver, filialStatus, regionsText } from "../cash-sheet-view";
import type { FilialStatus } from "../cash-sheet-view";
import type { HandoverTarget } from "./filial-handovers";

/**
 * Kassa jadvali (hujjat 85 §3, egasi maketi): davr — «Kun» yoki «Sanadan
 * sanagacha»; «Nima sotildi» (mahsulot × sotildi/sovg'a) va «Filialga
 * topshirish» (har filial puli, «Topshirdim»). Hamma son serverdan.
 * «Topshirdim» — mavjud topshirish oynasi (`onHandover`); dopusk yoki kassa
 * holati yo'q bo'lsa `null` — tugma chiqmaydi.
 */
export function CashSheetSection({
  controls,
  query,
  onHandover,
}: {
  controls: SheetPeriodControls;
  query: UseQueryResult<CashSheet>;
  onHandover: ((target: HandoverTarget) => void) | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SheetPeriodBar controls={controls} periods={CASH_PERIODS} />
      <QueryStateView
        query={query}
        deniedTitle="Kassa jadvali sizga ochilmagan"
        missingTitle="Kassa jadvali — server hali chiqarmagan"
        skeleton={<CashSheetSkeleton />}
      >
        {(sheet) => <CashSheetBody sheet={sheet} handoverDate={controls.range.dateTo} onHandover={onHandover} />}
      </QueryStateView>
    </div>
  );
}

/** Tayyor holat: ikki jadval va izoh. Topshirish kuni — ko'rilayotgan kun (oraliqda — oxirgi kun). */
export function CashSheetBody({
  sheet,
  handoverDate,
  onHandover,
}: {
  sheet: CashSheet;
  handoverDate: string;
  onHandover: ((target: HandoverTarget) => void) | null;
}) {
  if (sheet.products.length === 0 && sheet.filials.length === 0) {
    return (
      <EmptyView
        Icon={Wallet}
        title="Bu davrda sotuv ham, topshiriladigan pul ham yo'q"
        description="Boshqa kunni yoki kengroq davrni tanlang."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return (
    <>
      <Section title="Nima sotildi">
        {sheet.products.length > 0 ? (
          <SoldTable sheet={sheet} />
        ) : (
          <p className="border-line bg-surface text-ink-muted rounded-2xl border px-4 py-3 text-dense">Bu davrda mahsulot sotilmagan.</p>
        )}
      </Section>
      <Section title="Filialga topshirish" description="Umumiy sotuv − onlayn − skidka (+ o'tgan qarz) = topshirishi kerak">
        <FilialTable sheet={sheet} handoverDate={handoverDate} onHandover={onHandover} />
      </Section>
      <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
        <li>«Topshirdim» — summani kiritasiz; filial (logist) Kassa&apos;da «Oldim» bilan tasdiqlaydi</li>
        <li>Kam topshirilsa — qarz bo&apos;lib ertangi kunga o&apos;tadi</li>
        <li>Naqd — kuryerlardan «Sotuv jadvali › Pul olish»da olingan pul</li>
      </ul>
    </>
  );
}

// ── Nima sotildi ────────────────────────────────────────────────────────────

const ROWS: ReadonlyArray<{ key: "sold" | "gift"; label: string; tone: string }> = [
  { key: "sold", label: "Sotildi", tone: "bg-ok-soft text-ok" },
  { key: "gift", label: "Sovg'a", tone: "bg-gold-soft text-gold" },
];

const LEAD = "border-line sticky left-0 z-10 border-r border-b px-3 py-2 text-left align-middle";

function SoldTable({ sheet }: { sheet: CashSheet }) {
  return (
    <SheetScroll label="Nima sotildi">
      <thead>
        <tr>
          <th scope="col" className={cn(LEAD, "bg-subtle text-ink-muted top-0 z-30 w-24 min-w-24 text-meta font-semibold")}>
            <span className="sr-only">Qator</span>
          </th>
          {sheet.products.map((product) => (
            <ProductHead key={product.id} product={product} />
          ))}
          <HeadCell align="right" className="min-w-32">
            Summa
          </HeadCell>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <ProductRowView key={row.key} label={row.label} tone={row.tone} row={sheet[row.key]} products={sheet.products} />
        ))}
      </tbody>
    </SheetScroll>
  );
}

/** Mahsulot ustuni: nom ko'pi bilan ikki qator (to'lig'i `title` da); birlik faqat «dona» bo'lmasa. */
function ProductHead({ product }: { product: CashSheetProduct }) {
  const unit = columnUnit(product.unit);
  return (
    <HeadCell className="min-w-16">
      <span className="text-ink mx-auto line-clamp-2 max-w-24 break-words" data-no-translit title={product.name}>
        {product.name}
      </span>
      {unit !== PIECE_UNIT ? <span className="block text-fine font-normal">{unit}</span> : null}
    </HeadCell>
  );
}

function ProductRowView({ label, tone, row, products }: { label: string; tone: string; row: ProductRow; products: readonly CashSheetProduct[] }) {
  return (
    <tr>
      <th scope="row" className={cn(LEAD, tone, "text-meta font-semibold whitespace-nowrap")}>
        {label}
      </th>
      {products.map((product) => {
        const cell = row.items[String(product.id)];
        return (
          <td
            key={product.id}
            title={cell?.amount != null ? `${groupThousands(cell.amount)} so'm` : undefined}
            className={cn(CELL, tone, "tabular px-1.5 text-center font-semibold whitespace-nowrap")}
          >
            {cell ? qtyText(cell, product.unit) : null}
          </td>
        );
      })}
      <td className={cn(CELL, tone, "tabular text-right font-bold whitespace-nowrap")}>{moneyText(row.amount)}</td>
    </tr>
  );
}

// ── Filialga topshirish ─────────────────────────────────────────────────────

const MONEY = cn(CELL, "tabular text-right whitespace-nowrap");

const FILIAL_WIDTH = "w-36 min-w-36 max-w-36 sm:w-48 sm:min-w-48 sm:max-w-48";

function FilialTable({
  sheet,
  handoverDate,
  onHandover,
}: {
  sheet: CashSheet;
  handoverDate: string;
  onHandover: ((target: HandoverTarget) => void) | null;
}) {
  if (sheet.filials.length === 0) {
    return <p className="border-line bg-surface text-ink-muted rounded-2xl border px-4 py-3 text-dense">Bu davrda filialga topshiriladigan pul yo&apos;q.</p>;
  }
  return (
    <SheetScroll label="Filialga topshirish">
      <thead>
        <tr>
          <th scope="col" className={cn(LEAD, FILIAL_WIDTH, "bg-subtle text-ink-muted top-0 z-30 text-meta font-semibold")}>
            Filial
          </th>
          <HeadCell align="right" className="min-w-28">
            Umumiy sotuv
          </HeadCell>
          <HeadCell align="right" className="min-w-28">
            Naqd
          </HeadCell>
          <HeadCell align="right" className="min-w-28">
            Onlayn (karta)
          </HeadCell>
          <HeadCell align="right" className="min-w-24">
            Sovg&apos;a
          </HeadCell>
          <HeadCell align="right" className="min-w-24">
            Skidka
          </HeadCell>
          <HeadCell align="right" className="min-w-28">
            Topshirishi kerak
          </HeadCell>
          <HeadCell align="right" className="min-w-28">
            Topshirgan
          </HeadCell>
          <HeadCell align="right" className="min-w-28">
            Qoldi (qarz)
          </HeadCell>
          <HeadCell className="min-w-36">Holat</HeadCell>
        </tr>
      </thead>
      <tbody>
        {sheet.filials.map((row) => (
          <FilialRow key={row.filial?.id ?? "none"} row={row} handoverDate={handoverDate} onHandover={onHandover} />
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className={cn(LEAD, FILIAL_WIDTH, BLOCK_START, "bg-subtle text-ink text-title font-normal")}>
            Jami
          </th>
          <MoneyCells money={sheet.totals} total />
          <td className={cn(CELL, BLOCK_START, "bg-subtle")} />
        </tr>
      </tfoot>
    </SheetScroll>
  );
}

function FilialRow({
  row,
  handoverDate,
  onHandover,
}: {
  row: CashSheetFilial;
  handoverDate: string;
  onHandover: ((target: HandoverTarget) => void) | null;
}) {
  const handOver =
    onHandover && canHandOver(row)
      ? () => onHandover({ filial: row.filial, toHandOver: row.closingDebt ?? 0, oldestDay: null, date: handoverDate })
      : null;
  return (
    <tr>
      <th scope="row" className={cn(LEAD, FILIAL_WIDTH, "bg-surface font-normal")}>
        {row.filial ? (
          <span className="text-ink block truncate text-body font-bold" data-no-translit title={row.filial.name}>
            {row.filial.name}
          </span>
        ) : (
          <span className="text-ink-muted block text-body font-bold">Filialsiz</span>
        )}
        {row.regions.length > 0 ? <span className="text-ink-muted block text-fine">{regionsText(row.regions)}</span> : null}
      </th>
      <MoneyCells money={row} />
      <td className={cn(CELL, "text-center")}>
        <FilialStatusCell status={filialStatus(row)} filialName={row.filial?.name ?? null} onHandover={handOver} />
      </td>
    </tr>
  );
}

/** Pul kataklari — filial qatori va «Jami» da bir xil tartib. */
function MoneyCells({ money, total = false }: { money: CashSheetMoney; total?: boolean }) {
  const plain = cn(MONEY, total ? cn(BLOCK_START, "bg-subtle text-ink font-bold") : "text-ink");
  return (
    <>
      <td className={cn(plain, "font-bold")}>{moneyText(money.salesAmount)}</td>
      <td className={plain}>{moneyText(money.cashAmount)}</td>
      <td className={plain}>{moneyText(money.onlineAmount)}</td>
      <td className={cn(plain, "text-gold")}>{moneyText(money.giftAmount)}</td>
      <td className={plain}>{moneyText(money.discountAmount)}</td>
      <td className={cn(MONEY, total && BLOCK_START, total ? "bg-brand text-brand-ink" : "bg-brand-soft text-brand", "font-bold")}>
        <span className="block">{moneyText(money.dueTotal)}</span>
        {/* O'tgan qarz alohida ustun emas (maket) — lekin «topshirishi kerak» ichida ekani ko'rinsin. */}
        {money.openingDebt ? <span className="block text-fine font-medium">{`o'tgan qarz ${groupThousands(money.openingDebt)}`}</span> : null}
      </td>
      <td className={cn(plain, "font-semibold")}>
        <span className="block">{moneyText(money.handedOver)}</span>
        {money.confirmed !== null && money.confirmed !== money.handedOver ? (
          <span className="text-ink-faint block text-fine font-normal">{`tasdiqlangan ${groupThousands(money.confirmed)}`}</span>
        ) : null}
      </td>
      <td className={cn(plain, "font-bold", debtTone(money.closingDebt))}>{moneyText(money.closingDebt)}</td>
    </>
  );
}

function debtTone(debt: number | null): string {
  if (debt === null) return "text-ink-faint";
  return debt > 0 ? "text-danger" : "text-ok";
}

const STATUS: Record<NonNullable<FilialStatus>, { label: string; tone: string }> = {
  pending: { label: "tasdiq kutilmoqda", tone: "text-brand" },
  disputed: { label: "kamomad bilan qabul qilindi", tone: "text-danger" },
  done: { label: "✓ topshirildi", tone: "text-ok" },
};

function FilialStatusCell({
  status,
  filialName,
  onHandover,
}: {
  status: FilialStatus;
  filialName: string | null;
  onHandover: (() => void) | null;
}) {
  if (!onHandover && !status) return <span className="text-ink-faint">—</span>;
  return (
    <div className="flex flex-col items-center gap-1">
      {onHandover ? (
        <Button size="sm" className="w-full" onClick={onHandover} aria-label={filialName ? `${filialName}: topshirdim` : undefined}>
          <HandCoins />
          Topshirdim
        </Button>
      ) : null}
      {status ? <span className={cn("text-meta font-semibold", STATUS[status].tone)}>{STATUS[status].label}</span> : null}
    </div>
  );
}

function CashSheetSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Yuklanmoqda">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}
