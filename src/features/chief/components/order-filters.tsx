"use client";

import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { ArrowDownUp, ChevronDown, Package, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { DateRangeField } from "@/components/kit/date-range";
import { Field, inputClass } from "@/components/kit/field";
import { SearchInput } from "@/components/kit/search-input";
import { SelectField } from "@/components/kit/select-field";
import { SavedFilters } from "@/components/panel/saved-filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { fetchChiefCouriers, fetchChiefFilials, fetchChiefZones, fetchProductOptions } from "@/features/chief/api";
import type { ProductOption } from "@/features/chief/api";
import { DEFAULT_ORDER_SORT, DISTRICT_FILTER_LABELS, DISTRICT_FILTERS, ORDER_SORT_LABELS, ORDER_SORTS } from "@/features/chief/order-sort";
import type { ChiefMe } from "@/features/chief/types";
import type { OrderFilterControls } from "@/features/chief/use-order-filters";
import { regionLabel } from "@/features/orders/regions";
import { CenterSelect } from "@/features/sales-centers/components/center-select";
import { useSalesCenters } from "@/features/sales-centers/use-sales-centers";
import { districtName } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { formatMoneyInput, formatSom, parseMoneyInput, toIsoDay, todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

type Chip = { key: string; label: string; clear: () => void; translate?: boolean };

/**
 * Zakazlar qidiruvi va filtrlari. Asosiy qatorda ko'p ishlatiladiganlari
 * (sana, mahsulot, zona, kuryer, tartib), qolgani «Filtrlar» panelida —
 * telefonda hammasi panelda. Faol filtrlar pastda chip bo'lib turadi;
 * xodim tanlovini nom berib saqlashi mumkin («Saqlanganlar»).
 */
export function OrderFilters({
  me,
  controls,
  amountError,
}: {
  me: ChiefMe;
  controls: OrderFilterControls;
  /** Server summani rad etsa (`400 fields.amount_min/max`) — maydon ostida. */
  amountError?: string | null;
}) {
  const options = useFilterOptions(me);
  const [panelOpen, setPanelOpen] = useState(false);
  const chips = activeChips(controls, options);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <QueryField controls={controls} />
        <SavedFilters />
        {/* Telefonda bitta qator: sana va tartib — «Filtrlar» panelida. */}
        <Button
          variant="outline"
          size="icon-lg"
          onClick={() => setPanelOpen(true)}
          aria-label="Filtrlar"
          className="relative shrink-0 sm:hidden"
        >
          <SlidersHorizontal />
          {controls.activeCount > 0 ? (
            <span className="bg-brand text-brand-ink tabular absolute -top-1 -right-1 grid size-5 place-items-center rounded-full text-micro font-semibold">
              {controls.activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        {options.centers.length > 1 ? (
          <CenterSelect value={controls.state.center} onChange={(center) => controls.set({ center })} className="w-48" />
        ) : null}
        <DateFilter controls={controls} />
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <ProductPicker controls={controls} products={options.products} className="w-52" />
          <ZoneSelect controls={controls} options={options} className="w-44" />
          <CourierSelect controls={controls} options={options} className="w-44" />
        </div>
        <div className="flex items-center gap-2">
          <SortSelect controls={controls} className="w-64" />
          <Button variant="outline" onClick={() => setPanelOpen(true)} className="shrink-0">
            <SlidersHorizontal />
            Filtrlar
            <CountBadge value={controls.activeCount} className="lg:hidden" />
            <CountBadge value={controls.panelCount} className="hidden lg:inline" />
          </Button>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Faol filtrlar">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={`${chip.label}: olib tashlash`}
              className="border-brand bg-brand-soft text-brand inline-flex h-7 items-center gap-1 rounded-full border pr-1.5 pl-2.5 text-meta font-medium"
            >
              {chip.translate ? <span>{chip.label}</span> : <span data-no-translit>{chip.label}</span>}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={controls.clear}>
            Hammasini tozalash
          </Button>
        </div>
      ) : null}

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-md gap-0 overflow-y-auto p-0">
          <div className="border-line border-b px-5 pt-5 pb-4">
            <SheetTitle className="text-ink text-title">Filtrlar</SheetTitle>
            <SheetDescription className="text-ink-muted mt-1 text-meta">
              Tanlov darhol qo&apos;llanadi va saqlanib qoladi — saytdan chiqib kirsangiz ham.
            </SheetDescription>
          </div>
          <div className="flex flex-col gap-5 px-5 py-4">
            {options.centers.length > 1 ? (
              // Markaz (136-javob) — eng yuqori filtr; markazlar bog'langan filialdagina.
              <PanelGroup title="Markaz">
                <CenterSelect value={controls.state.center} onChange={(center) => controls.set({ center })} />
              </PanelGroup>
            ) : null}
            <PanelGroup title={controls.scope === "delivered" ? "Sana (yetkazilgan kuni)" : "Sana (sizga kelgan kuni)"}>
              <DateFilter controls={controls} />
            </PanelGroup>
            <PanelGroup title="Mahsulot">
              <ProductChecklist controls={controls} products={options.products} />
            </PanelGroup>
            <PanelGroup title="Summa (mijoz to'laydi)">
              <AmountRange controls={controls} error={amountError ?? null} />
            </PanelGroup>
            <PanelGroup title="Tuman holati">
              <DistrictStateChips controls={controls} />
            </PanelGroup>
            <PanelGroup title="Joy va jamoa">
              <div className="grid gap-2 sm:grid-cols-2">
                <ZoneSelect controls={controls} options={options} />
                <CourierSelect controls={controls} options={options} />
                <SelectField
                  label="Filial"
                  allLabel="Hamma filial"
                  value={controls.state.filial === null ? null : String(controls.state.filial)}
                  options={options.filials}
                  onChange={(value) => controls.set({ filial: value === null ? null : Number(value) })}
                />
                {me.regions.length > 1 ? (
                  <SelectField
                    label="Viloyat"
                    allLabel="Hamma viloyat"
                    value={controls.state.region}
                    options={options.regions}
                    onChange={(value) => controls.set({ region: value, district: null })}
                  />
                ) : null}
                <SelectField
                  label="Tuman"
                  allLabel="Hamma tuman"
                  value={controls.state.district}
                  options={options.districts(controls.state.region)}
                  onChange={(value) => controls.set({ district: value })}
                />
              </div>
            </PanelGroup>
            <PanelGroup title="Tartib">
              <SortSelect controls={controls} />
            </PanelGroup>
          </div>
          <div className="border-line bg-surface pb-safe sticky bottom-0 mt-auto border-t">
            <div className="flex justify-between gap-2 px-5 py-3">
              <Button variant="ghost" onClick={controls.clear} disabled={controls.activeCount === 0}>
                Hammasini tozalash
              </Button>
              <Button onClick={() => setPanelOpen(false)} className="min-w-32">
                Ko&apos;rsatish
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PanelGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-ink-faint text-meta font-semibold tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  );
}

function CountBadge({ value, className }: { value: number; className?: string }) {
  if (value === 0) return null;
  return <span className={cn("tabular text-brand font-semibold", className)}>{value}</span>;
}

/** Har harfda so'rov ketmasin — yozib bo'lgach URLga tushadi. */
function QueryField({ controls }: { controls: OrderFilterControls }) {
  const urlQuery = controls.state.q ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [synced, setSynced] = useState(urlQuery);
  // URL tashqaridan o'zgarsa (tozalash, orqaga, saqlangan filtr) — maydon ham ergashadi.
  if (urlQuery !== synced) {
    setSynced(urlQuery);
    setQuery(urlQuery);
  }
  useEffect(() => {
    if (query === urlQuery) return;
    const timer = setTimeout(() => controls.set({ q: query || null }), 300);
    return () => clearTimeout(timer);
  }, [query, urlQuery, controls]);

  return (
    <SearchInput
      value={query}
      onChange={setQuery}
      placeholder="Raqam, mijoz, telefon, manzil yoki mahsulot"
      className="min-w-0 flex-1"
    />
  );
}

type FilterOptions = ReturnType<typeof useFilterOptions>;

function useFilterOptions(me: ChiefMe) {
  const locale = useLocaleStore((state) => state.locale);
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const filials = useQuery({ queryKey: queryKeys.chiefFilials, queryFn: ({ signal }) => fetchChiefFilials(signal), staleTime: 10 * 60_000 });
  const products = useQuery({
    queryKey: queryKeys.productOptions,
    queryFn: ({ signal }) => fetchProductOptions(signal),
    staleTime: 30 * 60_000,
  });
  const dictionary = useRegionsDictionary();
  const regions = (dictionary.data ?? []).filter((item) => me.regions.includes(item.region));
  const { centers, choice } = useSalesCenters();
  return {
    /** Markaz tanlovi yo'q (eski server, bog'lanmagan filial) — bo'sh: panel va chip chiqmaydi. */
    centers: choice ? (centers ?? []).map((center) => ({ value: String(center.id), label: center.name, translate: false })) : [],
    zones: (zones.data?.zones ?? []).map((zone) => ({ value: String(zone.id), label: zone.name, translate: false })),
    couriers: (couriers.data ?? []).map((courier) => ({ value: String(courier.id), label: courier.fullName, translate: false })),
    filials: (filials.data ?? []).map((filial) => ({ value: String(filial.id), label: filial.name, translate: false })),
    products: {
      list: products.data ?? [],
      isPending: products.isPending,
      isError: products.isError,
      retry: () => void products.refetch(),
    },
    regions: me.regions.map((code) => ({ value: code, label: regionLabel(code) })),
    districts: (region: string | null) =>
      regions
        .filter((item) => region === null || item.region === region)
        .flatMap((item) => item.districts)
        .filter((district) => district.isActive)
        .map((district) => ({ value: district.code, label: districtName(district, locale), translate: false })),
  };
}

function DateFilter({ controls }: { controls: OrderFilterControls }) {
  const { state } = controls;
  const today = todayIso();
  const yesterday = toIsoDay(subDays(new Date(), 1));
  const preset =
    state.from === today && state.to === today ? "today" : state.from === yesterday && state.to === yesterday ? "yesterday" : null;
  const custom = preset === null && Boolean(state.from || state.to);
  return (
    <div role="group" aria-label="Sana" className="flex flex-wrap items-center gap-1.5">
      <DayChip
        active={preset === "today"}
        onClick={() => controls.set({ from: preset === "today" ? null : today, to: preset === "today" ? null : today })}
      >
        Bugun
      </DayChip>
      <DayChip
        active={preset === "yesterday"}
        onClick={() => controls.set({ from: preset === "yesterday" ? null : yesterday, to: preset === "yesterday" ? null : yesterday })}
      >
        Kecha
      </DayChip>
      <DateRangeField
        from={custom ? (state.from ?? "") : ""}
        to={custom ? (state.to ?? "") : ""}
        onChange={(from, to) => controls.set({ from: from || null, to: to || null })}
        onClear={custom ? () => controls.set({ from: null, to: null }) : undefined}
      />
    </div>
  );
}

function ZoneSelect({ controls, options, className }: { controls: OrderFilterControls; options: FilterOptions; className?: string }) {
  return (
    <SelectField
      label="Zona"
      allLabel="Hamma zona"
      value={controls.state.zone === null ? null : String(controls.state.zone)}
      options={options.zones}
      onChange={(value) => controls.set({ zone: value === null ? null : Number(value) })}
      className={className}
    />
  );
}

function CourierSelect({ controls, options, className }: { controls: OrderFilterControls; options: FilterOptions; className?: string }) {
  return (
    <SelectField
      label="Kuryer"
      allLabel="Hamma kuryer"
      value={controls.state.courier === null ? null : String(controls.state.courier)}
      options={options.couriers}
      onChange={(value) => controls.set({ courier: value === null ? null : Number(value) })}
      className={className}
    />
  );
}

function SortSelect({ controls, className }: { controls: OrderFilterControls; className?: string }) {
  const value = controls.selection.sort;
  return (
    <Select
      value={value}
      onValueChange={(next) => controls.set({ sort: ORDER_SORTS.find((sort) => sort === next && sort !== DEFAULT_ORDER_SORT) ?? null })}
    >
      <SelectTrigger aria-label="Tartib" className={cn("w-full", value !== DEFAULT_ORDER_SORT && "border-brand text-brand", className)}>
        <ArrowDownUp className="size-4 shrink-0" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER_SORTS.map((sort) => (
          <SelectItem key={sort} value={sort}>
            {ORDER_SORT_LABELS[sort]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type ProductsState = FilterOptions["products"];

function ProductPicker({ controls, products, className }: { controls: OrderFilterControls; products: ProductsState; className?: string }) {
  const selected = controls.selection.productIds;
  const first = products.list.find((item) => item.id === selected[0]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Mahsulot"
          className={cn("justify-between font-normal", selected.length > 0 && "border-brand text-brand", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Package className="size-4 shrink-0" aria-hidden />
            {selected.length === 0 ? (
              <span className="truncate">Hamma mahsulot</span>
            ) : selected.length === 1 && first ? (
              <span className="truncate" data-no-translit>{first.title}</span>
            ) : (
              <span className="truncate">{`${selected.length} ta mahsulot`}</span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <ProductChecklist controls={controls} products={products} />
      </PopoverContent>
    </Popover>
  );
}

/** Mahsulotlar ro'yxati: qidiruv, bir nechtasini belgilash, «biri bor» yoki «hammasi bor». */
function ProductChecklist({ controls, products }: { controls: OrderFilterControls; products: ProductsState }) {
  const [term, setTerm] = useState("");
  const selected = new Set(controls.selection.productIds);
  const visible = products.list.filter((item) => matchesSearch(item.title, term));
  const toggle = (item: ProductOption) => {
    const next = selected.has(item.id) ? [...selected].filter((id) => id !== item.id) : [...selected, item.id];
    controls.set({ products: next.length ? next : null, pmatch: next.length > 1 ? controls.state.pmatch : null });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Mahsulot qidirish"
        aria-label="Mahsulot qidirish"
        className={inputClass}
      />
      {selected.size > 1 ? (
        <div role="radiogroup" aria-label="Mos kelish" className="bg-subtle grid grid-cols-2 gap-0.5 rounded-lg p-0.5">
          <MatchOption active={controls.selection.productMatch === "any"} onClick={() => controls.set({ pmatch: null })}>
            Biri bor
          </MatchOption>
          <MatchOption active={controls.selection.productMatch === "all"} onClick={() => controls.set({ pmatch: "all" })}>
            Hammasi bor
          </MatchOption>
        </div>
      ) : null}
      {products.isPending ? (
        <p className="text-ink-faint px-1 py-2 text-meta">Yuklanmoqda</p>
      ) : products.isError ? (
        <div className="text-danger flex items-center justify-between gap-2 px-1 py-2 text-meta">
          Mahsulotlarni yuklab bo&apos;lmadi
          <Button size="sm" variant="ghost" onClick={products.retry}>
            Qayta urinish
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-ink-faint px-1 py-2 text-meta">Hech narsa topilmadi</p>
      ) : (
        <ul className="border-line divide-line max-h-72 divide-y overflow-y-auto rounded-lg border">
          {visible.map((item) => (
            <li key={item.id}>
              <label className="hover:bg-subtle flex cursor-pointer items-center gap-2.5 px-3 py-2 text-dense">
                <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item)} />
                <span className="min-w-0 flex-1 truncate" data-no-translit>{item.title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {selected.size > 0 ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => controls.set({ products: null, pmatch: null })}>
          Tanlovni tozalash
        </Button>
      ) : null}
    </div>
  );
}

function MatchOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "h-8 rounded-md px-3 text-dense font-semibold transition-colors",
        active ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Summa oralig'i: yozib bo'lgach (0,5 s) qo'llanadi. */
function AmountRange({ controls, error }: { controls: OrderFilterControls; error: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2">
        <AmountInput id="amount-min" label="dan" value={controls.state.min} onCommit={(min) => controls.set({ min })} />
        <AmountInput id="amount-max" label="gacha" value={controls.state.max} onCommit={(max) => controls.set({ max })} />
      </div>
      {error ? (
        <p role="alert" className="text-danger text-meta">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Server tumanni ishonch bilan yoza olmaganlar (60-javob) — tez topish uchun.
 * «Zonasi yo'q» — tuman bor, lekin hech qaysi zonaga biriktirilmagan ham kiradi.
 */
function DistrictStateChips({ controls }: { controls: OrderFilterControls }) {
  const value = controls.state.tuman;
  return (
    <div role="group" aria-label="Tuman holati" className="flex flex-wrap gap-1.5">
      {DISTRICT_FILTERS.map((option) => (
        <DayChip key={option} active={value === option} onClick={() => controls.set({ tuman: value === option ? null : option })}>
          {DISTRICT_FILTER_LABELS[option]}
        </DayChip>
      ))}
    </div>
  );
}

function AmountInput({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: number | null;
  onCommit: (value: number | null) => void;
}) {
  const external = value === null ? "" : formatMoneyInput(value);
  const [draft, setDraft] = useState(external);
  const [synced, setSynced] = useState(external);
  if (external !== synced) {
    setSynced(external);
    setDraft(external);
  }
  useEffect(() => {
    if (draft === external) return;
    const timer = setTimeout(() => {
      const parsed = parseMoneyInput(draft);
      onCommit(draft.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : null);
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, external, onCommit]);

  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        inputMode="numeric"
        value={draft}
        placeholder="so'm"
        onChange={(event) => setDraft(formatMoneyInput(event.target.value))}
        className={cn(inputClass, "tabular")}
      />
    </Field>
  );
}

function DayChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-(--control-h) items-center rounded-full border px-3.5 text-dense font-medium transition-colors duration-(--dur-micro)",
        active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function labelOf(list: Array<{ value: string; label: string }>, value: string | number | null): string {
  return list.find((item) => item.value === String(value))?.label ?? String(value);
}

function amountLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatSom(min)} — ${formatSom(max)}`;
  if (min !== null) return `${formatSom(min)} dan`;
  return `${formatSom(max ?? 0)} gacha`;
}

function activeChips(controls: OrderFilterControls, options: FilterOptions): Chip[] {
  const { state, set, selection } = controls;
  const chips: Chip[] = [];
  if (state.from || state.to) {
    const range = state.from === state.to ? (state.from ?? "") : `${state.from ?? "…"} — ${state.to ?? "…"}`;
    chips.push({ key: "date", label: range, clear: () => set({ from: null, to: null }) });
  }
  for (const id of selection.productIds) {
    const title = options.products.list.find((item) => item.id === id)?.title ?? `#${id}`;
    const rest = selection.productIds.filter((other) => other !== id);
    chips.push({
      key: `product-${id}`,
      label: title,
      clear: () => set({ products: rest.length ? rest : null, pmatch: rest.length > 1 ? state.pmatch : null }),
    });
  }
  if (selection.productIds.length > 1 && selection.productMatch === "all") {
    chips.push({ key: "pmatch", label: "Hammasi bor", clear: () => set({ pmatch: null }), translate: true });
  }
  if (state.min !== null || state.max !== null) {
    chips.push({ key: "amount", label: amountLabel(state.min, state.max), clear: () => set({ min: null, max: null }), translate: true });
  }
  if (state.tuman) {
    chips.push({ key: "tuman", label: DISTRICT_FILTER_LABELS[state.tuman], clear: () => set({ tuman: null }), translate: true });
  }
  if (state.zone !== null) chips.push({ key: "zone", label: labelOf(options.zones, state.zone), clear: () => set({ zone: null }) });
  if (state.courier !== null) {
    chips.push({ key: "courier", label: labelOf(options.couriers, state.courier), clear: () => set({ courier: null }) });
  }
  if (state.filial !== null) chips.push({ key: "filial", label: labelOf(options.filials, state.filial), clear: () => set({ filial: null }) });
  // Ro'yxatda yo'q markaz serverga ketmaydi — chip ham yo'q.
  if (state.center !== null && options.centers.some((option) => option.value === String(state.center))) {
    chips.unshift({ key: "center", label: labelOf(options.centers, state.center), clear: () => set({ center: null }) });
  }
  if (state.region) {
    chips.push({ key: "region", label: labelOf(options.regions, state.region), clear: () => set({ region: null, district: null }), translate: true });
  }
  if (state.district) {
    chips.push({ key: "district", label: labelOf(options.districts(null), state.district), clear: () => set({ district: null }) });
  }
  return chips;
}
