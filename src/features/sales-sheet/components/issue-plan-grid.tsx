"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { oneOffHref } from "@/lib/filter-memory";
import { groupThousands } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { filledCells } from "../display";
import type { IssuePlan, PlanCourier, SheetProduct } from "../types";
import { BLOCK_START, CELL, HeadCell, LeadCell, LeadHeads, ProductHeads, QtyCells, RowLabel, SheetScroll } from "./sheet-table";
import type { RowTone } from "./sheet-table";

const COURIER_ROWS: ReadonlyArray<{ key: "onHand" | "required" | "toIssue" | "surplus"; label: string; tone: RowTone }> = [
  { key: "onHand", label: "Qo'lida (qoldiq)", tone: "danger" },
  { key: "required", label: "Zakazlarga kerak", tone: "plain" },
  { key: "toIssue", label: "Yana berish kerak", tone: "brand" },
  { key: "surplus", label: "Ortiqcha", tone: "gold" },
];

const STORE_ROWS: ReadonlyArray<{ key: "toIssue" | "onHand" | "shortage"; label: string; tone: RowTone }> = [
  { key: "toIssue", label: "Yana berish kerak", tone: "brand" },
  { key: "onHand", label: "Omboringizda bor", tone: "plain" },
  { key: "shortage", label: "Yetmaydi", tone: "warn" },
];

/**
 * Berish rejasi jadvali (hujjat 83 §4): kuryer — blok, to'rt qator; pastda
 * bosh kuryer ombori bo'yicha jami. Hamma katak serverdan (`to_issue`,
 * `surplus`, `shortage` — donaga keltirib hisoblangan), bu yerda faqat chiziladi.
 */
export function IssuePlanGrid({ plan, canOpenSklad }: { plan: IssuePlan; canOpenSklad: boolean }) {
  return (
    <SheetScroll label="Berish rejasi">
      <thead>
        <tr>
          <LeadHeads lead="Kuryer" label="Qator" />
          <ProductHeads products={plan.products} />
          <HeadCell className="min-w-40">Amal</HeadCell>
        </tr>
      </thead>
      {plan.couriers.map((row) => (
        <tbody key={row.courier.id}>
          {COURIER_ROWS.map((line, index) => (
            <tr key={line.key}>
              {index === 0 ? (
                <LeadCell rowSpan={COURIER_ROWS.length}>
                  <span className="text-ink block truncate text-body font-bold" data-no-translit title={row.courier.fullName}>
                    {row.courier.fullName}
                  </span>
                  <span className="text-ink-muted block text-fine">{`Kechadan o'tgan: ${groupThousands(row.carriedOrders)} ta zakaz`}</span>
                  <span className="text-ink-muted block text-fine">{`Yangi biriktirilgan: ${groupThousands(row.newOrders)} ta zakaz`}</span>
                </LeadCell>
              ) : null}
              <RowLabel tone={line.tone} start={index === 0}>
                {line.label}
              </RowLabel>
              {/* Qoldiq qatorida nol ham yoziladi — «qo'lida yo'q» ham ma'lumot. */}
              <QtyCells cells={row[line.key]} products={plan.products} tone={line.tone} zero={line.key === "onHand" ? "show" : "blank"} start={index === 0} />
              {index === 0 ? (
                <td rowSpan={COURIER_ROWS.length} className={cn(CELL, BLOCK_START, "bg-surface px-3 text-center")}>
                  <IssueAction row={row} products={plan.products} canOpenSklad={canOpenSklad} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      ))}
      <tfoot>
        {STORE_ROWS.map((line, index) => (
          <tr key={line.key}>
            {index === 0 ? (
              <LeadCell rowSpan={STORE_ROWS.length} className="bg-subtle">
                <span className="text-ink block text-title">JAMI</span>
                <span className="text-ink-muted block text-fine">{`${plan.couriers.length} ta kuryer`}</span>
              </LeadCell>
            ) : null}
            <RowLabel tone={line.tone} start={index === 0}>
              {line.label}
            </RowLabel>
            <QtyCells cells={plan.store[line.key]} products={plan.products} tone={line.tone} zero={line.key === "onHand" ? "show" : "blank"} start={index === 0} />
            {index === 0 ? <td rowSpan={STORE_ROWS.length} className={cn(CELL, BLOCK_START, "bg-subtle")} /> : null}
          </tr>
        ))}
      </tfoot>
    </SheetScroll>
  );
}

/**
 * Kuryer blokining amali. Mol berish sklad sahifasidagi «Berish» oynasida
 * qilinadi (mavjud `courier_load` hujjati): shu yerdan o'tiladi, sonlar o'sha
 * oynada kiritiladi. Sklad dopuski yo'q bo'lsa — faqat ko'rish.
 */
function IssueAction({ row, products, canOpenSklad }: { row: PlanCourier; products: readonly SheetProduct[]; canOpenSklad: boolean }) {
  const kinds = filledCells(row.toIssue, products).length;
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      {kinds > 0 ? (
        <>
          <span className="text-ink-muted text-meta">
            Berish: <strong className="text-ink font-semibold">{`${kinds} xil mahsulot`}</strong>
          </span>
          {canOpenSklad ? (
            <Button asChild size="sm">
              <Link href={ROUTES.sklad} aria-label={`${row.courier.fullName}: skladda berish`}>
                Skladda berish
                <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </>
      ) : (
        <span className="text-ink-faint text-meta">Berish shart emas</span>
      )}
      <Link
        href={oneOffHref(ROUTES.orders, { scope: "active", courier: row.courier.id })}
        className="text-brand text-fine font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Zakazlarini ko&apos;rish
      </Link>
    </div>
  );
}
