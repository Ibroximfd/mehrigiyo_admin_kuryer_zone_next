"use client";

import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, Minus, Pin, Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Meter } from "@/components/kit/chart";
import { FilterChip } from "@/components/kit/period-filter-bar";
import { StatusPill } from "@/components/kit/status-pill";
import { CourierActivity } from "./courier-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardCard } from "@/features/orders/components/dashboard/dashboard-card";
import { groupThousands } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { canWriteAny, canWriteItem } from "../permissions";
import type { RegionItem, RegionPanel as RegionPanelData, SkladMe } from "../types";
import { CourierDocumentLauncher } from "./courier-document-launcher";
import { DocumentDialog, type DocumentKind } from "./document-dialog";
import { LedgerTable } from "./ledger-table";

/**
 * Tanlangan viloyat paneli (dizayn 1, «5–8»): bitta karta — sarlavha
 * qatori (nom, meta, Kirim/Chiqim), 4 raqam chiziq bilan, mahsulotlar
 * jadvali («minimalga nisbatan» chizig'i va «yetadi» belgisi), kuryerlar
 * (kimda nechta, chiziq bilan) va bugungi soatlar. Oxirgi harakatlar —
 * pastda alohida.
 */
export function RegionPanel({ data, me }: { data: RegionPanelData; me: SkladMe | null }) {
  const [dialog, setDialog] = useState<{ kind: DocumentKind; itemId?: number } | null>(null);
  const [courierDoc, setCourierDoc] = useState<{ courierId: number; kind: DocumentKind } | null>(null);
  const writable = canWriteAny(me);
  const primary = data.locations.find((location) => location.isPrimary) ?? data.locations[0];
  const maxCourier = Math.max(1, ...data.couriers.map((courier) => courier.onHand));
  const stock = Math.max(1, data.totals.onHand + data.totals.withCouriers);

  return (
    <div className="flex flex-col gap-3.5">
      <section className="glass-card border-brand overflow-hidden rounded-2xl border">
        <header className="bg-subtle border-line flex flex-wrap items-center gap-3 border-b px-4 py-3.5 sm:px-5">
          <h2 className="text-ink text-title" data-no-translit>
            {data.region.name}
          </h2>
          <span className="text-ink-muted text-meta">
            {`${data.locations.length} ombor · ${data.couriers.length} kuryer · ${groupThousands(data.totals.onHand)} dona omborda · ${groupThousands(data.totals.withCouriers)} kuryerda`}
          </span>
          {writable ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setDialog({ kind: "adjustment" })}>
                <SlidersHorizontal className="size-4" />
                Tuzatish
              </Button>
              <Button variant="outline" onClick={() => setDialog({ kind: "write_off" })}>
                <Minus className="size-4" />
                Chiqim
              </Button>
              <Button onClick={() => setDialog({ kind: "receipt" })}>
                <Plus className="size-4" />
                Kirim
              </Button>
            </div>
          ) : null}
        </header>

        <div className="border-line grid grid-cols-2 gap-3 border-b px-4 py-3.5 sm:px-5 lg:grid-cols-4">
          <Figure label="Omborda" value={data.totals.onHand} share={(data.totals.onHand / stock) * 100} color="var(--brand)" />
          <Figure label="Kuryerlarda" value={data.totals.withCouriers} share={(data.totals.withCouriers / stock) * 100} color="var(--warn)" />
          <Figure label="Kam qolgan" value={data.totals.lowItems} share={Math.min(100, data.totals.lowItems * 25)} color="var(--danger)" />
          <Figure label="Bugun yetkazildi" value={data.totals.deliveredToday} share={Math.min(100, data.totals.deliveredToday)} color="var(--order-delivered)" />
        </div>

        <div className="grid items-start gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <ItemsTable
            items={data.items}
            me={me}
            writable={writable}
            onAction={(kind, itemId) => setDialog({ kind, itemId })}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <div>
              <h3 className="text-ink text-body mb-2 font-semibold">Kuryerlar — hozir nima bor</h3>
              {data.couriers.length === 0 ? (
                <p className="text-ink-faint text-meta">Bu viloyatda kuryer yo&apos;q.</p>
              ) : (
                <table className="w-full text-dense">
                  <thead className="text-ink-faint text-micro uppercase">
                    <tr className="border-line bg-subtle border-b">
                      <th className="rounded-l-md py-2 pr-2 pl-2 text-left font-semibold">Kuryer</th>
                      <th className="py-2 pr-2 text-right font-semibold">Dona</th>
                      <th className="w-24 py-2 pr-2" />
                      <th className="rounded-r-md py-2 pr-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {[...data.couriers]
                      .sort((a, b) => b.onHand - a.onHand)
                      .map((courier) => (
                        <tr key={courier.id}>
                          <td className="py-2 pr-2 pl-2">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-ink font-semibold" data-no-translit>
                                {courier.fullName}
                              </span>
                              <CourierActivity active={courier.onShift} />
                            </span>
                          </td>
                          <td className="text-ink tabular py-2 pr-2 text-right font-mono">{courier.onHand}</td>
                          <td className="py-2 pr-2">
                            <Meter value={(courier.onHand / maxCourier) * 100} color="var(--warn)" className="h-1.5" />
                          </td>
                          <td className="py-2 pr-2 text-right whitespace-nowrap">
                            {writable ? (
                              <>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label={`${courier.fullName}: berish`}
                                  title="Kuryerga berish"
                                  onClick={() => setCourierDoc({ courierId: courier.id, kind: "courier_load" })}
                                >
                                  <ArrowUpFromLine />
                                </Button>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label={`${courier.fullName}: qabul`}
                                  title="Kuryerdan qabul"
                                  disabled={courier.onHand <= 0}
                                  onClick={() => setCourierDoc({ courierId: courier.id, kind: "courier_return" })}
                                >
                                  <ArrowDownToLine />
                                </Button>
                              </>
                            ) : null}
                            <Link href={ROUTES.skladCourier(courier.id)} className="text-link hover:text-brand inline-flex items-center gap-0.5 whitespace-nowrap">
                              Ochish
                              <ArrowRight className="size-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            <HoursSpark entries={data.deliveredByHour} total={data.totals.deliveredToday} />
          </div>
        </div>
      </section>

      <DashboardCard
        title="Oxirgi harakatlar"
        aside={
          <Link href={`${ROUTES.skladLedger}?region=${data.region.code}`} className="text-link hover:text-brand">
            jurnal
          </Link>
        }
      >
        {data.recent.length === 0 ? (
          <p className="text-ink-faint text-meta">Hali harakat yo&apos;q.</p>
        ) : (
          <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
            <LedgerTable rows={data.recent} showRegion={false} compact />
          </div>
        )}
      </DashboardCard>

      {dialog ? (
        <DocumentDialog
          key={`${dialog.kind}-${dialog.itemId ?? ""}`}
          kind={dialog.kind}
          kinds={["receipt", "write_off", "adjustment"]}
          me={me}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          defaultLocationId={primary?.id ?? null}
          initialItemId={dialog.itemId ?? null}
        />
      ) : null}
      {courierDoc ? (
        <CourierDocumentLauncher
          courierId={courierDoc.courierId}
          kind={courierDoc.kind}
          me={me}
          defaultLocationId={primary?.id ?? null}
          onClose={() => setCourierDoc(null)}
        />
      ) : null}
    </div>
  );
}

function Figure({ label, value, share, color }: { label: string; value: number; share: number; color: string }) {
  return (
    <div className="min-w-0">
      <p className="text-ink-faint text-micro uppercase">{label}</p>
      <p className="text-ink tabular text-h1 font-bold">{groupThousands(value)}</p>
      <Meter value={share} color={color} className="mt-1.5 h-1.5" />
    </div>
  );
}

/** Minimalga nisbatan: 1× dan kam — qizil, 1.5× gacha — sariq, undan ko'p — yashil. */
function stockTone(row: RegionItem): string {
  const ratio = row.minQuantity > 0 ? row.total / row.minQuantity : 2;
  if (row.isLow || ratio < 1) return "var(--danger)";
  if (ratio < 1.5) return "var(--warn)";
  return "var(--ok)";
}

function ItemsTable({
  items,
  me,
  writable,
  onAction,
}: {
  items: RegionItem[];
  me: SkladMe | null;
  writable: boolean;
  /** Qatordan tezkor kirim/chiqim — mahsulot oynada tanlangan bo'ladi. */
  onAction: (kind: DocumentKind, itemId: number) => void;
}) {
  const [lowFirst, setLowFirst] = useState(true);
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle ? items.filter((row) => row.item.name.toLowerCase().includes(needle)) : items;
    if (!lowFirst) return filtered;
    return [...filtered].sort((a, b) => {
      const ra = a.minQuantity > 0 ? a.total / a.minQuantity : Infinity;
      const rb = b.minQuantity > 0 ? b.total / b.minQuantity : Infinity;
      return ra - rb;
    });
  }, [items, lowFirst, query]);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-ink text-body font-semibold">Mahsulotlar</h3>
        <div className="flex items-center gap-1.5">
          <FilterChip active={lowFirst} onClick={() => setLowFirst((value) => !value)}>
            Kam qolgan oldinda
          </FilterChip>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="⌕ mahsulot" aria-label="Mahsulot qidirish" className="h-8 w-36 rounded-lg" />
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-ink-faint text-meta">{query ? `«${query}» bo'yicha mahsulot topilmadi.` : "Bu viloyatda nazoratdagi mahsulot yo'q."}</p>
      ) : (
        <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
          <table className="w-full text-dense">
            <thead className="text-ink-faint text-micro uppercase">
              <tr className="border-line bg-subtle border-b">
                <th className="rounded-l-md py-2 pr-3 pl-2 text-left font-semibold">Mahsulot</th>
                <th className="py-2 pr-3 text-right font-semibold">Omborda</th>
                <th className="py-2 pr-3 text-right font-semibold">Kuryerlarda</th>
                <th className="py-2 pr-3 text-right font-semibold">Jami</th>
                <th className="py-2 pr-3 text-right font-semibold">Min</th>
                <th className="w-36 py-2 pr-3 text-left font-semibold">Minimalga nisbatan</th>
                <th className="py-2 pr-2 text-left font-semibold">Yetadi</th>
                {writable ? <th className="rounded-r-md py-2 pr-2" /> : null}
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {rows.map((row) => {
                const tone = stockTone(row);
                const share = row.minQuantity > 0 ? Math.min(100, (row.total / row.minQuantity) * 100) : 100;
                return (
                  <tr key={row.item.id}>
                    <td className="py-2 pr-3 pl-2">
                      <span className="flex items-center gap-1.5">
                        {row.item.pinned ? <Pin className="text-gold size-3 shrink-0" aria-label="Qadalgan" /> : null}
                        <span className="text-ink truncate font-semibold" data-no-translit>
                          {row.item.name}
                        </span>
                        {!canWriteItem(me, row.item.id) && writable ? <span className="text-ink-faint text-fine">ko&apos;rish</span> : null}
                      </span>
                    </td>
                    <td className={cn("tabular py-2 pr-3 text-right font-mono", row.isLow ? "text-warn font-semibold" : "text-ink")}>{groupThousands(row.onHand)}</td>
                    <td className="text-ink-muted tabular py-2 pr-3 text-right font-mono">{groupThousands(row.withCouriers)}</td>
                    <td className="text-ink tabular py-2 pr-3 text-right font-mono font-semibold">{groupThousands(row.total)}</td>
                    <td className="text-ink-faint tabular py-2 pr-3 text-right font-mono">{groupThousands(row.minQuantity)}</td>
                    <td className="py-2 pr-3">
                      <Meter value={share} color={tone} className="h-1.5" />
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill label={row.daysLeft === null ? "—" : `≈ ${row.daysLeft} kun`} color={tone} size="sm" />
                    </td>
                    {writable ? (
                      <td className="py-1 pr-2 text-right whitespace-nowrap">
                        {canWriteItem(me, row.item.id) ? (
                          <>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${row.item.name}: kirim`}
                              title="Kirim"
                              onClick={() => onAction("receipt", row.item.id)}
                            >
                              <Plus />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`${row.item.name}: chiqim`}
                              title="Chiqim"
                              disabled={row.onHand <= 0}
                              onClick={() => onAction("write_off", row.item.id)}
                            >
                              <Minus />
                            </Button>
                          </>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Bugun — soatlar bo'yicha yetkazildi (dizayn «8»). Soatlar uzluksiz
 * (ish kuni 09–18 har doim ko'rinadi) — bitta soat bo'lsa ham ustun
 * kartani to'ldirib yubormaydi.
 */
function HoursSpark({ entries, total }: { entries: Array<{ hour: number; count: number }>; total: number }) {
  const byHour = new Map(entries.map((entry) => [entry.hour, entry.count]));
  const first = Math.min(9, ...entries.map((entry) => entry.hour));
  const last = Math.max(18, ...entries.map((entry) => entry.hour));
  const hours = Array.from({ length: last - first + 1 }, (_, index) => first + index);
  const max = Math.max(1, ...entries.map((entry) => entry.count));

  return (
    <div>
      <h3 className="text-ink text-body mb-2 font-semibold">
        Bugun — soatlar bo&apos;yicha yetkazildi <span className="text-ink-faint text-meta font-medium">· {total}</span>
      </h3>
      {entries.length === 0 ? (
        <p className="text-ink-faint text-meta">Bugun hali yetkazilmagan.</p>
      ) : (
        <>
          <ol className="flex h-20 items-end gap-1.5" aria-label="Soatlar bo'yicha yetkazish">
            {hours.map((hour) => {
              const count = byHour.get(hour) ?? 0;
              return (
                <li key={hour} className="flex h-full flex-1 items-end" title={`${hour}:00 — ${count}`}>
                  {/* Balandlik — hisoblangan qiymat, token emas. */}
                  <span
                    className="w-full rounded-t"
                    style={{ height: `${count > 0 ? Math.max(8, (count / max) * 100) : 3}%`, backgroundColor: count > 0 ? "var(--brand)" : "var(--surface-3)" }}
                  />
                </li>
              );
            })}
          </ol>
          <ol className="mt-1 flex gap-1.5">
            {hours.map((hour) => (
              <li key={hour} className="text-ink-faint tabular flex-1 text-center text-fine">
                {String(hour).padStart(2, "0")}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
