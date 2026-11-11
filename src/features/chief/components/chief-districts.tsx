"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { SearchInput } from "@/components/kit/search-input";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createChiefPlace, updateChiefPlace } from "@/features/chief/api";
import type { ChiefPlacePatch } from "@/features/chief/api";
import { regionLabel } from "@/features/orders/regions";
import { isCustomDistrict, isRenamedDistrict } from "@/features/zones/types";
import type { RegionDistricts, Zone } from "@/features/zones/types";
import { errorCode, errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

import { districtNameError, districtRows } from "../districts";
import type { DistrictRow } from "../districts";

/**
 * Tumanlar (hujjat 51): lug'atdagi tumanlar sukut holida chiqadi — bosh kuryer
 * nomini tuzatadi, keraksizini yashiradi, yo'g'ini qo'shadi. Lug'at saytda
 * yagona (`/meta/regions/`): o'zgarish zonalar, zakaz filtri va manzil
 * tuzatishda darhol ko'rinadi.
 */
export function DistrictsManager({
  regions,
  zones,
  onClose,
}: {
  regions: RegionDistricts[];
  zones: Zone[];
  onClose: () => void;
}) {
  const [regionCode, setRegionCode] = useState(regions[0]?.region ?? "");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const region = regions.find((item) => item.region === regionCode);
  const rows = districtRows(region, zones);
  const visible = rows.filter((row) => matchesSearch(`${row.district.nameUz} ${row.district.nameRu ?? ""}`, query));
  const hidden = rows.filter((row) => !row.district.isActive).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line border-b px-5 pt-5 pb-4">
        <DialogTitle className="text-ink text-title">Tumanlar</DialogTitle>
        <DialogDescription className="text-ink-muted mt-1 text-meta">
          Ro&apos;yxat sukut bo&apos;yicha chiqadi. Nomi xato bo&apos;lsa tuzating, keraksizini yashiring, yo&apos;g&apos;ini qo&apos;shing —
          zonalar, filtr va manzil tuzatishda shu ro&apos;yxat ishlaydi.
        </DialogDescription>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        {regions.length > 1 ? (
          <select
            aria-label="Viloyat"
            value={regionCode}
            onChange={(event) => {
              setRegionCode(event.target.value);
              setEditing(null);
            }}
            className={cn(inputClass, "w-auto")}
          >
            {regions.map((item) => (
              <option key={item.region} value={item.region}>
                {regionLabel(item.region)}
              </option>
            ))}
          </select>
        ) : null}
        <SearchInput value={query} onChange={setQuery} placeholder="Tuman qidirish" autoFocusShortcut={false} className="min-w-44 flex-1" />
        <p className="text-ink-faint text-meta tabular">
          {hidden > 0 ? `${rows.length - hidden} ta ko'rinadi · ${hidden} ta yashirilgan` : `${rows.length} ta tuman`}
        </p>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {rows.length === 0 ? (
          <p className="text-ink-faint py-8 text-center text-meta">Viloyat tumanlari topilmadi — pastdan qo&apos;shing</p>
        ) : visible.length === 0 ? (
          <p className="text-ink-faint py-8 text-center text-meta">Bunday tuman yo&apos;q</p>
        ) : (
          <ul className="border-line divide-line divide-y overflow-hidden rounded-xl border">
            {visible.map((row) =>
              editing === row.district.code ? (
                <DistrictEditRow key={row.district.code} row={row} region={region} onDone={() => setEditing(null)} />
              ) : (
                <DistrictViewRow
                  key={row.district.code}
                  row={row}
                  busy={editing !== null}
                  onEdit={() => setEditing(row.district.code)}
                />
              ),
            )}
          </ul>
        )}
      </div>

      <div className="border-line flex flex-wrap items-end gap-3 border-t px-5 py-3.5">
        <AddDistrict region={region} />
        <Button variant="ghost" onClick={onClose} className="ml-auto">
          Yopish
        </Button>
      </div>
    </div>
  );
}

function usePlaceMutation(code: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ChiefPlacePatch) => updateChiefPlace(code, patch),
    onSuccess: () => {
      // Lug'at yagona — zonalar, filtr, manzil tuzatish shu kalitdan o'qiydi.
      void queryClient.invalidateQueries({ queryKey: queryKeys.metaRegions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefZones });
      onSuccess?.();
    },
    onError: (error) =>
      toast.error(
        errorCode(error) === "district_in_zone"
          ? "Tuman zonada turibdi — avval zonadan chiqaring"
          : errorMessage(error, "Tumanni saqlashda xatolik"),
      ),
  });
}

