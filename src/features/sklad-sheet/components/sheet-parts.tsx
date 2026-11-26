import { groupThousands } from "@/lib/format";
import { PIECE_UNIT } from "@/lib/item-ref";
import { columnUnit, isZeroQty, qtyText, signedQtyText } from "@/lib/qty-cell";
import { cn } from "@/lib/utils";

import type { SheetTone } from "../day-sheet";
import { cellOf } from "../types";
import type { SkladFlow, SkladProduct } from "../types";

/**
 * Sklad jadvallarining umumiy bo'laklari (egasi Google Sheet'i ko'rinishida):
 * mahsulot — ustun, qatorlar rangli. Chegaralar katakda (`border-separate`):
 * yopishgan ustun siljiganda chizig'ini o'zi bilan olib yuradi.
 */

/** Qator rangi — ma'nosi yorliqda ham yozilgan (rang yagona signal emas). */
export const ROW_TONE: Record<SheetTone, string> = {
  stock: "bg-amber-line text-ink font-bold",
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  okStrong: "bg-ok-soft text-ok font-bold",
  gift: "bg-surface text-gold",
  giftStrong: "bg-gold-soft text-gold font-bold",
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn font-bold",
  info: "bg-info-soft text-info",
};

/** Blok boshi — qalin chiziq (hudud × kuryer, kun, jami). */
export const BLOCK_START = "border-t-2 border-t-line-strong";

export const HEAD = "border-line bg-subtle text-ink-muted border-b px-2 py-2.5 align-middle text-meta font-semibold";

export const CELL = "border-line border-b border-l px-1.5 py-2 align-middle";

/**
 * Siljiydigan karta: telefonda ham jadval bo'lib qoladi — yonga siljiydi.
 * Balandlik cheklanmaydi: jadval sahifa bo'ylab to'liq ochiladi (egasi,
 * 2026-11-18). Yon tomonga — Shift + g'ildirak yoki trackpad (2026-11-26).
 */
export function SheetScroll({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="border-line bg-surface scrollbar-thin focus-visible:ring-brand/45 overflow-x-auto rounded-2xl border outline-none focus-visible:ring-2"
    >
      <table className="w-full border-separate border-spacing-0 text-dense">{children}</table>
    </div>
  );
}

/** Mahsulot ustunlari: nom ko'pi bilan ikki qator (to'lig'i `title` da); birlik faqat «dona» bo'lmasa. */
export function ProductHeads({ products }: { products: readonly SkladProduct[] }) {
  return (
    <>
      {products.map((product) => {
        const unit = columnUnit(product);
        return (
          <th key={product.id} scope="col" className={cn(HEAD, "min-w-16 border-l text-center")}>
            <span className="text-ink mx-auto line-clamp-2 max-w-24 break-words" data-no-translit title={product.name}>
              {product.name}
            </span>
            {unit !== PIECE_UNIT ? <span className="block text-fine font-normal">{unit}</span> : null}
          </th>
        );
      })}
    </>
  );
}

/**
 * Bir qatorning mahsulot kataklari va summasi. `zero`: `blank` — nol katak bo'sh
 * (sotuv, sovg'a…), `show` — «0» (qoldiq). `signed` — tuzatish: «+3», «−2».
 * `flow: null` (javobda blok yo'q) — har katak «—»: son o'ylab topilmaydi.
 */
export function FlowCells({
  flow,
  products,
  tone,
  zero = "blank",
  signed = false,
  className,
}: {
  flow: SkladFlow | null;
  products: readonly SkladProduct[];
  tone: SheetTone;
  zero?: "blank" | "show";
  signed?: boolean;
  className?: string;
}) {
  return (
    <>
      {products.map((product) => {
        const cell = flow ? cellOf(flow.items, product.id) : undefined;
        const empty = !cell || isZeroQty(cell);
        return (
          <td key={product.id} className={cn(CELL, "tabular text-center whitespace-nowrap", ROW_TONE[tone], className)}>
            {!flow ? MISSING : empty ? (zero === "show" ? "0" : null) : signed ? signedQtyText(cell, product) : qtyText(cell, product)}
          </td>
        );
      })}
      <td className={cn(CELL, "tabular px-3 text-right font-bold whitespace-nowrap", ROW_TONE[tone], className)}>
        {flow?.amount == null ? MISSING : signed ? signedMoney(flow.amount) : groupThousands(flow.amount)}
      </td>
    </>
  );
}

/** Server bermagan son. */
export const MISSING = "—";

/** Ishorali summa: «+1 200 000», «−600 000», nol — «0». */
function signedMoney(amount: number): string {
  if (amount === 0) return "0";
  return `${amount < 0 ? "−" : "+"}${groupThousands(Math.abs(amount))}`;
}
