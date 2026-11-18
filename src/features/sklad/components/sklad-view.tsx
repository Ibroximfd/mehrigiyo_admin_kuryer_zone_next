"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock, PackageOpen, UserRound, Warehouse } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";

import { Section } from "@/components/kit/key-figures";
import { AREA_SWATCH, RegionMap } from "@/components/kit/region-map";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChiefMe } from "@/features/chief/types";
import { regionLabel } from "@/features/orders/regions";
import { SkladDayView } from "@/features/sklad-sheet/components/sklad-day-view";
import { SkladRangeView } from "@/features/sklad-sheet/components/sklad-range-view";
import { errorMessage } from "@/lib/api-client";
import { isAccessDenied } from "@/lib/api-availability";
import { queryKeys } from "@/lib/query-keys";
import { isUzRegionCode } from "@/lib/uz-map";
import { cn } from "@/lib/utils";

import { fetchChiefSklad } from "../api";
import { buildCourierStockMatrix } from "../courier-stock-matrix";
import type { ChiefSklad, CourierStock, SkladChief, SkladStockRow } from "../types";
import { useLoadRequests } from "../use-load-requests";
import { CourierDocumentDialog, type CourierDocumentMode } from "./courier-document-dialog";
import { CourierStockTable } from "./courier-stock-table";
import { LoadRequestsPanel } from "./load-requests-panel";
import { useSkladChanged } from "../use-sklad-changed";

type ReadySklad = Extract<ChiefSklad, { kind: "ready" }>;

/**
 * Ko'rinishlar (egasi maketi, hujjat 85 §1): «Kunlik» (sukut) va «Sanadan
 * sanagacha» — sklad jadvali; «Kuryerlar ombori» — sklad, kirim so'rovlari va
 * kuryer × mahsulot jadvali. Tanlangani URLda (`?view=`).
 */
const VIEWS = [
  { value: "day", label: "Kunlik" },
  { value: "range", label: "Sanadan sanagacha" },
  { value: "couriers", label: "Kuryerlar ombori" },
] as const;

const VIEW_VALUES = VIEWS.map((view) => view.value);

type SkladViewKind = (typeof VIEW_VALUES)[number];

/**
 * Sklad (§5; TZ 32 S-7): bosh kuryer faqat o'ziga biriktirilgan skladni va o'z
 * kuryerlari omborini ko'radi. Xaritada faqat o'z viloyatlari belgilangan,
 * qolgani neytral — boshqa skladlar haqida hech narsa chiqmaydi. Boshqa skladga
 * o'tkazilsa (`sklad_changed`) eski sklad darhol yopiladi. Sklad jadvali
 * (`features/sklad-sheet`) hozirgi qoldiqni shu yerda yuklangan sklad
 * ma'lumotidan oladi — server `current` blokini bermaguncha.
 */
