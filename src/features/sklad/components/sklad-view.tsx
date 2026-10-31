"use client";

import { useQuery } from "@tanstack/react-query";
import { PackageOpen, SearchX, Warehouse } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";

import { KeyFigures, Section } from "@/components/kit/key-figures";
import { ProductThumb } from "@/components/kit/product-thumb";
import { AREA_SWATCH, RegionMap } from "@/components/kit/region-map";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChiefMe } from "@/features/chief/types";
import { regionLabel } from "@/features/orders/regions";
import { errorMessage } from "@/lib/api-client";
import { groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { isUzRegionCode } from "@/lib/uz-map";
import { cn } from "@/lib/utils";

import { fetchChiefSklad } from "../api";
import type { CourierStock, SkladStockRow } from "../types";

function units(value: number): string {
  return `${groupThousands(value)} dona`;
}

/**
 * Sklad (§5): bosh kuryer faqat o'ziga biriktirilgan skladni va o'z
 * kuryerlari omborini ko'radi. Xaritada faqat o'z viloyatlari belgilangan,
 * qolgani neytral — boshqa skladlar haqida hech narsa chiqmaydi.
 */
export function SkladView({ me }: { me: ChiefMe }) {
  const sklad = useQuery({
    queryKey: queryKeys.chiefSklad(me.regions),
    queryFn: ({ signal }) => fetchChiefSklad(signal),
  });

  if (sklad.isPending) return <SkladSkeleton />;
  if (sklad.isError) {
    return (
      <ErrorView
        message={errorMessage(sklad.error, "Skladni yuklashda xatolik")}
        onRetry={() => void sklad.refetch()}
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }

  const data = sklad.data;
  if (!data.sklad) {
    return (
      <EmptyView
        Icon={Warehouse}
        title="Sizga sklad biriktirilmagan"
        description="Skladni asosiy filialning bosh logisti biriktiradi."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  const regions = data.regions.filter(isUzRegionCode);
  const name = data.sklad.name;
  const withCouriers = data.couriers.reduce((sum, stock) => sum + stock.items.reduce((total, entry) => total + entry.quantity, 0), 0);
  const low = data.stock.filter((row) => row.isLow).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="border-line bg-surface grid items-center gap-5 rounded-2xl border p-4 sm:p-5 lg:grid-cols-5">
        <RegionMap
          className="lg:col-span-3"
          label="Skladingiz viloyatlari"
          regionName={regionLabel}
          areas={[{ id: "own", colorIndex: 0, regions, highlighted: true }]}
          tooltip={(_, region) => (
            <p className="text-ink text-dense font-semibold">
              <span data-no-translit>{name}</span>
              <span className="text-ink-muted block text-meta font-normal">{regionLabel(region)}</span>
            </p>
          )}
        />
        <div className="flex flex-col gap-3 lg:col-span-2">
          <div>
            <h2 className="text-ink text-title" data-no-translit>{name}</h2>
            <p className="text-ink-muted mt-1 text-dense">Sizga biriktirilgan sklad — hamma viloyatlaringiz uchun bitta.</p>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Viloyatlar">
            {regions.map((code) => (
              <li key={code} className="bg-sklad-1-muted text-ink inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-meta">
                <span aria-hidden className={cn("size-2 rounded-full", AREA_SWATCH[0])} />
                {regionLabel(code)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Section title="Qoldiq">
        <KeyFigures
          items={[
            { label: "Skladda", value: units(data.stock.reduce((sum, row) => sum + row.inSklad, 0)) },
            { label: "Kuryerlarda", value: units(withCouriers) },
            { label: "Mahsulot turi", value: groupThousands(data.stock.length) },
            { label: "Kam qolgan", value: groupThousands(low), tone: low > 0 ? "warn" : "default" },
          ]}
        />
        {data.stock.length > 0 ? (
          <StockTable rows={data.stock} />
        ) : (
          <EmptyView
            Icon={Warehouse}
            title="Skladda mahsulot yo'q"
            description="Logist kirim qilgach shu yerda ko'rinadi."
            className="border-line bg-surface rounded-2xl border"
          />
        )}
      </Section>

      <Section title="Kuryerlar ombori" description="Kuryerlar qo'lidagi mol — kuryer ilovasi yozgan holatda">
        <CourierStocks stocks={data.couriers} />
      </Section>
    </div>
  );
}

function StockTable({ rows }: { rows: SkladStockRow[] }) {
  const [query, setQuery] = useQueryState("q", parseAsString);
  const visible = rows.filter((row) => matchesSearch(row.item.name, query ?? ""));

  return (
    <div className="border-line bg-surface overflow-hidden rounded-2xl border">
      <div className="border-line flex items-center gap-2 border-b p-3">
        <SearchInput value={query ?? ""} onChange={(next) => void setQuery(next || null)} placeholder="Mahsulot qidirish" className="w-full sm:w-64" />
      </div>
      {visible.length === 0 ? (
        <EmptyView
          Icon={SearchX}
          title="Hech narsa topilmadi"
          description="Qidiruvni o'zgartiring."
          action={<Button variant="outline" onClick={() => void setQuery(null)}>Filtrni tozalash</Button>}
        />
      ) : (
        <table className="w-full text-dense">
          <thead>
            <tr className="text-ink-faint border-line border-b text-meta">
              <th className="px-4 py-2.5 text-left font-medium">Mahsulot</th>
              <th className="px-3 py-2.5 text-right font-medium">Skladda</th>
              <th className="px-4 py-2.5 text-right font-medium">Kuryerlarda</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.item.id} className="border-line border-b last:border-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <ProductThumb name={row.item.name} size="sm" />
                    <span className="text-ink font-medium" data-no-translit>{row.item.name}</span>
                  </span>
                </td>
                <td className="tabular px-3 py-2.5 text-right">
                  <span className={cn("font-semibold", row.isLow ? "text-warn" : "text-ink")}>{groupThousands(row.inSklad)}</span>
                  {row.isLow ? <span className="text-warn block text-fine">kam qoldi</span> : null}
                </td>
                <td className="text-ink-muted tabular px-4 py-2.5 text-right">{groupThousands(row.withCouriers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CourierStocks({ stocks }: { stocks: CourierStock[] }) {
  if (stocks.length === 0) {
    return (
      <EmptyView
        Icon={PackageOpen}
        title="Kuryerlaringizda mol yo'q"
        description="Kuryer skladdan mol olsa, u shu yerda ko'rinadi."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return (
    <ul className="border-line bg-surface divide-line divide-y overflow-hidden rounded-2xl border">
      {stocks.map((stock) => {
        const total = stock.items.reduce((sum, entry) => sum + entry.quantity, 0);
        return (
          <li key={stock.courier.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="min-w-0 sm:w-48 sm:shrink-0">
              <span className="text-ink block truncate text-dense font-semibold" data-no-translit>{stock.courier.fullName}</span>
              <span className="text-ink-faint text-meta">{units(total)}</span>
            </span>
            {stock.items.length === 0 ? (
              <span className="text-ink-faint text-meta">Qo&apos;lida mol yo&apos;q</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {stock.items.map((entry) => (
                  <span key={entry.item.id} className="bg-subtle text-ink inline-flex items-center gap-1.5 rounded-md py-1 pr-2 pl-1 text-meta">
                    <ProductThumb name={entry.item.name} size="sm" className="size-6" />
                    <span data-no-translit>{entry.item.name}</span>
                    <span className="tabular font-semibold">{entry.quantity}</span>
                  </span>
                ))}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SkladSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Yuklanmoqda">
      <Skeleton className="h-80 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
