"use client";

import { ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, TriangleAlert, Warehouse } from "lucide-react";

import { ProductThumb } from "@/components/kit/product-thumb";
import { Button } from "@/components/ui/button";
import { groupThousands } from "@/lib/format";
import { PIECE_UNIT, type ItemRef } from "@/lib/item-ref";
import { cn } from "@/lib/utils";

import type { CourierStockLine, CourierStockMatrix, StockMatrixLine } from "../courier-stock-matrix";
import type { CourierStock } from "../types";
import type { CourierDocumentMode } from "./courier-document-dialog";

export type CourierStockAction = (mode: CourierDocumentMode, courier: CourierStock) => void;

// Chegaralar katakda (`border-separate`): yopishgan sarlavha va birinchi ustun
// siljiganda chizig'ini o'zi bilan olib yuradi — `collapse` da chiziq jadvalda qoladi.
const HEAD = "border-line bg-surface sticky top-0 z-10 border-b px-3 py-2.5 text-right align-bottom font-medium";
const CELL = "border-line tabular border-b px-3 py-2.5 text-right";
const LEAD = "border-line sticky left-0 z-10 border-r border-b px-3 py-2.5 text-left font-normal sm:px-4";
// «Amallar» keng ekranda o'ng chetga yopishadi: mahsulot ko'p bo'lsa ham tugmalar ko'z oldida.
const ACTIONS = "border-l pr-4 lg:sticky lg:right-0 lg:z-10";

/**
 * Kuryerlar ombori — jadval (egasi so'rovi 2026-11-18, Google Sheet kabi): kim
 * qaysi mahsulotdan qancha ushlab turgani bir qarashda, amallar shu qatorda.
 * Telefonda ham jadval bo'lib qoladi — karta ichida ikki tomonga siljiydi,
 * sarlavha va kuryer ustuni joyida turadi. `onAction: null` — `can_write` yo'q:
 * «Amallar» ustuni umuman chizilmaydi.
 */