export function SkladView({ me }: { me: ChiefMe }) {
  useSkladChanged(me.seat.id);
  const sklad = useQuery({
    queryKey: queryKeys.chiefSklad,
    queryFn: ({ signal }) => fetchChiefSklad(signal),
  });

  if (sklad.isPending) return <SkladSkeleton />;
  if (sklad.isError && isAccessDenied(sklad.error)) return <SkladForbidden />;
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
  if (data.kind === "forbidden") return <SkladForbidden />;
  if (data.kind === "unassigned") {
    return (
      <EmptyView
        Icon={Warehouse}
        title="Sklad biriktirilmagan"
        description="Sizga hali sklad biriktirilmagan. Bosh logistga murojaat qiling."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  return <SkladReady data={data} />;
}

function SkladReady({ data }: { data: ReadySklad }) {
  const [view, setView] = useQueryState("view", parseAsStringLiteral(VIEW_VALUES).withDefault("day"));
  const regions = data.sklad.regions.filter(isUzRegionCode).map((code) => ({ value: code, label: regionLabel(code) }));

  return (
    <div className="flex flex-col gap-5">
      <ViewSwitch view={view} onChange={(next) => void setView(next)} />
      {view === "day" ? (
        <SkladDayView fallback={data.stock} />
      ) : view === "range" ? (
        <SkladRangeView fallback={data.stock} regions={regions} />
      ) : (
        <CouriersPane data={data} />
      )}
    </div>
  );
}

/**
 * Ko'rinish tanlovi. Kirim so'rovlari «Kuryerlar ombori» ichida — kutilayotgani
 * bo'lsa tabda soni turadi (sukut ko'rinishda ham yashirin qolmasin).
 */
function ViewSwitch({ view, onChange }: { view: SkladViewKind; onChange: (view: SkladViewKind) => void }) {
  const pending = useLoadRequests("pending").data?.length ?? 0;
  return (
    <div role="tablist" aria-label="Ko'rinish" className="bg-surface-3 inline-flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-lg p-0.5" data-wheel-x>
      {VIEWS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={view === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 shrink-0 rounded-md px-3.5 text-dense font-semibold whitespace-nowrap transition-colors",
            view === option.value ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
          {option.value === "couriers" && pending > 0 ? (
            <>
              <span aria-hidden className="bg-brand text-brand-ink ml-1.5 rounded-full px-1.5 text-fine">
                {pending}
              </span>
              <span className="sr-only">{`${pending} ta kirim so'rovi kutilmoqda`}</span>
            </>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/** «Kuryerlar ombori»: sklad va viloyatlari, kirim so'rovlari, kuryer × mahsulot jadvali (avvalgi sahifa). */
function CouriersPane({ data }: { data: ReadySklad }) {
  const regions = data.sklad.regions.filter(isUzRegionCode);
  const name = data.sklad.name;

  return (
    <div className="flex flex-col gap-6">
      <section className="border-line bg-surface grid items-center gap-5 rounded-2xl border p-4 sm:p-5 lg:grid-cols-5">
        {/* Xarita — faqat keng ekranda: telefonda birinchi ekranni butunlay egallardi. */}
        <RegionMap
          className="hidden sm:block lg:col-span-3"
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
            <p className="text-ink-muted mt-1 hidden text-dense sm:block">Sizga biriktirilgan sklad — hamma viloyatlaringiz uchun bitta.</p>
          </div>
          <SkladChiefs chiefs={data.sklad.chiefs} />
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

      <Section title="Kirim so'rovlari" description="Kuryerlar ilovadan so'ragan mol — tasdiqlang yoki sabab bilan rad eting">
        <LoadRequestsPanel />
      </Section>

      <Section title="Kuryerlar ombori" description="Kuryerlar qo'lidagi mol — kuryer ilovasi yozgan holatda">
        <CourierStocks
          stocks={data.couriers}
          storeStock={data.stock}
          actions={data.canWrite ? { stock: data.stock, store: data.store } : null}
        />
      </Section>
    </div>
  );
}

/** `chiefs[]` — skladdagi hamma bosh kuryer (`chief` faqat birinchisini berardi, §1.1). */
function SkladChiefs({ chiefs }: { chiefs: SkladChief[] }) {
  if (chiefs.length === 0) return null;
  return (
    <div>
      <p className="text-ink-faint text-meta">Skladdagi bosh kuryerlar</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {chiefs.map((chief) => (
          <li key={chief.id} className="bg-subtle text-ink inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-meta">
            <UserRound aria-hidden className="text-ink-faint size-3.5" />
            <span data-no-translit>{chief.fullName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkladForbidden() {
  return (
    <EmptyView
      Icon={Lock}
      title="Sklad sizga ochilmagan"
      description="Skladni ko'rish dopuskini asosiy filialning bosh logisti beradi."
      className="border-line bg-surface rounded-2xl border"
    />
  );
}

/** Kuryer qatoridagi amallar (§6): faqat `can_write` bo'lsa; aks holda faqat ko'rish. */
type CourierActions = { stock: SkladStockRow[]; store: { id: number; name: string } | null };

function CourierStocks({
  stocks,
  storeStock,
  actions,
}: {
  stocks: CourierStock[];
  /** Sklad qoldig'i — jadvalning «Omborim» qatori (ko'rish; `can_write` ga bog'liq emas). */
  storeStock: SkladStockRow[];
  actions: CourierActions | null;
}) {
  const [open, setOpen] = useState<{ mode: CourierDocumentMode; courier: CourierStock } | null>(null);
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
    <>
      <CourierStockTable
        matrix={buildCourierStockMatrix(stocks, storeStock)}
        onAction={actions ? (mode, courier) => setOpen({ mode, courier }) : null}
      />
      {open && actions ? (
        <CourierDocumentDialog
          key={`${open.mode}-${open.courier.courier.id}`}
          mode={open.mode}
          courier={open.courier}
          stock={actions.stock}
          store={actions.store}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
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
