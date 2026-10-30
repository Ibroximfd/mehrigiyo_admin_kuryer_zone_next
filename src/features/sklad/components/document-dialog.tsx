"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  LoaderCircle,
  Lock,
  Minus,
  PackageOpen,
  PackagePlus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { createDocument, fetchItems, fetchStock, type DocumentInput } from "../api";
import { skladErrorMessage, shortagesOf } from "../error-hints";
import {
  addItem,
  filterCatalog,
  limitedByStock,
  overdraft,
  readyToSave,
  removeItem,
  scanMatch,
  setQuantity,
  sortCatalog,
  summarize,
  takeEverything,
  type CatalogItem,
  type MovementLine,
} from "../movement-model";
import { canWriteItem } from "../permissions";
import { ADJUSTMENT_REASONS, WRITE_OFF_REASONS, type CourierStock, type SkladMe } from "../types";
import { describePieces } from "../units";
import { LocationSelect } from "./location-select";
import { ShortageTable } from "./shortage-table";

/**
 * Sklad harakati — katta ish oynasi (logist kuniga o'nlab marta ochadi):
 * chapda hamma nazoratdagi mahsulot va «qancha bor», o'ngda tanlanganlar.
 * Bitta bosish = +1 dona, «kar.» = bir karobka, «Hammasi» = bor qoldiq.
 * Oyna ichida turini almashtirsa bo'ladi (Kirim ↔ Chiqim, Berish ↔ Qabul).
 * Qoralama yo'q: «Saqlash» darhol kuchga kiradi (§3.6). Ctrl/⌘+Enter — saqlash.
 */
export type DocumentKind = DocumentInput["type"];

const META: Record<DocumentKind, { title: string; tab: string; description: string; submit: string; Icon: typeof Plus }> = {
  receipt: { title: "Kirim", tab: "Kirim", description: "Ishlab chiqarishdan omborga mol keldi.", submit: "Kirimni saqlash", Icon: ArrowDownToLine },
  write_off: { title: "Chiqim", tab: "Chiqim", description: "Ombordan sabab bilan chiqarish — shikast, muddat, namuna.", submit: "Chiqimni saqlash", Icon: ArrowUpFromLine },
  courier_load: { title: "Kuryerga berish", tab: "Berish", description: "Ombordan kuryerga — darhol kuchga kiradi.", submit: "Berishni saqlash", Icon: ArrowUpFromLine },
  courier_return: { title: "Kuryerdan qabul", tab: "Qabul", description: "Kuryer omborga qaytardi — hammasi yoki qismi.", submit: "Qabulni saqlash", Icon: ArrowDownToLine },
  adjustment: { title: "Tuzatish", tab: "Tuzatish", description: "Sanoq farqi: haqiqiy son kiritiladi, farqni tizim yozadi.", submit: "Tuzatishni saqlash", Icon: SlidersHorizontal },
};

/** Katalogdagi qoldiq yorlig'i: kuryerdan — «bor», ombordan — «omborda». */
function sourceWord(fromCourier: boolean): string {
  return fromCourier ? "bor" : "omborda";
}

