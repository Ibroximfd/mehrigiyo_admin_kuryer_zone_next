import { PIECE_UNIT } from "@/lib/item-ref";
import { cn } from "@/lib/utils";

import { cellText, signedCellText } from "../display";
import { cellOf, isZeroCell } from "../types";
import type { CellMap, SheetProduct } from "../types";

/**
 * Sotuv jadvali va berish rejasining umumiy jadval bo'laklari (egasi Google
 * Sheet'i ko'rinishida): kuryer — blok, mahsulot — ustun, qatorlar rangli.
 * Chegaralar katakda (`border-separate`): yopishgan sarlavha va kuryer ustuni
 * siljiganda chizig'ini o'zi bilan olib yuradi.
 */

/** Qator rangi — ma'nosi yorliqda ham yozilgan (rang yagona signal emas). */
export type RowTone = "plain" | "ok" | "gold" | "danger" | "brand" | "warn" | "muted";

const ROW_TONE: Record<RowTone, string> = {
  plain: "bg-surface text-ink",
  ok: "bg-ok-soft text-ok font-semibold",
  gold: "bg-gold-soft text-gold",
  danger: "bg-danger-soft text-danger font-bold",
  brand: "bg-brand-soft text-brand font-bold",
  warn: "bg-warn-soft text-warn font-bold",
  muted: "bg-subtle text-ink-muted",
};

/** Blokning birinchi qatori — kuryerlar orasidagi qalin chiziq. */
export const BLOCK_START = "border-t-2 border-t-line-strong";

/** Oddiy katak; `rowSpan` li o'ng kataklar ham shundan boshlanadi. */
export const CELL = "border-line border-b border-l px-2 py-2 align-middle";

const HEAD = "border-line bg-subtle text-ink-muted sticky top-0 z-20 border-b px-2 py-2.5 align-middle text-meta font-semibold";

/** Kuryer ustuni — chapda yopishgan; kengligi qat'iy (yorliq ustuni shu masofada yopishadi). */
const LEAD_WIDTH = "w-28 min-w-28 max-w-28 sm:w-40 sm:min-w-40 sm:max-w-40";

/** Qator yorlig'i ustuni — keng ekranda kuryer ustunidan keyin yopishadi (telefonda joy tor — siljiydi). */
const LABEL_LEFT = "sm:left-40";

/**
 * Siljiydigan karta: telefonda ham jadval bo'lib qoladi — ikki tomonga
 * siljiydi. Balandlik chegarali: sarlavha yopishishi uchun siljish kartaning
 * o'zida bo'lishi shart.
 */
export function SheetScroll({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="border-line bg-surface scrollbar-thin focus-visible:ring-brand/45 max-h-120 overflow-auto rounded-2xl border outline-none focus-visible:ring-2 sm:max-h-160"
    >
      <table className="w-full border-separate border-spacing-0 text-dense">{children}</table>
    </div>
  );
}

/** Sarlavha qatorining boshi: «Kuryer» (burchak — ikki tomonga yopishgan) va qator yorlig'i ustuni. */
export function LeadHeads({ lead, label }: { lead: string; label: string }) {
  return (
    <>
      <th scope="col" className={cn(HEAD, LEAD_WIDTH, "left-0 z-30 border-r px-3 text-left")}>
        {lead}
      </th>
      <th scope="col" className={cn(HEAD, LABEL_LEFT, "min-w-24 text-left sm:z-30")}>
        {label}
      </th>
    </>
  );
}

export function HeadCell({ children, align = "center", className }: { children: React.ReactNode; align?: "center" | "right"; className?: string }) {
  return (
    <th scope="col" className={cn(HEAD, "border-l", align === "right" ? "text-right" : "text-center", className)}>
      {children}
    </th>
  );
}

/** Mahsulot ustunlari: nom ko'pi bilan ikki qator (to'lig'i `title` da); birlik faqat «dona» bo'lmasa. */
export function ProductHeads({ products }: { products: readonly SheetProduct[] }) {
  return (
    <>
      {products.map((product) => (
        <HeadCell key={product.id} className="min-w-16">
          <span className="text-ink mx-auto line-clamp-2 max-w-24 break-words" data-no-translit title={product.name}>
            {product.name}
          </span>
          {product.unitLabel !== PIECE_UNIT ? <span className="block text-fine font-normal">{product.unitLabel}</span> : null}
        </HeadCell>
      ))}
    </>
  );
}

/** Blok boshi (kuryer yoki «JAMI») — hamma qatoriga cho'zilgan, chapda yopishgan. */
export function LeadCell({
  rowSpan,
  children,
  className,
}: {
  rowSpan: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="rowgroup"
      rowSpan={rowSpan}
      className={cn("border-line bg-surface sticky left-0 z-10 border-r border-b px-3 py-2 text-left align-middle font-normal", LEAD_WIDTH, BLOCK_START, className)}
    >
      {children}
    </th>
  );
}

export function RowLabel({ tone, start = false, children }: { tone: RowTone; start?: boolean; children: React.ReactNode }) {
  return (
    <th
      scope="row"
      className={cn("border-line border-b px-2 py-2 text-left text-meta whitespace-nowrap sm:sticky sm:z-10", LABEL_LEFT, ROW_TONE[tone], start && BLOCK_START)}
    >
      {children}
    </th>
  );
}

/**
 * Bir qatorning mahsulot kataklari. `zero`: `blank` — nol katak bo'sh (berilgan,
 * sotilgan…), `show` — «0» (qoldiq: «hech narsa qolmadi» ham ma'lumot).
 */
export function QtyCells({
  cells,
  products,
  tone,
  zero = "blank",
  signed = false,
  start = false,
  titleOf,
}: {
  cells: CellMap;
  products: readonly SheetProduct[];
  tone: RowTone;
  zero?: "blank" | "show";
  /** Ishorali harakat («+3», «−2») — tuzatish va qaytarish qatori. */
  signed?: boolean;
  start?: boolean;
  /** Katak izohi (`title`) — masalan, «berilgan» ning tarkibi. */
  titleOf?: (productId: number) => string | undefined;
}) {
  return (
    <>
      {products.map((product) => {
        const cell = cellOf(cells, product.id);
        const empty = isZeroCell(cell);
        return (
          <td
            key={product.id}
            title={empty ? undefined : titleOf?.(product.id)}
            className={cn(CELL, "tabular px-1.5 text-center whitespace-nowrap", ROW_TONE[tone], start && BLOCK_START)}
          >
            {empty ? (zero === "show" ? "0" : null) : signed ? signedCellText(cell) : cellText(cell)}
          </td>
        );
      })}
    </>
  );
}
