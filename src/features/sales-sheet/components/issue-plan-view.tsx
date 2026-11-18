"use client";

import { PackageOpen, TriangleAlert } from "lucide-react";

import { KeyFigures } from "@/components/kit/key-figures";
import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import { groupThousands, todayIso } from "@/lib/format";

import { cellText, filledCells } from "../display";
import { dayTitle } from "../period";
import { cellOf } from "../types";
import type { IssuePlan, PlanCourier } from "../types";
import { useIssuePlan } from "../use-sales-sheet";
import { IssuePlanGrid } from "./issue-plan-grid";
import { SheetQueryState } from "./sheet-query-state";

/**
 * «Berish rejasi» tabi (hujjat 83 §4): kuryer qo'lida nima bor, zakazlariga
 * nima kerak va yana nechta berish kerak. Reja kuni — bugun (ertasi kuni
 * ertalab ochiladigan ekran). `canOpenSklad` — sklad dopuski bo'lsa «berish»
 * sklad sahifasiga olib boradi.
 */
export function IssuePlanView({ canOpenSklad }: { canOpenSklad: boolean }) {
  const plan = useIssuePlan(todayIso());
  return (
    <SheetQueryState
      query={plan}
      deniedTitle="Berish rejasi sizga ochilmagan"
      missingTitle="Berish rejasi — server hali chiqarmagan"
      skeleton={
        <div className="flex flex-col gap-4" aria-label="Yuklanmoqda">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      }
    >
      {(data) =>
        data.couriers.length === 0 ? (
          <EmptyView
            Icon={PackageOpen}
            title="Bugunga berish rejasi yo'q"
            description="Kuryerlaringizda yetkazilmagan zakaz ham, qoldiq ham yo'q. Zakaz biriktirilgach reja shu yerda chiqadi."
            className="border-line bg-surface rounded-2xl border"
          />
        ) : (
          <IssuePlanBody plan={data} canOpenSklad={canOpenSklad} />
        )
      }
    </SheetQueryState>
  );
}

/**
 * Zakaz sonlari yig'indisi — pul ham, mol ham emas: server rejada `totals`
 * bermaydi (§4). Mahsulot bo'yicha jami esa serverdan (`store`) — qo'shilmaydi.
 */
function orderTotals(couriers: readonly PlanCourier[]): { carried: number; fresh: number } {
  return {
    carried: couriers.reduce((sum, row) => sum + row.carriedOrders, 0),
    fresh: couriers.reduce((sum, row) => sum + row.newOrders, 0),
  };
}

export function IssuePlanBody({ plan, canOpenSklad }: { plan: IssuePlan; canOpenSklad: boolean }) {
  const orders = orderTotals(plan.couriers);
  // «N xil mahsulot» — noldan farqli kataklar soni: birliklar aralash (dona va karobka), miqdorlar qo'shilmaydi.
  const issueKinds = filledCells(plan.store.toIssue, plan.products).length;
  const shortKinds = filledCells(plan.store.shortage, plan.products).length;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-ink text-lg2 font-semibold">{`Berish rejasi — ${dayTitle(plan.date || todayIso())}`}</h2>
        <p className="text-ink-muted mt-0.5 text-meta">Kuryer qo&apos;lida nima bor, zakazlariga nima kerak va yana nechta berish kerak.</p>
      </div>
      <KeyFigures
        items={[
          { label: "Kechadan o'tgan zakazlar", value: groupThousands(orders.carried), hint: "yetkazilmay qolgan" },
          { label: "Yangi biriktirilgan", value: groupThousands(orders.fresh), hint: "reja kunidagi zakazlar" },
          { label: "Yana berish kerak", value: `${issueKinds} xil mahsulot`, hint: "omboringizdan kuryerlarga" },
          {
            label: "Omborda yetmaydi",
            value: `${shortKinds} xil mahsulot`,
            hint: shortKinds > 0 ? "logistdan mol so'rang" : "hammasi yetadi",
            tone: shortKinds > 0 ? "warn" : "ok",
          },
        ]}
      />
      <ShortageBanner plan={plan} />
      <IssuePlanGrid plan={plan} canOpenSklad={canOpenSklad} />
      <PlanLegend />
    </div>
  );
}

/** `store.shortage` (§4): omborda yetmaydigan mahsulotlar — uch son ham serverdan. */
function ShortageBanner({ plan }: { plan: IssuePlan }) {
  const short = filledCells(plan.store.shortage, plan.products);
  if (short.length === 0) return null;
  return (
    <div role="status" className="border-warn bg-warn-soft text-warn flex items-start gap-2 rounded-2xl border px-4 py-3 text-dense">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold">Omborda yetmaydi</p>
        <ul className="mt-1 flex flex-col gap-0.5">
          {short.map(({ product, cell }) => (
            <li key={product.id}>
              <span className="font-semibold" data-no-translit>
                {product.name}
              </span>
              {` — ${cellText(cellOf(plan.store.toIssue, product.id))} berish kerak, omboringizda ${cellText(cellOf(plan.store.onHand, product.id))}, ${cellText(cell)} yetmaydi`}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanLegend() {
  return (
    <ul className="text-ink-muted flex flex-col gap-x-6 gap-y-1 text-meta lg:flex-row lg:flex-wrap">
      <li>
        <strong className="text-danger font-semibold">Qo&apos;lida</strong>
        <span> — kuryer skladining hozirgi qoldig&apos;i</span>
      </li>
      <li>
        <strong className="text-ink font-semibold">Zakazlarga kerak</strong>
        <span> — kechadan o&apos;tgan va yangi biriktirilgan zakazlardagi mahsulotlar</span>
      </li>
      <li>
        <strong className="text-brand font-semibold">Yana berish kerak</strong>
        <span> = kerak − qo&apos;lida (manfiy bo&apos;lmaydi)</span>
      </li>
      <li>
        <strong className="text-gold font-semibold">Ortiqcha</strong>
        <span> — zakazlarga kerak bo&apos;lmagani, omborga qaytadi yoki turadi</span>
      </li>
    </ul>
  );
}