export function DocumentDialog({
  kind: initialKind,
  kinds,
  me,
  open,
  onOpenChange,
  /** Kuryer oynalari: kuryer oldindan tanlangan. */
  courier = null,
  /** Sukut ombor (viloyat paneli yoki kuryer viloyatining asosiy ombori). */
  defaultLocationId = null,
  region = null,
  /** Jadval qatoridan ochilganda — shu mahsulot darhol tanlangan bo'ladi. */
  initialItemId = null,
}: {
  kind: DocumentKind;
  /** Oyna ichida almashtiriladigan turlar (sukut — faqat `kind`). */
  kinds?: DocumentKind[];
  me: SkladMe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courier?: CourierStock | null;
  defaultLocationId?: number | null;
  region?: string | null;
  initialItemId?: number | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92dvh,58rem)] w-[76rem] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-1rem)]"
      >
        {open ? (
          <Workspace
            initialKind={initialKind}
            kinds={kinds && kinds.length > 0 ? kinds : [initialKind]}
            me={me}
            courier={courier}
            defaultLocationId={defaultLocationId}
            region={region}
            initialItemId={initialItemId}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Workspace({
  initialKind,
  kinds,
  me,
  courier,
  defaultLocationId,
  region,
  initialItemId,
  onClose,
}: {
  initialKind: DocumentKind;
  kinds: DocumentKind[];
  me: SkladMe | null;
  courier: CourierStock | null;
  defaultLocationId: number | null;
  region: string | null;
  initialItemId: number | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DocumentKind>(initialKind);
  const [locationId, setLocationId] = useState<number | null>(defaultLocationId);
  const [reason, setReason] = useState("");
  const [supplier, setSupplier] = useState("Ishlab chiqarish");
  const [refNumber, setRefNumber] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [lines, setLines] = useState<MovementLine[]>([]);
  /** «Hammasini qaytarish» bosilgan va o'zgartirilmagan — `mode: all`. */
  const [returnAll, setReturnAll] = useState(false);
  /** Telefonda bitta ustun: katalog yoki tanlanganlar. */
  const [pane, setPane] = useState<"catalog" | "cart">("catalog");
  const [seeded, setSeeded] = useState(initialItemId === null);

  const meta = META[kind];
  const fromCourier = kind === "courier_return" || (kind === "adjustment" && courier !== null);
  const needsLocation = !(kind === "adjustment" && courier !== null);
  const limited = limitedByStock(kind);

  const items = useQuery({
    queryKey: queryKeys.skladItems({ tracking: "on" }),
    queryFn: ({ signal }) => fetchItems({ tracking: "on" }, signal),
    staleTime: 5 * 60_000,
  });
  const stock = useQuery({
    queryKey: queryKeys.skladStock({ locationId }),
    queryFn: ({ signal }) => fetchStock({ locationId }, signal),
    enabled: locationId !== null && !fromCourier,
    staleTime: 15_000,
  });

  /** Katalog: kuryerdan — faqat kuryerdagilar; qolgani — hamma mahsulot + ombordagi qoldiq. */
  const catalog = useMemo<CatalogItem[]>(() => {
    const all = items.data ?? [];
    const byId = new Map(all.map((item) => [item.id, item]));
    if (fromCourier) {
      return sortCatalog(
        (courier?.items ?? []).map((row) => {
          const full = byId.get(row.item.id);
          return {
            id: row.item.id,
            name: row.item.name,
            sku: row.item.sku,
            barcode: full?.barcode ?? "",
            packageSize: full?.packageSize ?? 1,
            pinned: full?.pinned ?? false,
            available: row.quantity,
          };
        }),
        kind,
      );
    }
    const onHand = new Map((stock.data ?? []).map((row) => [row.item.id, row.onHand]));
    const known = locationId !== null && stock.isSuccess;
    return sortCatalog(
      all
        .filter((item) => item.isActive && item.stockTracking)
        .map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          packageSize: item.packageSize,
          pinned: item.pinned,
          available: known ? (onHand.get(item.id) ?? 0) : null,
        })),
      kind,
    );
  }, [items.data, stock.data, stock.isSuccess, locationId, fromCourier, courier, kind]);

  // Jadval qatoridan ochilgan — mahsulot katalog kelishi bilan bir marta qo'shiladi.
  if (!seeded && catalog.length > 0) {
    const target = catalog.find((item) => item.id === initialItemId);
    setSeeded(true);
    if (target && canWriteItem(me, target.id)) setLines(addItem([], kind, target));
  }

  const visible = useMemo(() => {
    const filtered = filterCatalog(catalog, query);
    return onlyAvailable ? filtered.filter((item) => (item.available ?? 0) > 0) : filtered;
  }, [catalog, query, onlyAvailable]);
  const selected = new Map(lines.map((line) => [line.item.id, line.quantity]));
  const summary = summarize(lines, kind);

  const edit = (next: MovementLine[]) => {
    setLines(next);
    setReturnAll(false);
  };
  const add = (item: CatalogItem, step = 1) => {
    if (!canWriteItem(me, item.id)) return;
    edit(addItem(lines, kind, item, step));
  };

  const buildInput = (): DocumentInput => {
    const rows = lines.map((line) => ({ itemId: line.item.id, quantity: line.quantity }));
    switch (kind) {
      case "receipt":
        return { type: "receipt", locationId: locationId!, supplier: supplier.trim(), refNumber: refNumber.trim(), note: note.trim(), lines: rows };
      case "write_off":
        return { type: "write_off", locationId: locationId!, reason, note: note.trim(), lines: rows };
      case "courier_load":
        return { type: "courier_load", locationId: locationId!, courierId: courier!.id, note: note.trim(), lines: rows };
      case "courier_return":
        return { type: "courier_return", locationId: locationId!, courierId: courier!.id, mode: returnAll ? "all" : "partial", note: note.trim(), lines: returnAll ? [] : rows };
      case "adjustment":
        return {
          type: "adjustment",
          courierId: courier?.id ?? null,
          locationId: courier ? null : locationId,
          reason: reason || "count_diff",
          note: note.trim(),
          lines: lines.map((line) => ({ itemId: line.item.id, actualQty: line.quantity })),
        };
    }
  };

  const submit = useMutation({
    mutationFn: () => createDocument(buildInput()),
    onSuccess: (doc) => {
      toast.success(`${doc.number} saqlandi · ${summary.items} mahsulot, ${groupThousands(summary.pieces)} dona`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sklad });
      onClose();
    },
  });

  const switchKind = (next: DocumentKind) => {
    if (next === kind) return;
    setKind(next);
    setReason("");
    setLines([]);
    setReturnAll(false);
    submit.reset();
  };

  const needsReason = kind === "write_off";
  const missingLocation = needsLocation && locationId === null;
  const canSubmit =
    !missingLocation && (!needsReason || reason !== "") && (returnAll || readyToSave(lines, kind)) && !submit.isPending;
  const blocker = missingLocation
    ? "Omborni tanlang"
    : needsReason && reason === ""
      ? "Sababni tanlang"
      : lines.length === 0 && !returnAll
        ? "Mahsulot tanlang"
        : summary.overdrafts > 0
          ? `${summary.overdrafts} ta qatorda bordan ko'p`
          : summary.empty > 0
            ? "Soni 0 bo'lgan qator bor"
            : null;
  const shortages = shortagesOf(submit.error);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSubmit) {
          event.preventDefault();
          submit.mutate();
        }
      }}
    >
      {/* ── Sarlavha: tur almashtirgich ─────────────────────────────────── */}
      <header className="border-line flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-ink text-title flex items-center gap-2">
            <meta.Icon className="text-brand size-5 shrink-0" aria-hidden />
            {meta.title}
            {courier ? (
              <span className="text-ink-muted truncate font-normal" data-no-translit>
                {`— ${courier.fullName}`}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-ink-muted mt-0.5 text-meta">{meta.description}</DialogDescription>
        </div>
        {kinds.length > 1 ? (
          <div role="tablist" aria-label="Harakat turi" className="bg-subtle flex rounded-xl p-1">
            {kinds.map((item) => {
              const active = item === kind;
              const ItemIcon = META[item].Icon;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchKind(item)}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-dense font-semibold transition-colors duration-(--dur-micro)",
                    active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink",
                  )}
                >
                  <ItemIcon className="size-4" aria-hidden />
                  {META[item].tab}
                </button>
              );
            })}
          </div>
        ) : null}
        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X />
        </Button>
      </header>

      {/* ── Hujjat maydonlari ───────────────────────────────────────────── */}
      <div className="border-line bg-subtle/40 flex flex-wrap items-end gap-3 border-b px-4 py-3 sm:px-5">
        {needsLocation ? (
          <div className="w-full sm:w-72">
            <LocationSelect
              value={locationId}
              onChange={(next) => {
                setLocationId(next);
                if (!fromCourier) edit([]);
              }}
              region={courier ? (courier.region ?? region) : null}
              label={kind === "courier_return" || kind === "receipt" ? "Qaysi omborga" : "Qaysi ombordan"}
            />
          </div>
        ) : null}
        {kind === "receipt" ? (
          <>
            <label className="w-full sm:w-56">
              <span className="text-ink block pb-1.5 text-dense font-medium">Yetkazuvchi</span>
              <input value={supplier} onChange={(event) => setSupplier(event.target.value)} className={inputClass} />
            </label>
            <label className="w-full sm:w-48">
              <span className="text-ink block pb-1.5 text-dense font-medium">Nakladnoy raqami</span>
              <input value={refNumber} onChange={(event) => setRefNumber(event.target.value)} placeholder="ixtiyoriy" className={inputClass} />
            </label>
          </>
        ) : null}
        {kind === "write_off" || kind === "adjustment" ? (
          <div className="min-w-0">
            <span className="text-ink block pb-1.5 text-dense font-medium">Sabab</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Sabab">
              {(kind === "write_off" ? WRITE_OFF_REASONS : ADJUSTMENT_REASONS).map((entry) => {
                const active = reason === entry.value || (kind === "adjustment" && reason === "" && entry.value === "count_diff");
                return (
                  <button
                    key={entry.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setReason(entry.value)}
                    className={cn(
                      "h-(--control-h) rounded-lg border px-3 text-dense font-medium transition-colors duration-(--dur-micro)",
                      active ? "border-brand bg-brand-soft text-ink" : "border-line bg-surface text-ink-muted hover:text-ink",
                    )}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Telefon: ustun almashtirgich ────────────────────────────────── */}
      <div className="border-line flex border-b lg:hidden">
        {(["catalog", "cart"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={pane === item}
            onClick={() => setPane(item)}
            className={cn(
              "h-11 flex-1 text-dense font-semibold",
              pane === item ? "text-brand border-brand border-b-2" : "text-ink-muted",
            )}
          >
            {item === "catalog" ? "Mahsulotlar" : `Tanlangan · ${summary.items}`}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        {/* ── Katalog ───────────────────────────────────────────────────── */}
        <section
          aria-label="Mahsulotlar"
          className={cn("border-line min-h-0 flex-col lg:flex lg:border-r", pane === "catalog" ? "flex" : "hidden")}
        >
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-2 sm:px-5">
            <div className="relative min-w-0 flex-1">
              <Search className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.metaKey || event.ctrlKey) return;
                  event.preventDefault();
                  const hit = scanMatch(catalog, query);
                  if (hit) {
                    add(hit);
                    setQuery("");
                  }
                }}
                placeholder="Nom, SKU yoki shtrix-kod — Enter qo'shadi"
                aria-label="Mahsulot qidirish"
                autoComplete="off"
                className={cn(inputClass, "h-11 pl-9 text-body")}
              />
            </div>
            {limited || kind === "adjustment" ? (
              <button
                type="button"
                aria-pressed={onlyAvailable}
                onClick={() => setOnlyAvailable((value) => !value)}
                className={cn(
                  "h-11 rounded-lg border px-3 text-dense font-medium",
                  onlyAvailable ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-muted hover:text-ink",
                )}
              >
                Faqat bori
              </button>
            ) : null}
            {kind === "courier_return" && catalog.some((item) => (item.available ?? 0) > 0) ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setLines(takeEverything(catalog));
                  setReturnAll(true);
                  setPane("cart");
                }}
              >
                <PackageOpen />
                Hammasini qaytarish
              </Button>
            ) : null}
          </div>
          <CatalogList
            loading={items.isPending || (!fromCourier && stock.isFetching && !stock.data)}
            error={items.isError ? skladErrorMessage(items.error, "Mahsulotlarni yuklashda xatolik") : null}
            onRetry={() => void items.refetch()}
            items={visible}
            emptyText={
              query
                ? `«${query}» bo'yicha mahsulot topilmadi`
                : fromCourier
                  ? "Kuryerda mol yo'q"
                  : onlyAvailable
                    ? "Omborda bor mahsulot yo'q"
                    : "Nazoratdagi mahsulot yo'q"
            }
            word={sourceWord(fromCourier)}
            selected={selected}
            me={me}
            limited={limited}
            onAdd={add}
          />
        </section>

        {/* ── Tanlanganlar ──────────────────────────────────────────────── */}
        <section aria-label="Tanlangan mahsulotlar" className={cn("min-h-0 flex-col lg:flex", pane === "cart" ? "flex" : "hidden")}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 sm:px-5">
            <h3 className="text-ink flex-1 text-body font-semibold">
              Tanlangan <span className="text-ink-faint tabular font-normal">{summary.items}</span>
            </h3>
            {lines.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={() => edit([])}>
                <Trash2 />
                Tozalash
              </Button>
            ) : null}
          </div>
          {returnAll ? (
            <p className="bg-info-soft text-info mx-4 mb-2 rounded-lg px-3 py-2 text-meta sm:mx-5">
              {`Kuryerdagi hamma mol (${groupThousands(summary.pieces)} dona) omborga qaytadi. Sonni o'zgartirsangiz — qismi qaytadi.`}
            </p>
          ) : null}
          <CartList kind={kind} lines={lines} onChange={edit} />
        </section>
      </div>

      {/* ── Pastki qator: izoh, jami, saqlash ───────────────────────────── */}
      <footer className="border-line bg-surface border-t px-4 py-3 sm:px-5">
        {shortages ? (
          <div className="mb-3 max-h-40 overflow-y-auto">
            <ShortageTable shortages={shortages} />
          </div>
        ) : submit.isError ? (
          <p role="alert" className="bg-danger-soft text-danger mb-3 rounded-lg px-3 py-2 text-meta">
            {skladErrorMessage(submit.error, "Hujjatni saqlashda xatolik")}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Izoh (ixtiyoriy)"
            aria-label="Izoh"
            className={cn(inputClass, "min-w-0 flex-1 basis-56")}
          />
          <p className="text-ink-muted tabular text-dense">
            <span className="text-ink font-semibold">{summary.items}</span> mahsulot ·{" "}
            <span className="text-ink font-semibold">{groupThousands(summary.pieces)}</span> dona
          </p>
          <div className="ml-auto flex items-center gap-2">
            {blocker && !submit.isPending ? <span className="text-ink-faint hidden text-meta md:inline">{blocker}</span> : null}
            <Button variant="outline" size="lg" onClick={onClose}>
              Bekor
            </Button>
            <Button size="lg" disabled={!canSubmit} onClick={() => submit.mutate()}>
              {submit.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
              {meta.submit}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function CatalogList({
  loading,
  error,
  onRetry,
  items,
  emptyText,
  word,
  selected,
  me,
  limited,
  onAdd,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  items: CatalogItem[];
  emptyText: string;
  word: string;
  selected: ReadonlyMap<number, number>;
  me: SkladMe | null;
  limited: boolean;
  onAdd: (item: CatalogItem, step?: number) => void;
}) {
  if (loading) {
    return (
      <ul className="space-y-1.5 px-4 pb-4 sm:px-5" aria-label="Yuklanmoqda">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="bg-subtle h-14 animate-pulse rounded-xl" />
        ))}
      </ul>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <p role="alert" className="text-danger text-dense">
          {error}
        </p>
        <Button variant="outline" onClick={onRetry}>
          Qayta urinish
        </Button>
      </div>
    );
  }
  if (items.length === 0) return <p className="text-ink-faint px-5 py-10 text-center text-dense">{emptyText}</p>;

  return (
    <ul className="scrollbar-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4 sm:px-5">
      {items.map((item) => {
        const allowed = canWriteItem(me, item.id);
        const chosen = selected.get(item.id) ?? 0;
        const none = limited && item.available !== null && item.available <= 0;
        return (
          <li key={item.id}>
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-(--dur-micro)",
                chosen > 0 ? "border-brand bg-brand-soft" : "border-line bg-surface",
                (!allowed || none) && "opacity-60",
              )}
            >
              <button
                type="button"
                disabled={!allowed || none}
                onClick={() => onAdd(item)}
                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                title={allowed ? "Bosing — +1 dona" : "Bu mahsulotga dopusk yo'q"}
              >
                <span className="text-ink block truncate text-dense font-semibold" data-no-translit>
                  {item.name}
                </span>
                <span className="text-ink-faint flex flex-wrap gap-x-2 text-fine">
                  <span data-no-translit>{item.sku}</span>
                  {item.packageSize > 1 ? <span>{`karobkada ${item.packageSize}`}</span> : null}
                  {!allowed ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Lock className="size-3" aria-hidden />
                      dopusk yo&apos;q
                    </span>
                  ) : null}
                </span>
              </button>
              {item.available !== null ? (
                <span
                  className={cn(
                    "tabular shrink-0 rounded-md px-2 py-0.5 text-meta font-semibold",
                    item.available > 0 ? "bg-subtle text-ink" : "bg-danger-soft text-danger",
                  )}
                >
                  {`${word} ${groupThousands(item.available)}`}
                </span>
              ) : null}
              {chosen > 0 ? (
                <span className="bg-brand text-brand-ink tabular shrink-0 rounded-md px-2 py-0.5 text-meta font-bold">
                  {groupThousands(chosen)}
                </span>
              ) : null}
              <Button size="icon-sm" variant="outline" aria-label="+1 dona" disabled={!allowed || none} onClick={() => onAdd(item)}>
                <Plus />
              </Button>
              {item.packageSize > 1 ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!allowed || none}
                  onClick={() => onAdd(item, item.packageSize)}
                  title={`+1 karobka (${item.packageSize} dona)`}
                >
                  <PackagePlus />
                  kar.
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CartList({
  kind,
  lines,
  onChange,
}: {
  kind: DocumentKind;
  lines: MovementLine[];
  onChange: (lines: MovementLine[]) => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <PackagePlus className="text-ink-faint size-9" aria-hidden />
        <p className="text-ink text-body font-semibold">Hali mahsulot tanlanmagan</p>
        <p className="text-ink-muted max-w-xs text-meta">
          Chapdagi ro&apos;yxatdan bosing: bitta bosish — 1 dona, «kar.» — bitta karobka. Skaner bilan ham bo&apos;ladi.
        </p>
      </div>
    );
  }
  const limited = limitedByStock(kind);
  const actual = kind === "adjustment";

  return (
    <ul className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 sm:px-5">
      {lines.map((line) => {
        const over = overdraft(line, kind);
        const available = line.item.available;
        const after =
          available === null ? null : actual ? line.quantity - available : limited ? available - line.quantity : available + line.quantity;
        const pieces = describePieces(line.quantity, line.item.packageSize);
        return (
          <li
            key={line.item.id}
            className={cn("rounded-xl border px-3 py-2.5", over ? "border-danger bg-danger-soft" : "border-line bg-surface")}
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate text-dense font-semibold" data-no-translit>
                  {line.item.name}
                </p>
                <p className={cn("text-fine", over ? "text-danger font-semibold" : "text-ink-faint")}>
                  {over
                    ? `Faqat ${groupThousands(available ?? 0)} ta bor`
                    : after === null
                      ? pieces
                      : actual
                        ? `tizimda ${groupThousands(available ?? 0)} · farq ${after > 0 ? "+" : ""}${groupThousands(after)}`
                        : limited
                          ? `qoladi ${groupThousands(after)} · ${pieces}`
                          : `bo'ladi ${groupThousands(after)} · ${pieces}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChange(removeItem(lines, line.item.id))}
                aria-label="Qatorni olib tashlash"
                className="text-ink-faint hover:text-danger rounded p-1 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Button
                size="icon"
                variant="outline"
                aria-label="Bitta kamaytirish"
                disabled={line.quantity <= 0}
                onClick={() => onChange(setQuantity(lines, line.item.id, line.quantity - 1))}
              >
                <Minus />
              </Button>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={actual ? "Haqiqiy son" : "Soni (dona)"}
                value={line.quantity}
                onChange={(event) => onChange(setQuantity(lines, line.item.id, Number(event.target.value)))}
                onFocus={(event) => event.target.select()}
                className={cn(inputClass, "tabular w-24 text-center text-body font-semibold")}
              />
              <Button
                size="icon"
                variant="outline"
                aria-label="Bitta oshirish"
                onClick={() => onChange(setQuantity(lines, line.item.id, line.quantity + 1))}
              >
                <Plus />
              </Button>
              {line.item.packageSize > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => onChange(setQuantity(lines, line.item.id, line.quantity + line.item.packageSize))}
                  title={`+1 karobka (${line.item.packageSize} dona)`}
                >
                  +1 kar.
                </Button>
              ) : null}
              {limited && available !== null && available > 0 && line.quantity !== available ? (
                <Button variant="ghost" onClick={() => onChange(setQuantity(lines, line.item.id, available))}>
                  {`Hammasi · ${groupThousands(available)}`}
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
