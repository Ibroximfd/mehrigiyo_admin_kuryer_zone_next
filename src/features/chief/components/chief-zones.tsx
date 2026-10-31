"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hexagon, LoaderCircle, Pencil, Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ADAPTIVE_DIALOG } from "@/components/kit/adaptive-dialog";
import { Field, inputClass } from "@/components/kit/field";
import { Section } from "@/components/kit/key-figures";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createChiefPlace, createChiefZone, fetchChiefCouriers, fetchChiefZones, updateChiefZone } from "@/features/chief/api";
import { chiefCan } from "@/features/chief/types";
import type { ChiefMe } from "@/features/chief/types";
import { regionLabel } from "@/features/orders/regions";
import { districtName } from "@/features/zones/types";
import type { RegionDistricts, Zone } from "@/features/zones/types";
import { useRegionsDictionary } from "@/features/zones/use-zones";
import { errorCode, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale-store";

import { districtMoves } from "../zones";

/**
 * Zonalar (§5b): bosh kuryer faqat o'z viloyatlari ichida zona yaratadi va
 * unga tuman/shaharlarni xohlagancha biriktiradi, olib tashlaydi yoki
 * boshqa zonaga o'tkazadi. Avto-taqsimlash zakazni zona kuryeriga beradi.
 */
export function ChiefZones({ me }: { me: ChiefMe }) {
  const locale = useLocaleStore((state) => state.locale);
  const canManage = chiefCan(me, "zones.manage");
  const [editing, setEditing] = useState<Zone | "new" | null>(null);
  const zones = useQuery({ queryKey: queryKeys.chiefZones, queryFn: ({ signal }) => fetchChiefZones(signal) });
  const couriers = useQuery({ queryKey: queryKeys.chiefCouriers, queryFn: ({ signal }) => fetchChiefCouriers(signal) });
  const dictionary = useRegionsDictionary();
  const regions = (dictionary.data ?? []).filter((item) => me.regions.includes(item.region));

  const nameOf = (code: string) => {
    for (const region of regions) {
      const found = region.districts.find((district) => district.code === code);
      if (found) return districtName(found, locale);
    }
    return code;
  };
  const couriersIn = (zoneId: number) =>
    (couriers.data ?? []).filter((courier) => courier.isActive && courier.zoneIds.includes(zoneId)).length;

  const list = zones.data?.zones ?? [];
  const unzoned = zones.data?.unzonedDistricts ?? [];

  if (zones.isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Yuklanmoqda">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-36 rounded-2xl" />
        ))}
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

  const addButton = canManage ? (
    <Button onClick={() => setEditing("new")}>
      <Plus />
      Zona qo&apos;shish
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {unzoned.length > 0 ? (
        <p role="status" className="bg-warn-soft text-warn flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-meta leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {`Hech qaysi zonada emas · ${unzoned.length}: `}
            <span data-no-translit>{unzoned.map(nameOf).join(", ")}</span>
          </span>
        </p>
      ) : null}

      {list.length === 0 ? (
        <EmptyView
          Icon={Hexagon}
          title="Hali zona yo'q"
          description="Viloyatingiz tuman va shaharlarini zonalarga bo'ling — zakaz manzili qaysi zonada bo'lsa, o'sha zona kuryeriga tushadi."
          action={addButton}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : (
        groupByRegion(list, me.regions).map(([region, items], index) => (
          <Section
            key={region}
            title={regionLabel(region)}
            description={`${items.length} ta zona`}
            action={index === 0 ? addButton : null}
          >
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((zone) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  districts={zone.districtCodes.map(nameOf)}
                  couriers={couriersIn(zone.id)}
                  canManage={canManage}
                  onEdit={() => setEditing(zone)}
                />
              ))}
            </ul>
          </Section>
        ))
      )}

      <Dialog open={editing !== null} onOpenChange={(next) => !next && setEditing(null)}>
        <DialogContent className={cn(ADAPTIVE_DIALOG, "sm:max-w-3xl")}>
          {editing !== null ? (
            <ZoneForm
              key={editing === "new" ? "new" : editing.id}
              zone={editing === "new" ? null : editing}
              zones={list}
              regions={regions}
              districtLabel={nameOf}
              onClose={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Zonalar viloyat bo'yicha — bosh kuryer viloyatlari tartibida. */
function groupByRegion(zones: Zone[], order: string[]): Array<[string, Zone[]]> {
  const groups = new Map<string, Zone[]>();
  for (const zone of zones) groups.set(zone.region, [...(groups.get(zone.region) ?? []), zone]);
  const rank = (region: string) => (order.includes(region) ? order.indexOf(region) : order.length);
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

function ZoneCard({
  zone,
  districts,
  couriers,
  canManage,
  onEdit,
}: {
  zone: Zone;
  districts: string[];
  couriers: number;
  canManage: boolean;
  onEdit: () => void;
}) {
  return (
    <li className={cn("border-line bg-surface flex flex-col gap-3 rounded-2xl border p-4", !zone.isActive && "opacity-70")}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-body font-semibold" data-no-translit>{zone.name}</span>
          <span className="text-ink-faint text-meta">
            {`${districts.length} tuman · ${couriers} kuryer`}
          </span>
        </span>
        {zone.isActive ? null : <StatusPill label="o'chirilgan" color="var(--ink-faint)" size="sm" />}
        {canManage ? (
          <Button size="icon-sm" variant="ghost" aria-label={`${zone.name}: tahrirlash`} onClick={onEdit}>
            <Pencil />
          </Button>
        ) : null}
      </div>
      {districts.length > 0 ? (
        <span className="flex flex-wrap gap-1.5">
          {districts.map((name) => (
            <span key={name} className="bg-subtle text-ink-muted rounded-md px-2 py-0.5 text-meta" data-no-translit>
              {name}
            </span>
          ))}
        </span>
      ) : (
        <span className="text-warn text-meta">Tuman biriktirilmagan</span>
      )}
    </li>
  );
}

function ZoneForm({
  zone,
  zones,
  regions,
  districtLabel,
  onClose,
}: {
  zone: Zone | null;
  zones: Zone[];
  regions: RegionDistricts[];
  districtLabel: (code: string) => string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(zone?.name ?? "");
  const [region, setRegion] = useState(zone?.region ?? regions[0]?.region ?? "");
  const [codes, setCodes] = useState<string[]>(zone?.districtCodes ?? []);
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [query, setQuery] = useState("");
  /** Qo'lda qo'shilgan joylar — lug'at yangilanguncha nomi shu yerda. */
  const [added, setAdded] = useState<Array<{ code: string; name: string }>>([]);

  const known = regions.find((item) => item.region === region)?.districts.filter((district) => district.isActive) ?? [];
  const districts = [
    ...known.map((district) => district.code),
    ...added.map((place) => place.code).filter((code) => !known.some((district) => district.code === code)),
  ];
  const label = (code: string) => added.find((place) => place.code === code)?.name ?? districtLabel(code);
  const visible = districts.filter((code) => matchesSearch(label(code), query));
  const owner = (code: string) => zones.find((item) => item.id !== zone?.id && item.districtCodes.includes(code)) ?? null;
  const moving = codes.filter((code) => owner(code) !== null).length;

  const save = useMutation({
    mutationFn: async () => {
      // Boshqa zonadan olingan tumanlar avval o'sha zonadan chiqariladi — bitta tuman bitta zonada.
      for (const move of districtMoves(zones, zone?.id ?? null, codes)) {
        await updateChiefZone(move.zoneId, { districtCodes: move.districtCodes });
      }
      return zone
        ? updateChiefZone(zone.id, { name: name.trim(), districtCodes: codes, isActive })
        : createChiefZone({ region, name: name.trim(), districtCodes: codes });
    },
    onSuccess: () => {
      toast.success(zone ? "Zona saqlandi" : "Zona qo'shildi");
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => {
      // O'tkazish yarim qolgan bo'lishi mumkin — ro'yxat serverdan qayta olinadi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefZones });
      toast.error(errorMessage(error, "Zonani saqlashda xatolik"));
    },
  });

  const toggle = (code: string) =>
    setCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (name.trim().length >= 2 && region && !save.isPending) save.mutate();
      }}
    >
      <div className="border-line border-b px-5 pt-5 pb-4">
        <DialogTitle className="text-ink text-title">{zone ? "Zonani tahrirlash" : "Yangi zona"}</DialogTitle>
        <DialogDescription className="text-ink-muted mt-1 text-meta">
          Tuman va shaharlarni belgilang. Boshqa zonadagisini belgilasangiz — shu zonaga o&apos;tadi.
        </DialogDescription>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 md:grid-cols-5 md:overflow-hidden">
        <div className="flex flex-col gap-3.5 md:col-span-2">
          <Field
            label="Nomi"
            htmlFor="zone-name"
            error={touched && name.trim().length < 2 ? "Zona nomi kamida 2 harf bo'lsin" : undefined}
          >
            <input
              id="zone-name"
              autoFocus
              required
              aria-invalid={touched && name.trim().length < 2}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </Field>
          {!zone && regions.length > 1 ? (
            <Field label="Viloyat" htmlFor="zone-region">
              <select
                id="zone-region"
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  setCodes([]);
                }}
                className={inputClass}
              >
                {regions.map((item) => (
                  <option key={item.region} value={item.region}>
                    {regionLabel(item.region)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <CustomPlace
            region={region}
            onAdded={(place) => {
              setAdded((current) => [...current, place]);
              setCodes((current) => (current.includes(place.code) ? current : [...current, place.code]));
            }}
          />
          {zone ? (
            <div className="flex items-center gap-2.5">
              <Checkbox id="chief-zone-active" checked={isActive} onCheckedChange={(value) => setIsActive(value === true)} />
              <Label htmlFor="chief-zone-active" className="text-ink text-dense">
                Zona ishlayapti
              </Label>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-64 flex-col md:col-span-3 md:min-h-0">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-ink flex-1 text-dense font-medium">
              {`Tumanlar · ${codes.length}`}
              {moving > 0 ? <span className="text-warn font-normal">{` · ${moving} tasi o'tadi`}</span> : null}
            </p>
            {districts.length > 8 ? (
              <SearchInput value={query} onChange={setQuery} placeholder="Tuman qidirish" autoFocusShortcut={false} className="w-44" />
            ) : null}
          </div>
          <div className="scrollbar-thin border-line min-h-0 flex-1 overflow-y-auto rounded-xl border p-1.5">
            {districts.length === 0 ? (
              <p className="text-ink-faint px-2 py-6 text-center text-meta">Viloyat tumanlari yuklanmoqda yoki topilmadi</p>
            ) : visible.length === 0 ? (
              <p className="text-ink-faint px-2 py-6 text-center text-meta">Bunday tuman yo&apos;q</p>
            ) : (
              <div className="grid gap-0.5 sm:grid-cols-2">
                {visible.map((code) => {
                  const other = owner(code);
                  const checked = codes.includes(code);
                  return (
                    <label key={code} className="hover:bg-subtle flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-dense">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(code)} />
                      <span className="min-w-0 flex-1 truncate" data-no-translit>{label(code)}</span>
                      {other ? (
                        <span className={cn("shrink-0 truncate text-fine", checked ? "text-warn" : "text-ink-faint")} data-no-translit>
                          {other.name}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-line flex justify-end gap-2 border-t px-5 py-3.5">
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={!region || save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}

/** «Boshqa — o'zim yozaman»: ro'yxatda yo'q tuman, shahar yoki qishloq lug'atga qo'shiladi. */
function CustomPlace({ region, onAdded }: { region: string; onAdded: (place: { code: string; name: string }) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const add = useMutation({
    mutationFn: () => createChiefPlace({ region, name: name.trim() }),
    onSuccess: (place) => {
      toast.success(`${place.name} qo'shildi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.metaRegions });
      onAdded(place);
      setName("");
      setTried(false);
      setOpen(false);
    },
    onError: (error) =>
      toast.error(
        errorCode(error) === "zone_other_region"
          ? "Bu viloyat sizga biriktirilmagan — joyni faqat o'z viloyatingizga qo'sha olasiz"
          : errorMessage(error, "Joyni qo'shishda xatolik"),
      ),
  });

  if (!open) {
    return (
      <Button type="button" variant="outline" className="self-start" onClick={() => setOpen(true)} disabled={!region}>
        <Plus />
        Boshqa — o&apos;zim yozaman
      </Button>
    );
  }
  const submit = () => {
    setTried(true);
    if (name.trim().length >= 2 && !add.isPending) add.mutate();
  };
  return (
    <Field
      label="Ro'yxatda yo'q joy"
      htmlFor="place-name"
      hint="Tuman, shahar yoki qishloq nomi — saqlangach ro'yxatda turadi."
      error={tried && name.trim().length < 2 ? "Joy nomi kamida 2 harf bo'lsin" : undefined}
    >
      <div className="flex gap-2">
        <input
          id="place-name"
          autoFocus
          aria-invalid={tried && name.trim().length < 2}
          value={name}
          maxLength={80}
          placeholder="Masalan, Yangiqo'rg'on qishlog'i"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            // Asosiy forma yuborilmasin — Enter faqat joyni qo'shadi.
            if (event.key !== "Enter") return;
            event.preventDefault();
            submit();
          }}
          className={inputClass}
        />
        <Button type="button" onClick={submit} disabled={add.isPending}>
          {add.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
          Qo&apos;shish
        </Button>
      </div>
    </Field>
  );
}
