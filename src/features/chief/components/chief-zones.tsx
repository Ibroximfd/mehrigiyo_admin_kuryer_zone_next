"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hexagon, LoaderCircle, Pencil, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createChiefZone, fetchChiefZones, updateChiefZone } from "@/features/chief/api";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { districtName } from "@/features/zones/types";
import type { RegionDistricts, Zone } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useLocaleStore } from "@/stores/locale-store";

/**
 * Bosh kuryer zonalari (§C 2.3) — faqat o'z viloyat(lar)i. Kassa sukuti
 * bosh kuryerning o'zi (server qo'yadi): kuryerlar pulni unga topshiradi.
 */
export function ChiefZones({ me }: { me: ChiefMe }) {
  const locale = useLocaleStore((state) => state.locale);
  const canManage = chiefCan(me, "zones.manage");
  const [editing, setEditing] = useState<Zone | "new" | null>(null);
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const dictionary = useRegionsDictionary();
  const regions = (dictionary.data ?? []).filter((item) => me.regions.includes(item.region));
  const nameOf = (code: string) => {
    for (const region of regions) {
      const found = region.districts.find((district) => district.code === code);
      if (found) return districtName(found, locale);
    }
    return code;
  };

  const list = zones.data?.zones ?? [];
  const unzoned = zones.data?.unzonedDistricts ?? [];

  return (
    <div className="flex flex-col gap-3.5">
      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus />
            Zona qo&apos;shish
          </Button>
        </div>
      ) : null}

      {unzoned.length > 0 ? (
        <p role="status" className="bg-warn-soft text-warn flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {`Zonasiz tumanlar · ${unzoned.length}: `}
            <span data-no-translit>{unzoned.map(nameOf).join(", ")}</span>
          </span>
        </p>
      ) : null}

      {zones.isPending ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : zones.isError ? (
        <ErrorView message={errorMessage(zones.error, "Zonalarni yuklashda xatolik")} onRetry={() => void zones.refetch()} className="border-line bg-surface rounded-xl border" />
      ) : list.length === 0 ? (
        <EmptyView Icon={Hexagon} title="Zona yo'q" description="Tumanlarni zonalarga bo'ling — avto taqsimlash zonaga qarab ishlaydi." className="border-line bg-surface rounded-xl border" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((zone) => (
            <li key={zone.id} className="border-line bg-surface flex flex-col gap-2 rounded-2xl border p-4">
              <div className="flex items-center gap-2">
                <Hexagon className="text-brand size-4 shrink-0" aria-hidden />
                <span className="text-ink min-w-0 flex-1 truncate text-dense font-semibold" data-no-translit>{zone.name}</span>
                {zone.isActive ? null : <StatusPill label="nofaol" color="var(--ink-faint)" size="sm" />}
                {canManage ? (
                  <Button size="icon-sm" variant="ghost" aria-label={`${zone.name}: tahrirlash`} onClick={() => setEditing(zone)}>
                    <Pencil />
                  </Button>
                ) : null}
              </div>
              <p className="text-ink-muted text-meta leading-relaxed" data-no-translit>
                {zone.districtCodes.map(nameOf).join(", ") || "Tuman yo'q"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className="flex max-h-[85vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col">
          {editing !== null ? (
            <ZoneForm
              key={editing === "new" ? "new" : editing.id}
              zone={editing === "new" ? null : editing}
              regions={regions}
              locale={locale}
              onClose={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ZoneForm({
  zone,
  regions,
  locale,
  onClose,
}: {
  zone: Zone | null;
  regions: RegionDistricts[];
  locale: ReturnType<typeof useLocaleStore.getState>["locale"];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(zone?.name ?? "");
  const [region, setRegion] = useState(zone?.region ?? regions[0]?.region ?? "");
  const [codes, setCodes] = useState<string[]>(zone?.districtCodes ?? []);
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const districts = regions.find((item) => item.region === region)?.districts.filter((district) => district.isActive) ?? [];

  const save = useMutation({
    mutationFn: () =>
      zone
        ? updateChiefZone(zone.id, { name: name.trim(), districtCodes: codes, isActive })
        : createChiefZone({ region, name: name.trim(), districtCodes: codes }),
    onSuccess: () => {
      toast.success(zone ? "Zona saqlandi" : "Zona qo'shildi");
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefZones });
      void queryClient.invalidateQueries({ queryKey: ["zones"] });
      onClose();
    },
    onError: (error) => toast.error(errorMessage(error, "Zonani saqlashda xatolik")),
  });

  const toggle = (code: string) =>
    setCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim() && region) save.mutate();
      }}
    >
      <DialogTitle>{zone ? "Zonani tahrirlash" : "Zona qo'shish"}</DialogTitle>
      <DialogDescription>Tumanlarni belgilang — avto taqsimlash shunga qarab ishlaydi.</DialogDescription>
      <div className="mt-3 space-y-3">
        <Field label="Nomi">
          <input autoFocus value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </Field>
        {!zone && regions.length > 1 ? (
          <Field label="Viloyat">
            <select
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                setCodes([]);
              }}
              className={inputClass}
            >
              {regions.map((item) => (
                <option key={item.region} value={item.region}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      <p className="text-ink-muted mt-3 mb-1.5 text-meta font-medium">{`Tumanlar · ${codes.length}`}</p>
      <div className="scrollbar-thin border-line min-h-0 flex-1 overflow-y-auto rounded-lg border p-2">
        <div className="grid gap-1 sm:grid-cols-2">
          {districts.map((district) => (
            <label key={district.code} className="hover:bg-subtle flex items-center gap-2 rounded-md px-2 py-1.5 text-dense">
              <Checkbox checked={codes.includes(district.code)} onCheckedChange={() => toggle(district.code)} />
              <span data-no-translit>{districtName(district, locale)}</span>
            </label>
          ))}
        </div>
      </div>
      {zone ? (
        <div className="mt-3 flex items-center gap-2.5">
          <Checkbox id="chief-zone-active" checked={isActive} onCheckedChange={(value) => setIsActive(value === true)} />
          <Label htmlFor="chief-zone-active" className="text-ink text-dense">Faol</Label>
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor
        </Button>
        <Button type="submit" disabled={!name.trim() || !region || save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}