export function CourierStockTable({ matrix, onAction }: { matrix: CourierStockMatrix; onAction: CourierStockAction | null }) {
  return (
    <>
      {matrix.negativeCount > 0 ? (
        <p role="status" className="bg-danger-soft text-danger flex items-start gap-2 rounded-xl px-3 py-2 text-meta font-medium">
          <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" />
          {`${matrix.negativeCount} ta katakda qoldiq minus — «Tuzatish» kerak`}
        </p>
      ) : null}
      {/* Balandlik chegarali: sarlavha yopishishi uchun siljish kartaning o'zida bo'lishi shart. */}
      <div
        role="region"
        aria-label="Kuryerlar ombori"
        tabIndex={0}
        className="border-line bg-surface scrollbar-thin focus-visible:ring-brand/45 max-h-120 overflow-auto rounded-2xl border outline-none focus-visible:ring-2 sm:max-h-160"
      >
        <table className="w-full border-separate border-spacing-0 text-dense">
          <thead>
            <tr className="text-ink-faint text-meta">
              <th scope="col" className={cn(HEAD, "left-0 z-20 border-r text-left sm:px-4")}>Kuryer</th>
              {matrix.products.map((product) => (
                <ProductHead key={product.id} product={product} />
              ))}
              <th scope="col" className={cn(HEAD, "border-l")}>Jami</th>
              {onAction ? <th scope="col" className={cn(HEAD, ACTIONS, "lg:z-20")}>Amallar</th> : null}
            </tr>
          </thead>
          <tbody>
            {matrix.store ? (
              <tr className="bg-brand-soft">
                <th scope="row" className={cn(LEAD, "bg-brand-soft")}>
                  <span className="text-ink flex items-center gap-1.5 font-semibold">
                    <Warehouse aria-hidden className="text-brand size-4 shrink-0" />
                    Omborim
                  </span>
                  <span className="text-ink-muted text-meta">
                    {matrix.store.kinds > 0 ? `${matrix.store.kinds} xil mahsulot` : "Skladda mahsulot yo'q"}
                  </span>
                </th>
                <QuantityCells line={matrix.store} products={matrix.products} />
                {onAction ? <td className={cn(CELL, ACTIONS, "bg-brand-soft")} /> : null}
              </tr>
            ) : null}
            {matrix.rows.map((row) => (
              <tr key={row.stock.courier.id} className="group hover:bg-subtle">
                <th scope="row" className={cn(LEAD, "bg-surface group-hover:bg-subtle")}>
                  <span className="text-ink block w-28 truncate font-semibold sm:w-44" data-no-translit title={row.stock.courier.fullName}>
                    {row.stock.courier.fullName}
                  </span>
                  <span className="text-ink-faint text-meta">{row.kinds > 0 ? `${row.kinds} xil mahsulot` : "Qo'lida mol yo'q"}</span>
                </th>
                <QuantityCells line={row} products={matrix.products} />
                {onAction ? (
                  <td className={cn(CELL, ACTIONS, "bg-surface group-hover:bg-subtle")}>
                    <RowActions row={row} onAction={onAction} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-subtle">
              <th scope="row" className={cn(LEAD, "bg-subtle border-b-0")}>
                <span className="text-ink block font-semibold">Jami</span>
                <span className="text-ink-faint text-meta">Kuryerlarda</span>
              </th>
              <QuantityCells line={matrix.totals} products={matrix.products} className="border-b-0 font-semibold" />
              {onAction ? <td className={cn(CELL, ACTIONS, "bg-subtle border-b-0")} /> : null}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

/** Ustun sarlavhasi: rasm + nom (ko'pi bilan ikki qator, to'lig'i `title` da); birlik faqat «dona» bo'lmasa. */
function ProductHead({ product }: { product: ItemRef }) {
  return (
    <th scope="col" className={cn(HEAD, "px-2 text-center")}>
      {/* Rasm tepada, nom ostida: ustun tor — bir ekranga ko'proq mahsulot sig'adi (sheet kabi). */}
      <span className="mx-auto flex w-20 flex-col items-center gap-1">
        <ProductThumb src={product.image} name={product.name} size="sm" className="size-6" />
        <span className="text-ink text-fine line-clamp-2 leading-tight break-words" data-no-translit title={product.name}>
          {product.name}
        </span>
        {product.unitLabel !== PIECE_UNIT ? <span className="text-fine font-normal">{product.unitLabel}</span> : null}
      </span>
    </th>
  );
}

/** Mahsulot kataklari va qator yig'indisi («Jami» ustuni). */
function QuantityCells({
  line,
  products,
  className,
}: {
  line: Pick<StockMatrixLine, "cells" | "total">;
  products: readonly ItemRef[];
  className?: string;
}) {
  return (
    <>
      {products.map((product, column) => (
        <td key={product.id} className={cn(CELL, "px-2 text-center", className)}>
          <Quantity value={line.cells[column] ?? 0} />
        </td>
      ))}
      <td className={cn(CELL, "border-l font-semibold", line.total < 0 ? "text-danger" : "text-ink", className)}>
        {groupThousands(line.total)}
      </td>
    </>
  );
}

/** 0 — bo'sh katak (xira nuqta); minus — ma'lumot xatosi, qizil va qalin. */
function Quantity({ value }: { value: number }) {
  if (value === 0) return <span aria-hidden className="text-ink-faint">·</span>;
  return <span className={value < 0 ? "text-danger font-bold" : "text-ink"}>{groupThousands(value)}</span>;
}

function RowActions({ row, onAction }: { row: CourierStockLine; onAction: CourierStockAction }) {
  const { stock } = row;
  const name = stock.courier.fullName;
  // Yig'indi emas, xil soni: +3 va −3 yig'indisi 0, lekin minus katak baribir tuzatilishi kerak.
  const holdsNothing = row.kinds === 0;
  return (
    <span className="flex justify-end gap-1.5">
      <Button size="sm" variant="outline" aria-label={`${name}: berish`} title="Berish" onClick={() => onAction("courier_load", stock)}>
        <ArrowUpFromLine />
        <span className="hidden 2xl:inline">Berish</span>
      </Button>
      <Button size="sm" variant="outline" aria-label={`${name}: qabul`} title="Qabul" disabled={holdsNothing} onClick={() => onAction("courier_return", stock)}>
        <ArrowDownToLine />
        <span className="hidden 2xl:inline">Qabul</span>
      </Button>
      <Button size="sm" variant="ghost" aria-label={`${name}: tuzatish`} title="Tuzatish" disabled={holdsNothing} onClick={() => onAction("adjustment", stock)}>
        <SlidersHorizontal />
        <span className="hidden 2xl:inline">Tuzatish</span>
      </Button>
    </span>
  );
}
