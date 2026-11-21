"use client";

import { ArrowUpFromLine, LoaderCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { documentError } from "@/features/sklad/components/courier-document-dialog";
import type { SkladStockRow } from "@/features/sklad/types";
import { groupThousands } from "@/lib/format";
import { shownQuantity } from "@/lib/item-ref";
import { cn } from "@/lib/utils";

import { cellText } from "../display";
import { draftCount, issueDefaults, planIssueLines, toStockQuantity } from "../issue-draft";
import { cellOf } from "../types";
import type { CourierRef, PlanCourier, SheetProduct } from "../types";
import { useGiveToCourier } from "../use-give-to-courier";
import { RowLabel, qtyCellClass } from "./sheet-table";

/** Bugun mol berish uchun sklad: qaysi ombordan va undagi qoldiq (sklad birligida). */
export type GiveSource = { locationId: number; stock: readonly SkladStockRow[] };

/**
 * «Berish kerak» qatori — kuryer blokida, uzun qator (egasi, 2026-11-20): har
 * mahsulotda zakazlarga yetishi uchun yana nechta berish kerakligi (serverning
 * `to_issue` i) maydonda yozilgan. «Berish» — hammasi shu sonlar bilan darhol
 * beriladi; birining sonini o'zgartirib (yoki o'chirib, yoki yangisini yozib)
 * bosilsa — o'shancha. Omborda yetmasa ham beriladi (hujjat 90).
 * Qator va tugma har doim ochiq (egasi, 2026-11-21): hamma son 0 bo'lsa ham
 * bosh kuryer kerakli sonni yozib beradi; son yozilmagan bo'lsa — eslatma.
 * «Berish kerak» dan ko'p berish cheklanmaydi (kuryer qo'lida zaxira yuradi) —
 * maydon faqat skladda (omborda) qoldiq yetmasa qizil bo'ladi.
 */
export function IssueRowCells({
  courier,
  issue,
  products,
  source,
  start,
}: {
  courier: CourierRef;
  issue: PlanCourier | null;
  products: readonly SheetProduct[];
  source: GiveSource;
  start: boolean;
}) {
  const defaults = useMemo(() => issueDefaults(issue, products), [issue, products]);
  const [edited, setEdited] = useState<Record<number, string>>({});
  const give = useGiveToCourier();

  const textOf = (id: number) => edited[id] ?? (defaults[id] ? String(defaults[id]) : "");
  const counts = Object.fromEntries(products.map((product) => [product.id, draftCount(textOf(product.id))]));
  const rowOf = (id: number) => source.stock.find((row) => row.item.id === id);
  const plan = planIssueLines(products, counts, defaults, issue?.issueLines ?? [], (id) => rowOf(id)?.item);

  const submit = () => {
    if (give.isPending) return;
    if (plan.invalid.length > 0) {
      toast.error("Qizil maydondagi sonni tuzating — skladga butun karobka bo'lib yoziladi");
      return;
    }
    if (plan.lines.length === 0) {
      toast.info("Avval nimadan nechta berishni yozing");
      return;
    }
    const summary = products
      .filter((product) => (counts[product.id] ?? 0) > 0)
      .map((product) => `${product.name} — ${groupThousands(counts[product.id] ?? 0)}`)
      .join(", ");
    give.mutate(
      { locationId: source.locationId, courierId: courier.id, lines: plan.lines },
      {
        onSuccess: (negative) => {
          setEdited({});
          toast.success(`${courier.fullName}: mol berildi`, { description: summary });
          if (negative.length > 0) toast.warning("Omborda qoldiq minusga tushdi — logistdan mol so'rang");
        },
        onError: (error) => toast.error(documentError(error)),
      },
    );
  };

  return (
    <>
      <RowLabel tone="brand" start={start}>
        <span className="block">Berish kerak</span>
        <Button size="xs" className="mt-1" disabled={give.isPending} aria-label={`${courier.fullName}: berish`} onClick={submit}>
          {give.isPending ? <LoaderCircle className="animate-spin" /> : <ArrowUpFromLine />}
          Berish
        </Button>
      </RowLabel>
      {products.map((product) => {
        const count = counts[product.id] ?? 0;
        const row = rowOf(product.id);
        const quantity = count > 0 ? toStockQuantity(product, row?.item, count) : 0;
        const invalid = plan.invalid.includes(product.id);
        const short = !invalid && quantity !== null && row !== undefined && quantity > row.inSklad;
        const required = issue ? cellText(cellOf(issue.required, product.id), product) : "0";
        const onHand = issue ? cellText(cellOf(issue.onHand, product.id), product) : "0";
        const hint =
          short && row
            ? `Zakazlarga kerak ${required}, qo'lida ${onHand}, omborda ${groupThousands(shownQuantity(row.item, row.inSklad))} — yetmaydi`
            : `Zakazlarga kerak ${required}, qo'lida ${onHand}`;
        return (
          <td key={product.id} className={cn(qtyCellClass("brand", start), "px-1 py-1.5")} title={hint}>
            <input
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-label={`${courier.fullName}: ${product.name}, berish`}
              aria-invalid={invalid ? true : undefined}
              value={textOf(product.id)}
              disabled={give.isPending}
              onFocus={(event) => event.target.select()}
              onChange={(event) => setEdited((current) => ({ ...current, [product.id]: event.target.value.replace(/\D/g, "") }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              className={cn(inputClass, "tabular h-8 w-14 px-1 text-center font-semibold", (invalid || short) && "border-danger")}
            />
          </td>
        );
      })}
    </>
  );
}