function DistrictViewRow({ row, busy, onEdit }: { row: DistrictRow; busy: boolean; onEdit: () => void }) {
  const { district, zone } = row;
  const save = usePlaceMutation(district.code, () =>
    toast.success(district.isActive ? `${district.nameUz} yashirildi` : `${district.nameUz} qaytarildi`),
  );
  // Zonadagi tuman yashirilsa, unga tushgan zakaz zonasiz qolardi — avval zonadan chiqariladi.
  const blocked = district.isActive && zone !== null;

  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5", !district.isActive && "bg-subtle")}>
      <div className="min-w-0 flex-1">
        <p className={cn("flex flex-wrap items-center gap-x-2 text-dense", district.isActive ? "text-ink" : "text-ink-faint line-through")}>
          <span className="font-medium" data-no-translit>{district.nameUz}</span>
          {district.nameRu && district.nameRu !== district.nameUz ? (
            <span className="text-ink-faint text-meta" data-no-translit>{district.nameRu}</span>
          ) : null}
        </p>
        <p className="text-ink-faint flex flex-wrap gap-x-2 text-meta">
          {zone ? <span data-no-translit>{zone.name}</span> : <span>Zonasiz</span>}
          {isCustomDistrict(district) ? <span className="text-brand">Qo&apos;lda qo&apos;shilgan</span> : null}
          {isRenamedDistrict(district) ? (
            <span>
              <span>Asl nomi:</span> <span data-no-translit>{district.defaultNameUz}</span>
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={busy || save.isPending}>
          <Pencil />
          Tahrirlash
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || save.isPending || blocked}
          title={blocked ? "Avval zonadan chiqaring" : undefined}
          onClick={() => save.mutate({ isActive: !district.isActive })}
        >
          {save.isPending ? <LoaderCircle className="animate-spin" /> : district.isActive ? <EyeOff /> : <Eye />}
          {district.isActive ? "Yashirish" : "Qaytarish"}
        </Button>
      </div>
    </li>
  );
}

function DistrictEditRow({
  row,
  region,
  onDone,
}: {
  row: DistrictRow;
  region: RegionDistricts | undefined;
  onDone: () => void;
}) {
  const { district } = row;
  const [nameUz, setNameUz] = useState(district.nameUz);
  const [nameRu, setNameRu] = useState(district.nameRu ?? "");
  const [tried, setTried] = useState(false);
  const save = usePlaceMutation(district.code, () => {
    toast.success("Tuman saqlandi");
    onDone();
  });
  const error = districtNameError(nameUz, region, district.code);
  const submit = () => {
    setTried(true);
    if (error || save.isPending) return;
    save.mutate({ nameUz: nameUz.trim(), nameRu: nameRu.trim() || null });
  };

  return (
    <li className="bg-subtle flex flex-col gap-3 px-3.5 py-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nomi" htmlFor={`district-uz-${district.code}`} error={tried ? (error ?? undefined) : undefined}>
          <input
            id={`district-uz-${district.code}`}
            autoFocus
            value={nameUz}
            maxLength={80}
            aria-invalid={tried && error !== null}
            onChange={(event) => setNameUz(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
              if (event.key === "Escape") onDone();
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Ruscha nomi" htmlFor={`district-ru-${district.code}`} hint="Bo'sh qolsa — o'zbekcha nomi ko'rinadi.">
          <input
            id={`district-ru-${district.code}`}
            value={nameRu}
            maxLength={80}
            onChange={(event) => setNameRu(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
              if (event.key === "Escape") onDone();
            }}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isRenamedDistrict(district) ? (
          <Button
            size="sm"
            variant="ghost"
            className="mr-auto"
            disabled={save.isPending}
            onClick={() => save.mutate({ resetName: true })}
          >
            <RotateCcw />
            Asl nomiga qaytarish
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onDone} disabled={save.isPending}>
          <X />
          Bekor qilish
        </Button>
        <Button size="sm" onClick={submit} disabled={save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
          Saqlash
        </Button>
      </div>
    </li>
  );
}

function AddDistrict({ region }: { region: RegionDistricts | undefined }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);
  const error = districtNameError(name, region, null);
  const add = useMutation({
    mutationFn: () => createChiefPlace({ region: region?.region ?? "", name: name.trim() }),
    onSuccess: (place) => {
      toast.success(`${place.name} qo'shildi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.metaRegions });
      setName("");
      setTried(false);
    },
    onError: (failure) =>
      toast.error(
        errorCode(failure) === "zone_other_region"
          ? "Bu viloyat sizga biriktirilmagan — joyni faqat o'z viloyatingizga qo'sha olasiz"
          : errorMessage(failure, "Joyni qo'shishda xatolik"),
      ),
  });
  const submit = () => {
    setTried(true);
    if (!region || error || add.isPending) return;
    add.mutate();
  };

  return (
    <Field
      label="Yangi tuman yoki joy"
      htmlFor="district-new"
      error={tried && name.length > 0 ? (error ?? undefined) : undefined}
      className="min-w-60 flex-1"
    >
      <div className="flex gap-2">
        <input
          id="district-new"
          value={name}
          maxLength={80}
          placeholder="Masalan, Yangiqo'rg'on qishlog'i"
          aria-invalid={tried && name.length > 0 && error !== null}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submit();
          }}
          className={inputClass}
        />
        <Button type="button" variant="outline" onClick={submit} disabled={!region || add.isPending || name.trim().length === 0}>
          {add.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
          Qo&apos;shish
        </Button>
      </div>
    </Field>
  );
}
