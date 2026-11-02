"use client";

import { useQuery } from "@tanstack/react-query";
import { ChartColumnBig, Lock, TriangleAlert } from "lucide-react";

import { KeyFigures, Section } from "@/components/kit/key-figures";
import { PeriodPicker } from "@/components/kit/period-picker";
import { ProductThumb } from "@/components/kit/product-thumb";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChiefMe } from "@/features/chief/types";
import { useDayRange } from "@/hooks/use-day-range";
import { errorMessage } from "@/lib/api-client";
import { isAccessDenied } from "@/lib/api-availability";
import { formatSom, groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { regionLabel } from "@/features/orders/regions";
import { cn } from "@/lib/utils";

import { fetchChiefFinance } from "../api";
import { isEmptyReport, productTotals } from "../types";
import type { ChiefFinance, FinanceFilialRow } from "../types";

/** Haq: `null` — narx belgilanmagan, «—» (hech qachon «0 so'm» emas, `MOLIYA_R_F` §0.1). */
function feeText(fee: number | null): string {
  return fee === null ? "—" : formatSom(fee);
}

/**
 * Moliya va hisobot (§4.5, §7) — bitta `chief/finance/`: davr raqamlari,
 * filiallar bilan hisob (viloyat narxi bilan haqingiz, qancha topshirish
 * kerak), kuryerlar (yetkazgani, qo'lidagi pul) va mahsulotlar. Kuryer haqi tizimda yo'q.
 * Raqamlar serverdan o'z holicha — logistdagi `finance/chiefs/` bilan ayni (F-5).
 */
export function ReportView({ me }: { me: ChiefMe }) {
  const period = useDayRange();
  const report = useQuery({
    queryKey: queryKeys.chiefReport({ from: period.from, to: period.to }),
    queryFn: ({ signal }) => fetchChiefFinance({ from: period.from, to: period.to }, signal),
  });

  return (
    <div className="flex flex-col gap-6">
      <PeriodPicker period={period} />
      {report.isPending ? (
        <ReportSkeleton />
      ) : report.isError && isAccessDenied(report.error) ? (
        <EmptyView
          Icon={Lock}
          title="Moliya sizga ochilmagan"
          description="Dopuskni asosiy filialning bosh logisti beradi."
          className="border-line bg-surface rounded-2xl border"
        />
      ) : report.isError ? (
        <ErrorView
          message={errorMessage(report.error, "Hisobotni yuklashda xatolik")}
          onRetry={() => void report.refetch()}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : isEmptyReport(report.data) ? (
        <EmptyView
          Icon={ChartColumnBig}
          title="Bu davrda yetkazilgan zakaz yo'q"
          description="Boshqa kunni yoki kengroq oraliqni tanlang."
          action={
            period.preset === "today" ? (
              <Button variant="outline" onClick={period.setYesterday}>
                Kechani ko&apos;rish
              </Button>
            ) : undefined
          }
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        <ReportBody report={report.data} inTransit={me.summary.active} />
      )}
    </div>
  );
}

function ReportBody({ report, inTransit }: { report: ChiefFinance; inTransit: number }) {
  const totals = report.totals;
  const products = productTotals(report.byCourier);
  const productUnits = products.reduce((sum, row) => sum + row.quantity, 0);
  const withCouriers = report.byCourier.reduce((sum, row) => sum + row.cashWithCourier, 0);
  return (
    <>
      <KeyFigures
        items={[
          { label: "Yetkazildi", value: `${groupThousands(totals.delivered)} zakaz`, hint: `${groupThousands(productUnits)} dona mahsulot` },
          { label: "Yo'lda", value: `${groupThousands(inTransit)} zakaz`, hint: "hozir kuryerlarda" },
          {
            label: "Manzillar",
            value: groupThousands(totals.addresses),
            hint: totals.missingRate ? `haqingiz ${feeText(totals.fee)} · to'liq emas` : `haqingiz ${feeText(totals.fee)}`,
            tone: totals.missingRate ? "warn" : "default",
          },
          {
            label: "Filiallarga topshirish kerak",
            value: formatSom(totals.toHandOver),
            hint: `kuryerlarda ${formatSom(withCouriers)}`,
            tone: totals.toHandOver > 0 ? "warn" : "default",
          },
        ]}
      />
      <MissingRatesNotice codes={totals.missingRates} show={totals.missingRate} />
      <FilialTable report={report} />
      <RegionFees rows={report.byFilial} />
      <CourierTable report={report} />
      <ProductList products={products} />
    </>
  );
}

const TH = "px-3 py-2.5 text-right font-medium";
const TD = "tabular px-3 py-2.5 text-right";

function FilialTable({ report }: { report: ChiefFinance }) {
  const { byFilial, totals } = report;
  return (
    <Section
      title="Filiallar bilan hisob"
      description="Haqingiz = Σ (viloyatdagi manzil soni × o'sha kungi viloyat narxi); filial uni alohida to'laydi. «Topshirish kerak» — joriy qoldiq, davrga bog'liq emas."
    >
      {report.addressDefinition ? <p className="text-ink-faint -mt-2 text-meta" data-no-translit>{report.addressDefinition}</p> : null}
      <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-3xl text-dense">
          <thead>
            <tr className="text-ink-faint border-line border-b text-meta">
              <th className="px-4 py-2.5 text-left font-medium">Filial</th>
              <th className={TH}>Yetkazildi</th>
              <th className={TH}>Manzil</th>
              <th className={TH}>Haqingiz</th>
              <th className={TH}>Qabul qilingan</th>
              <th className={TH}>Topshirilgan</th>
              <th className={cn(TH, "pr-4")}>Topshirish kerak</th>
            </tr>
          </thead>
          <tbody>
            {byFilial.map((row) => (
              <tr key={row.filial?.id ?? "none"} className="border-line border-b">
                <td className="px-4 py-2.5">
                  {row.filial ? (
                    <span className="text-ink font-semibold" data-no-translit>{row.filial.name}</span>
                  ) : (
                    <span className="text-ink-muted">Taqsimlanmagan</span>
                  )}
                </td>
                <td className={TD}>{groupThousands(row.delivered)}</td>
                <td className={TD}>{groupThousands(row.addresses)}</td>
                <td className={cn(TD, "text-ink font-semibold")}>
                  <FeeCell fee={row.fee} missingRate={row.missingRate} />
                </td>
                <td className={TD}>{formatSom(row.cashAccepted)}</td>
                <td className={cn(TD, "text-ink-muted")}>{formatSom(row.handedOver)}</td>
                <td className={cn(TD, "pr-4", row.toHandOver > 0 ? "text-warn font-semibold" : "text-ink-muted")}>
                  {formatSom(row.toHandOver)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-subtle text-ink font-semibold">
              <th scope="row" className="px-4 py-2.5 text-left">Jami</th>
              <td className={TD}>{groupThousands(totals.delivered)}</td>
              <td className={TD}>{groupThousands(totals.addresses)}</td>
              <td className={TD}>
                <FeeCell fee={totals.fee} missingRate={totals.missingRate} />
              </td>
              <td className={TD}>{formatSom(totals.cashAccepted)}</td>
              <td className={TD}>{formatSom(totals.handedOver)}</td>
              <td className={cn(TD, "pr-4")}>{formatSom(totals.toHandOver)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  );
}

/** Haq katagi: narxi yo'q viloyat bo'lsa — «to'liq emas» belgisi (rang yagona signal emas). */
function FeeCell({ fee, missingRate }: { fee: number | null; missingRate: boolean }) {
  return (
    <>
      {feeText(fee)}
      {missingRate ? <span className="text-warn block text-fine font-normal">to&apos;liq emas</span> : null}
    </>
  );
}

/** `missing_rates` — narxi belgilanmagan viloyatlar: ularning haqi hisobga kirmagan. */
function MissingRatesNotice({ codes, show }: { codes: string[]; show: boolean }) {
  if (!show) return null;
  return (
    <div role="status" className="bg-warn-soft text-warn flex items-start gap-2 rounded-2xl px-4 py-3 text-dense">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-semibold">Ba&apos;zi viloyatlarda manzil narxi belgilanmagan</span>
        {codes.length ? <span>{`: ${codes.map((code) => regionLabel(code)).join(", ")}`}</span> : null}
        <span className="block">Bu viloyatlardagi manzillar haqqa qo&apos;shilmagan — narxni bosh logist qo&apos;yadi.</span>
      </p>
    </div>
  );
}

/**
 * Viloyat kesimi (`by_filial[].addresses_by_region`) — backend bersa. Narx har viloyatda
 * o'z (va kunma-kun o'zgaradi), shuning uchun `per_address` faqat shu yerda ko'rinadi.
 */
function RegionFees({ rows }: { rows: FinanceFilialRow[] }) {
  const withRegions = rows.filter((row) => row.byRegion.length > 0);
  if (withRegions.length === 0) return null;
  return (
    <Section title="Viloyatlar bo'yicha haq" description="Narx viloyat bo'yicha; davr ichida o'zgargan bo'lsa haq har kun o'sha kungi narxda hisoblangan.">
      <div className="flex flex-col gap-3">
        {withRegions.map((row) => (
          <div key={row.filial?.id ?? "none"} className="border-line bg-surface overflow-hidden rounded-2xl border">
            <p className="border-line text-ink border-b px-4 py-2.5 text-dense font-semibold">
              {row.filial ? <span data-no-translit>{row.filial.name}</span> : "Taqsimlanmagan"}
            </p>
            <ul className="divide-line divide-y">
              {row.byRegion.map((region) => (
                <li key={region.region || "none"} className="grid grid-cols-2 gap-x-4 gap-y-0.5 px-4 py-2.5 text-dense sm:grid-cols-4">
                  <span className="text-ink col-span-2 sm:col-span-1">
                    {region.region ? regionLabel(region.region) : "Noma'lum (viloyat belgilanmagan)"}
                  </span>
                  <span className="text-ink-muted tabular">{`${groupThousands(region.addresses)} manzil`}</span>
                  <span className="text-ink-muted tabular">
                    {region.perAddress === null ? "narx yo'q" : `× ${formatSom(region.perAddress)}`}
                  </span>
                  <span className={cn("tabular font-semibold sm:text-right", region.missingRate ? "text-warn" : "text-ink")}>
                    {feeText(region.fee)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CourierTable({ report }: { report: ChiefFinance }) {
  const rows = report.byCourier;
  if (rows.length === 0) return null;
  const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const units = (row: (typeof rows)[number]) => row.products.reduce((total, entry) => total + entry.quantity, 0);
  return (
    <Section title="Kuryerlar" description="«Kuryerda» — hozir qo'lidagi pul; «Topshirdi» — davrda sizga topshirgani">
      <div className="border-line bg-surface overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-2xl text-dense">
          <thead>
            <tr className="text-ink-faint border-line border-b text-meta">
              <th className="px-4 py-2.5 text-left font-medium">Kuryer</th>
              <th className={TH}>Yetkazildi</th>
              <th className={TH}>Mahsulot</th>
              <th className={TH}>Manzil</th>
              <th className={TH}>Kuryerda</th>
              <th className={cn(TH, "pr-4")}>Topshirdi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.courier.id} className="border-line border-b">
                <td className="text-ink px-4 py-2.5 font-semibold" data-no-translit>{row.courier.fullName}</td>
                <td className={TD}>{groupThousands(row.delivered)}</td>
                <td className={TD}>{groupThousands(units(row))}</td>
                <td className={TD}>{groupThousands(row.addresses)}</td>
                <td className={cn(TD, row.cashWithCourier > 0 ? "text-warn font-semibold" : "text-ink-muted")}>{formatSom(row.cashWithCourier)}</td>
                <td className={cn(TD, "text-ink-muted pr-4")}>{formatSom(row.cashHanded)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-subtle text-ink font-semibold">
              <th scope="row" className="px-4 py-2.5 text-left">Jami</th>
              <td className={TD}>{groupThousands(sum((row) => row.delivered))}</td>
              <td className={TD}>{groupThousands(sum(units))}</td>
              <td className={TD}>{groupThousands(sum((row) => row.addresses))}</td>
              <td className={TD}>{formatSom(sum((row) => row.cashWithCourier))}</td>
              <td className={cn(TD, "pr-4")}>{formatSom(sum((row) => row.cashHanded))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  );
}

function ProductList({ products }: { products: ReturnType<typeof productTotals> }) {
  if (products.length === 0) return null;
  const max = Math.max(1, ...products.map((row) => row.quantity));
  return (
    <Section title="Yetkazilgan mahsulotlar">
      <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
        {products.map((row) => (
          <li key={row.item.id} className="grid grid-cols-2 items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:grid-cols-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <ProductThumb src={row.item.image} name={row.item.name} size="sm" />
              <span className="text-ink truncate text-dense font-medium" data-no-translit>{row.item.name}</span>
            </span>
            <span className="text-ink tabular text-right text-dense font-semibold sm:order-last">{`${groupThousands(row.quantity)} dona`}</span>
            {/* Ulush chizig'i — eni hisoblangan qiymat, token emas. */}
            <span aria-hidden className="bg-subtle col-span-2 h-1.5 overflow-hidden rounded-full sm:col-span-1">
              <span className="bg-brand block h-full rounded-full" style={{ width: `${(row.quantity / max) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Yuklanmoqda">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
