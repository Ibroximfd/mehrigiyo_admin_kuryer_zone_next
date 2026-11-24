"use client";

import { useQuery } from "@tanstack/react-query";
import { Hexagon, ListTree, MapPinOff, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { ADAPTIVE_DIALOG } from "@/components/kit/adaptive-dialog";
import { KeyFigures } from "@/components/kit/key-figures";
import { PeriodPicker } from "@/components/kit/period-picker";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChiefCouriers, fetchChiefZones, fetchChiefZoneStats } from "@/features/chief/api";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { districtName } from "@/features/zones/types";
import type { Zone } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { useDayRange } from "@/hooks/use-day-range";
import { errorMessage } from "@/lib/api-client";
import { groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

import type { OrderCounts, ZoneStats } from "../zone-stats";
import { sortZones } from "../zones";
import { DistrictsManager } from "./chief-districts";
import { ZoneCard } from "./zone-card";
import type { CountsState } from "./zone-card";
import { ZoneDeleteDialog } from "./zone-delete-dialog";
import { ZoneForm } from "./zone-form";

/**
 * Zonalar (§5b, hujjat 69): zona bir nechta viloyat tumanlaridan, begona
 * viloyatdan ham. Har tuman va zona yonida OCHIQ zakazlar soni: kuryersiz +
 * kuryerda. Yetkazilgani bu sahifada yo'q (egasi, 2026-11-23 — taqsimlashga
 * xalaqit berardi). Sonlar davrsiz — oldingi kunlardan ochiq qolgan zakazlar
 * ham sanaladi (egasi, 2026-11-24; server `open=1`, 118 §5). Eski serverda
 * sonlar tepada tanlangan davr bo'yicha — davr tanlovi faqat o'shanda chiqadi.
 * Zonani tahrirlash va o'chirish (faol zakaz bo'lsa — yo'q).
 */
export function ChiefZones({ me }: { me: ChiefMe }) {
  const locale = useLocaleStore((state) => state.locale);
  const canManage = chiefCan(me, "zones.manage");
  const period = useDayRange();
  const [editing, setEditing] = useState<{ zone: Zone | null } | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const [districtsOpen, setDistrictsOpen] = useState(false);
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const stats = useQuery({
    queryKey: queryKeys.chiefZoneStats(period.from, period.to),
    queryFn: ({ signal }) => fetchChiefZoneStats(period.from, period.to, signal),
    // Davr almashganda eski raqamlar o'rnida turadi — karta sakramaydi.
    placeholderData: (previous) => previous,
  });
  const dictionary = useRegionsDictionary();
  const all = dictionary.data ?? [];
  // `scope=all` bosh kuryerda `regions` bo'sh — hamma viloyat o'ziniki (51-javob Q13).
  const ownDictionary = me.regions.length > 0 ? all.filter((item) => me.regions.includes(item.region)) : all;

  // Nom — butun lug'atdan: zonada begona viloyat tumani ham bo'ladi.
  const nameOf = (code: string) => {
    for (const region of all) {
      const found = region.districts.find((district) => district.code === code);
      if (found) return districtName(found, locale);
    }
    return code;
  };
  const couriersIn = (zoneId: number) =>
    (couriers.data ?? []).filter((courier) => courier.isActive && courier.zoneIds.includes(zoneId)).length;

  const list = sortZones(zones.data?.zones ?? []);
  const unzoned = zones.data?.unzonedDistricts ?? [];
  const countsOf = (zoneId: number): CountsState =>
    stats.isError
      ? { kind: "hidden" }
      : stats.data
        ? { kind: "ready", stats: stats.data.zones.get(zoneId) ?? null }
        : { kind: "loading" };

  if (zones.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-label="Yuklanmoqda">
        <Skeleton className="h-10 w-72 rounded-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (zones.isError) {
    return (
      <ErrorView
        message={errorMessage(zones.error, "Zonalarni yuklashda xatolik")}
        onRetry={() => void zones.refetch()}
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {stats.isPending ? (
          <Skeleton className="h-10 min-w-0 flex-1 rounded-full" />
        ) : stats.data?.openMode ? (
          <p className="text-ink-muted min-w-0 flex-1 text-dense">Hozir ochiq zakazlar: kuryersiz va kuryerda — sanasidan qat&apos;i nazar.</p>
        ) : (
          <PeriodPicker period={period} className="min-w-0 flex-1" />
        )}
        {/* Tumanlar — har bosh kuryerga o'z viloyatida (51-javob Q13); zona qo'shish — dopusk bilan. */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Button variant="outline" onClick={() => setDistrictsOpen(true)}>
            <ListTree />
            Tumanlar
          </Button>
          {canManage ? (
            <Button onClick={() => setEditing({ zone: null })}>
              <Plus />
              Zona qo&apos;shish
            </Button>
          ) : null}
        </div>
      </div>

      {stats.isError ? (
        // Sonlar yuklanmasa ham zonalar ishlaydi — faqat qayta urinish taklif qilinadi.
        <p role="alert" className="text-danger flex flex-wrap items-center gap-2 text-meta">
          {errorMessage(stats.error, "Zakaz sonlarini yuklashda xatolik")}
          <Button size="sm" variant="ghost" onClick={() => void stats.refetch()}>
            <RefreshCw />
            Qayta urinish
          </Button>
        </p>
      ) : (
        <StatsFigures stats={stats.data ?? null} />
      )}

      <UnzonedBanner codes={unzoned} nameOf={nameOf} stats={stats.data ?? null} />

      {list.length === 0 ? (
        <EmptyView
          Icon={Hexagon}
          title="Hali zona yo'q"
          description="Tuman va shaharlarni zonalarga bo'ling — zakaz manzili qaysi zonada bo'lsa, o'sha zona kuryeriga tushadi. Bir zonaga bir nechta viloyat tumanlari ham sig'adi."
          action={
            canManage ? (
              <Button onClick={() => setEditing({ zone: null })}>
                <Plus />
                Zona qo&apos;shish
              </Button>
            ) : undefined
          }
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              counts={countsOf(zone.id)}
              couriers={couriersIn(zone.id)}
              ownRegions={me.regions}
              districtLabel={nameOf}
              canManage={canManage}
              onEdit={() => setEditing({ zone })}
              onDelete={() => setDeleting(zone)}
            />
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className={cn(ADAPTIVE_DIALOG, "sm:max-w-4xl")}>
          {editing !== null ? (
            <ZoneForm
              key={editing.zone?.id ?? "new"}
              zone={editing.zone}
              zones={zones.data?.zones ?? []}
              dictionary={all}
              ownRegions={me.regions}
              districtLabel={nameOf}
              onClose={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ZoneDeleteDialog zone={deleting} couriers={deleting ? couriersIn(deleting.id) : 0} onClose={() => setDeleting(null)} />

      <Dialog open={districtsOpen} onOpenChange={setDistrictsOpen}>
        <DialogContent className={cn(ADAPTIVE_DIALOG, "sm:max-w-3xl")}>
          {districtsOpen ? (
            <DistrictsManager regions={ownDictionary} zones={zones.data?.zones ?? []} onClose={() => setDistrictsOpen(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Davr bo'yicha ochiq zakazlar: jami (kuryersiz + kuryerda) · kuryersiz · kuryerda. */
function StatsFigures({ stats }: { stats: ZoneStats | null }) {
  if (!stats) return <Skeleton className="h-20 rounded-2xl" />;
  const { total } = stats;
  return (
    <KeyFigures
      items={[
        { label: "Jami zakaz", value: total.open === null ? "—" : groupThousands(total.open) },
        {
          label: "Kuryersiz",
          value: groupThousands(total.incoming),
          tone: total.incoming > 0 ? "warn" : "default",
          hint: total.incoming > 0 ? "Kuryerga berilmagan" : undefined,
        },
        { label: "Kuryerda", value: groupThousands(total.withCourier) },
      ]}
    />
  );
}

/**
 * Zonasiz joylar: o'z viloyatlaridagi zonaga kirmagan tumanlar (ro'yxatdan) va
 * server `unzoned` da sanagan, zakazi bor tumanlar — ular orasida begona zonadagi
 * tumandan qolgan eski zakaz ham bo'ladi (71-javob §3). Zakazlisi oldinda.
 * Son — ochiq zakazlar; server bu qatorda bo'linishni bermasa (`open: null`) jami qoladi.
 */
function UnzonedBanner({ codes, nameOf, stats }: { codes: string[]; nameOf: (code: string) => string; stats: ZoneStats | null }) {
  const shown = (counts: OrderCounts | undefined) => (counts ? (counts.open ?? counts.orders) : 0);
  const countOf = (code: string) => shown(stats?.unzoned.districts.get(code));
  const withOrders = [...(stats?.unzoned.districts.keys() ?? [])].filter((code) => countOf(code) > 0);
  const all = [...new Set([...codes, ...withOrders])].sort((a, b) => countOf(b) - countOf(a));
  const orders = shown(stats?.unzoned);
  const noDistrict = shown(stats?.noDistrict);
  if (all.length === 0 && noDistrict === 0) return null;

  return (
    <div role="status" className="bg-warn-soft text-warn flex flex-col gap-1 rounded-xl px-3.5 py-2.5 text-meta leading-relaxed">
      {all.length > 0 ? (
        <p className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {`Hech qaysi zonada emas · ${all.length} tuman`}
            {orders > 0 ? <span className="font-semibold">{` · ${orders} zakaz`}</span> : null}
            {": "}
            <span data-no-translit>
              {all.map((code) => (countOf(code) > 0 ? `${nameOf(code)} (${countOf(code)})` : nameOf(code))).join(", ")}
            </span>
          </span>
        </p>
      ) : null}
      {noDistrict > 0 ? (
        <p className="flex items-start gap-2">
          <MapPinOff className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-semibold">{`Tumani aniqlanmagan · ${noDistrict} zakaz`}</span>
            {" — zakaz kartasida tumanini tanlang"}
          </span>
        </p>
      ) : null}
    </div>
  );
}
