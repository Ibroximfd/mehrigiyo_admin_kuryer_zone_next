"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createChiefPlace, createChiefZone, updateChiefZone } from "@/features/chief/api";
import { regionLabel } from "@/features/orders/regions";
import { regionOfDistrict } from "@/features/zones/types";
import type { RegionDistricts, Zone } from "@/features/zones/types";
import { errorCode, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

import { takenDistrictsOf } from "../zone-stats";
import type { TakenDistrict } from "../zone-stats";
import { codesByRegion, districtMoves, splitRegions } from "../zones";

/** Qidiruvda ko'pi bilan shuncha natija — uzun ro'yxat sekinlashmasin. */
const SEARCH_LIMIT = 80;

/**
 * Zona: nomi va tumanlari (71-javob §1). Tumanlar istalgan viloyatdan —
 * o'z viloyatlari avval, keyin boshqalari; qidiruv hamma viloyat bo'ylab.
 * Boshqa o'z zonasidagi tuman belgilansa — shu zonaga o'tadi. Boshqa bosh
 * kuryer zonasidagi tumanni server `409 district_taken` bilan qaytaradi —
 * ular formada ko'rsatiladi va bir bosishda olib tashlanadi.
 */
export function ZoneForm({
  zone,
  initialRegion,
  zones,
  dictionary,
  ownRegions,
  districtLabel,
  onClose,
}: {
  zone: Zone | null;
  initialRegion?: string;
  zones: Zone[];
  /** Hamma viloyatlar lug'ati. */
  dictionary: RegionDistricts[];
  /** Bosh kuryer viloyatlari; bo'sh — hamma viloyat (`scope=all`). */
  ownRegions: readonly string[];
  districtLabel: (code: string) => string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { own, other } = splitRegions(dictionary, ownRegions);
  const [name, setName] = useState(zone?.name ?? "");
  const [codes, setCodes] = useState<string[]>(zone?.districtCodes ?? []);
  const [view, setView] = useState(initialRegion ?? zone?.regions[0] ?? own[0]?.region ?? dictionary[0]?.region ?? "");
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const [touched, setTouched] = useState(false);
  const [query, setQuery] = useState("");
  /** Qo'lda qo'shilgan joylar — lug'at yangilanguncha nomi shu yerda. */
  const [added, setAdded] = useState<Array<{ code: string; name: string }>>([]);
  const [taken, setTaken] = useState<TakenDistrict[]>([]);

  const label = (code: string) => added.find((place) => place.code === code)?.name ?? districtLabel(code);
  const owner = (code: string) => zones.find((item) => item.id !== zone?.id && item.districtCodes.includes(code)) ?? null;
  const moving = codes.filter((code) => owner(code) !== null).length;
  const isOwnRegion = (region: string) => ownRegions.length === 0 || ownRegions.includes(region);

  const regionCodes = (region: string) => {
    const known = dictionary.find((item) => item.region === region)?.districts.filter((district) => district.isActive) ?? [];
    const extra = added.filter((place) => regionOfDistrict(place.code) === region && !known.some((d) => d.code === place.code));
    return [...known.map((district) => district.code), ...extra.map((place) => place.code)];
  };
  // Qidiruv — hamma viloyat bo'ylab (begona viloyat tumani ham topilsin); bo'sh — tanlangan viloyat.
  const searching = query.trim().length > 0;
  const visible = searching
    ? dictionary
        .flatMap((item) => regionCodes(item.region))
        .filter((code) => matchesSearch(label(code), query))
        .slice(0, SEARCH_LIMIT)
    : regionCodes(view);
  const selectedIn = (region: string) => codes.filter((code) => regionOfDistrict(code) === region).length;

  const save = useMutation({
    mutationFn: async () => {
      // O'z zonalari orasida: olingan tuman avval eski zonadan chiqariladi — bitta tuman bitta zonada.
      for (const move of districtMoves(zones, zone?.id ?? null, codes)) {
        await updateChiefZone(move.zoneId, { districtCodes: move.districtCodes });
      }
      // Viloyatni server tumanlardan o'zi oladi; `region` faqat tumansiz zona uchun (o'z viloyati).
      return zone
        ? updateChiefZone(zone.id, { name: name.trim(), districtCodes: codes, isActive })
        : createChiefZone({ region: codes.length === 0 ? view : undefined, name: name.trim(), districtCodes: codes });
    },
    onSuccess: () => {
      toast.success(zone ? "Zona saqlandi" : "Zona qo'shildi");
      void queryClient.invalidateQueries({ queryKey: queryKeys.chief });
      onClose();
    },
    onError: (error) => {
      // O'tkazish yarim qolgan bo'lishi mumkin — ro'yxat serverdan qayta olinadi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefZones });
      const rows = takenDistrictsOf(error);
      if (rows.length > 0) {
        setTaken(rows);
        toast.error(`${rows.length} ta tuman boshqa bosh kuryer zonasida`);
        return;
      }
      toast.error(
        errorCode(error) === "zone_other_region"
          ? "Tumansiz zona faqat o'z viloyatingizda bo'ladi — kamida bitta tuman tanlang"
          : errorMessage(error, "Zonani saqlashda xatolik"),
      );
    },
  });

  const toggle = (code: string) => {
    setCodes((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));
    setTaken((current) => current.filter((row) => row.district !== code));
  };
  const dropTaken = () => {
    const blocked = new Set(taken.map((row) => row.district));
    setCodes((current) => current.filter((code) => !blocked.has(code)));
    setTaken([]);
  };
  const nameError = touched && name.trim().length < 2 ? "Zona nomi kamida 2 harf bo'lsin" : undefined;

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (name.trim().length >= 2 && !save.isPending) save.mutate();
      }}
    >
      <div className="border-line border-b px-5 pt-5 pb-4">
        <DialogTitle className="text-ink text-title">{zone ? "Zonani tahrirlash" : "Yangi zona"}</DialogTitle>
        <DialogDescription className="text-ink-muted mt-1 text-meta">
          Bir nechta viloyat tumanlarini birga tanlash mumkin. Boshqa zonangizdagisini belgilasangiz — shu zonaga o&apos;tadi.
        </DialogDescription>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 md:grid-cols-5 md:overflow-hidden">
        <div className="flex flex-col gap-3.5 md:col-span-2 md:overflow-y-auto">
          <Field label="Nomi" htmlFor="zone-name" error={nameError}>
            <input
              id="zone-name"
              autoFocus
              required
              aria-invalid={Boolean(nameError)}
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
            />
          </Field>
          {zone ? (
            <div className="flex items-center gap-2.5">
              <Checkbox id="chief-zone-active" checked={isActive} onCheckedChange={(value) => setIsActive(value === true)} />
              <Label htmlFor="chief-zone-active" className="text-ink text-dense">
                Zona ishlayapti
              </Label>
            </div>
          ) : null}
          {taken.length > 0 ? <TakenNotice rows={taken} label={label} onDrop={dropTaken} /> : null}
          <SelectedSummary
            groups={codesByRegion(codes, ownRegions)}
            label={label}
            onRemove={toggle}
            onShowRegion={(region) => {
              setQuery("");
              setView(region);
            }}
          />
        </div>

        <div className="flex min-h-72 flex-col md:col-span-3 md:min-h-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select
              aria-label="Viloyat"
              value={view}
              onChange={(event) => {
                setQuery("");
                setView(event.target.value);
              }}
              className={cn(inputClass, "min-w-0 flex-1 basis-40")}
            >
              <optgroup label={ownRegions.length ? "Sizning viloyatlaringiz" : "Viloyatlar"}>
                {own.map((item) => (
                  <option key={item.region} value={item.region}>
                    {regionOptionLabel(item.region, selectedIn(item.region))}
                  </option>
                ))}
              </optgroup>
              {other.length > 0 ? (
                <optgroup label="Boshqa viloyatlar">
                  {other.map((item) => (
                    <option key={item.region} value={item.region}>
                      {regionOptionLabel(item.region, selectedIn(item.region))}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Hamma viloyatdan qidirish"
              autoFocusShortcut={false}
              className="min-w-0 flex-1 basis-40"
            />
          </div>
          {!searching && !isOwnRegion(view) ? (
            <p className="text-ink-muted mb-2 text-meta">
              Bu viloyat sizga biriktirilmagan — tanlangan tumandagi zakazlar sizga tushadi.
            </p>
          ) : null}
          {searching && visible.length === SEARCH_LIMIT ? (
            <p className="text-ink-faint mb-2 text-meta">{`Birinchi ${SEARCH_LIMIT} ta natija — qidiruvni aniqlashtiring`}</p>
          ) : null}
          <div className="scrollbar-thin border-line min-h-0 flex-1 overflow-y-auto rounded-xl border p-1.5">
            {visible.length === 0 ? (
              <p className="text-ink-faint px-2 py-6 text-center text-meta">
                {searching ? "Bunday tuman yo'q" : "Viloyat tumanlari yuklanmoqda yoki topilmadi"}
              </p>
            ) : (
              <div className="grid gap-0.5 sm:grid-cols-2">
                {visible.map((code) => {
                  const other = owner(code);
                  const checked = codes.includes(code);
                  return (
                    <label key={code} className="hover:bg-subtle flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-dense">
                      <Checkbox checked={checked} onCheckedChange={() => toggle(code)} />
                      <span className="min-w-0 flex-1 truncate">
                        <span data-no-translit>{label(code)}</span>
                        {searching ? <span className="text-ink-faint text-fine">{` · ${regionLabel(regionOfDistrict(code))}`}</span> : null}
                      </span>
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
          {!searching && isOwnRegion(view) ? (
            <CustomPlace
              region={view}
              onAdded={(place) => {
                setAdded((current) => [...current, place]);
                setCodes((current) => (current.includes(place.code) ? current : [...current, place.code]));
              }}
            />
          ) : null}
        </div>
      </div>

      <div className="border-line pb-safe-4 flex flex-wrap items-center justify-end gap-2 border-t px-5 pt-3.5">
        <p className="text-ink-muted mr-auto text-meta">
          {`${codes.length} ta tuman`}
          {moving > 0 ? <span className="text-warn">{` · ${moving} tasi boshqa zonadan o'tadi`}</span> : null}
        </p>
        <Button type="button" variant="ghost" onClick={onClose}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </form>
  );
}

/** `409 district_taken`: qaysi tuman kimning zonasida — olib tashlamaguncha saqlanmaydi. */
function TakenNotice({ rows, label, onDrop }: { rows: TakenDistrict[]; label: (code: string) => string; onDrop: () => void }) {
  return (
    <div role="alert" className="bg-warn-soft flex flex-col gap-2 rounded-xl p-3">
      <p className="text-warn flex items-center gap-2 text-dense font-semibold">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        Boshqa bosh kuryer zonasida
      </p>
      <ul className="text-ink flex flex-col gap-1 text-meta">
        {rows.map((row) => (
          <li key={row.district}>
            <span className="font-medium" data-no-translit>
              {label(row.district)}
            </span>
            <span className="text-ink-muted" data-no-translit>
              {` — ${row.zoneName}${row.chiefName ? ` · ${row.chiefName}` : ""}`}
            </span>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="outline" className="self-start" onClick={onDrop}>
        <X />
        Ularni olib tashlash
      </Button>
    </div>
  );
}

function regionOptionLabel(region: string, selected: number): string {
  return selected > 0 ? `${regionLabel(region)} · ${selected}` : regionLabel(region);
}

/** Tanlangan tumanlar — viloyat bo'yicha, har biri olib tashlanadi. */
function SelectedSummary({
  groups,
  label,
  onRemove,
  onShowRegion,
}: {
  groups: Array<[string, string[]]>;
  label: (code: string) => string;
  onRemove: (code: string) => void;
  onShowRegion: (region: string) => void;
}) {
  if (groups.length === 0) {
    return <p className="bg-subtle text-ink-muted rounded-xl px-3 py-3 text-meta">Hali tuman tanlanmagan — o&apos;ngdagi ro&apos;yxatdan belgilang.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink text-dense font-medium">Tanlangan</p>
      {groups.map(([region, codes]) => (
        <div key={region} className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onShowRegion(region)}
            className="text-ink-faint hover:text-ink self-start text-micro uppercase"
          >
            {`${regionLabel(region)} · ${codes.length}`}
          </button>
          <span className="flex flex-wrap gap-1.5">
            {codes.map((code) => (
              <span key={code} className="bg-brand-soft text-brand inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-meta">
                <span data-no-translit>{label(code)}</span>
                <button
                  type="button"
                  aria-label={`${label(code)}: olib tashlash`}
                  onClick={() => onRemove(code)}
                  className="hover:bg-brand/15 rounded p-0.5"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** «Boshqa — o'zim yozaman»: ro'yxatda yo'q joy o'z viloyatiga qo'shiladi. */
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
      <Button type="button" variant="ghost" size="sm" className="mt-2 self-start" onClick={() => setOpen(true)} disabled={!region}>
        <Plus />
        Ro&apos;yxatda yo&apos;q joy qo&apos;shish
      </Button>
    );
  }
  const submit = () => {
    setTried(true);
    if (name.trim().length >= 2 && !add.isPending) add.mutate();
  };
  return (
    <Field
      label={`${regionLabel(region)}: ro'yxatda yo'q joy`}
      htmlFor="place-name"
      hint="Tuman, shahar yoki qishloq nomi — saqlangach ro'yxatda turadi."
      error={tried && name.trim().length < 2 ? "Joy nomi kamida 2 harf bo'lsin" : undefined}
      className="mt-3"
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
