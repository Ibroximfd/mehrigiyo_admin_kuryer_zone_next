"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Warehouse } from "lucide-react";

import { KeyFigures, Section } from "@/components/kit/key-figures";
import { EmptyView } from "@/components/kit/state-views";
import { groupThousands } from "@/lib/format";
import { cn } from "@/lib/utils";

import { buildCurrentStock, linesFromCurrent, linesFromSklad } from "../current-stock";
import type { CurrentStockModel, SkladStockFallback, StockTone } from "../current-stock";
import type { SkladSheet } from "../types";
import { HEAD, SheetScroll } from "./sheet-parts";

const CELL_TONE: Record<StockTone, string> = {
  plain: "",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

const LEAD = "border-line bg-surface sticky left-0 z-10 border-r border-b px-3 py-2.5 text-left whitespace-nowrap sm:px-4";

/**
 * Hozirgi qoldiq manbasi: javobdagi `current` (vaqtinchalik — oldingi kun
 * javobi ham bo'ladi: u sanaga bog'liq emas). Blok hali yo'q, so'rov ketmoqda
 * yoki yiqilgan (endpoint chiqmagan) — sahifa allaqachon yuklagan sklad
 * qoldig'i: kun almashganda jadval skeletga sakramaydi.
 */
export function selectCurrentStock(query: UseQueryResult<SkladSheet>, fallback: readonly SkladStockFallback[]): CurrentStockModel {
  const sheet = query.data;
  return buildCurrentStock(sheet?.current ? linesFromCurrent(sheet.products, sheet.current) : linesFromSklad(fallback));
}

/** Asosiy raqamlar va «Hozirgi qoldiq» jadvali. */
export function CurrentStockPanel({ model }: { model: CurrentStockModel }) {
  return (
    <>
      <KeyFigures
        items={[
          // Yig'indida birliklar aralash (dona va karobka mahsulotlari) — birlik nomi yozilmaydi.
          { label: "Omborda", value: groupThousands(model.storeTotal) },
          { label: "Kuryerlarda", value: groupThousands(model.couriersTotal) },
          { label: "Mahsulot turi", value: groupThousands(model.columns.length) },
          { label: "Kam qolgan", value: groupThousands(model.lowCount), tone: model.lowCount > 0 ? "warn" : "default" },
        ]}
      />
      <Section title="Hozirgi qoldiq" description="Sariq — minimaldan kam · qizil — tugagan yoki minus">
        {model.columns.length === 0 ? (
          <EmptyView
            Icon={Warehouse}
            title="Skladda mahsulot yo'q"
            description="Logist kirim qilgach shu yerda ko'rinadi."
            className="border-line bg-surface rounded-2xl border"
          />
        ) : (
          <CurrentStockTable model={model} />
        )}
      </Section>
    </>
  );
}

function CurrentStockTable({ model }: { model: CurrentStockModel }) {
  return (
    <SheetScroll label="Hozirgi qoldiq">
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD, "bg-subtle sticky left-0 z-10 border-r px-3 text-left sm:px-4")}>
            Qayerda
          </th>
          {model.columns.map((column) => (
            <th key={column.id} scope="col" className={cn(HEAD, "min-w-16 border-l text-center")}>
              <span className="text-ink mx-auto line-clamp-2 max-w-24 break-words" data-no-translit title={column.name}>
                {column.name}
              </span>
              {column.unit ? <span className="block text-fine font-normal">{column.unit}</span> : null}
            </th>
          ))}
          <th scope="col" className={cn(HEAD, "border-l px-3 text-right")}>
            Jami
          </th>
        </tr>
      </thead>
      <tbody>
        {model.rows.map((row) => {
          const strong = row.key === "total";
          return (
            <tr key={row.key} className={cn(strong && "bg-subtle")}>
              <th scope="row" className={cn(LEAD, strong ? "bg-subtle text-ink font-bold" : "text-ink font-medium")}>
                {row.label}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={model.columns[index]?.id ?? index}
                  className={cn(
                    "border-line tabular border-b border-l px-1.5 py-2.5 text-center whitespace-nowrap",
                    strong && "font-bold",
                    CELL_TONE[cell.tone],
                  )}
                >
                  {cell.text}
                </td>
              ))}
              <td className="border-line text-ink tabular border-b border-l px-3 py-2.5 text-right font-bold whitespace-nowrap">
                {groupThousands(row.total)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </SheetScroll>
  );
}
