import type { Locale } from "@/lib/i18n/locale";
import { asInt, asRecord } from "@/lib/parse";

import { districtName } from "./types";
import type { District, RegionDistricts, Zone } from "./types";

/**
 * Hudud filtri — Viloyat → Zona → Tuman kaskadi, sof mantiq.
 *
 * Bitta qiymat uchta sahifada ishlaydi: taqsimlash oynasi, kuryerlar va
 * buyurtmalar. Zona kaliti — id satr ko'rinishida yoki `none` ("Hududi
 * noma'lum"). Sonlar serverdan (`unassigned-counts/`, backend A1) — to'liq,
 * filtrsiz; logist ish qayerda ekanini tanlamasdan ko'radi.
 */

/** Zonasi aniqlanmagan buyurtmalar savati (`?zone=none`). */
export const AREA_ZONE_NONE = "none";

/**
 * Har uchala daraja **bir nechta** qiymat oladi (2026-10-29): bir nechta
 * viloyat, bir nechta zona, bir nechta tuman. Bo'sh ro'yxat — "hammasi".
 * URL'da vergul bilan (`?region=fargona,andijon&zone=7,8`).
 */
export type AreaFilter = {
  regions: readonly string[];
  /** Zona id lari (satr) yoki yolg'iz `none` ("Hududi noma'lum"). */
  zones: readonly string[];
  /** Tuman kodlari (`fargona/qoqon_sh`). */
  districts: readonly string[];
};

export const EMPTY_AREA: AreaFilter = { regions: [], zones: [], districts: [] };

export type AreaOption = {
  value: string;
  label: string;
  /** Shu hududdagi kuryersiz buyurtmalar; sanalmasa `undefined`. */
  count?: number;
};

type ZoneLite = Pick<Zone, "id" | "name" | "region" | "isActive" | "districtCodes">;

/** Tuman kodi `viloyat/tuman` — prefiks viloyat kodi. */
export function regionOfDistrictCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const slash = code.indexOf("/");
  return slash > 0 ? code.slice(0, slash) : null;
}

/**
 * Kuryersiz (`confirmed`) buyurtmalar soni hudud bo'yicha — server hisobi
 * (`GET orders/unassigned-counts/`). Har xaritada `none` kaliti — qiymati
 * yo'qlar (viloyati noma'lum / zonasiz / tumansiz).
 */
export type AreaCounts = {
  total: number;
  byRegion: Map<string, number>;
  /** Kalit: zona id satri yoki `none`. */
  byZone: Map<string, number>;
  byDistrict: Map<string, number>;
};

export const EMPTY_AREA_COUNTS: AreaCounts = {
  total: 0,
  byRegion: new Map(),
  byZone: new Map(),
  byDistrict: new Map(),
};

function countMap(raw: unknown): Map<string, number> {
  const map = new Map<string, number>();
  for (const [key, value] of Object.entries(asRecord(raw))) {
    const count = asInt(value, 0);
    if (key && count > 0) map.set(key, count);
  }
  return map;
}

/** `{total, by_region: {fargona: 5, none: 1}, by_zone: {"7": 3, none: 2}, by_district: {...}}`. */
export function mapAreaCounts(raw: unknown): AreaCounts {
  const json = asRecord(raw);
  const byRegion = countMap(json.by_region);
  const byZone = countMap(json.by_zone);
  const byDistrict = countMap(json.by_district);
  const summed = [...byZone.values()].reduce((sum, count) => sum + count, 0);
  return {
    // Server `total` bermasa — zona hisoblari yig'indisi (har buyurtma bitta zonada yoki `none`).
    total: asInt(json.total, summed),
    byRegion,
    byZone,
    byDistrict,
  };
}

/**
 * Viloyat tanlovi: lug'at tartibida, buyurtmada uchragan, lug'atda yo'q
 * viloyat ham chiqadi (kod nomi bilan). Sonlar — kuryersiz buyurtmalar.
 */
export function regionAreaOptions(
  dictionary: readonly Pick<RegionDistricts, "region" | "name">[],
  counts: AreaCounts | null,
): AreaOption[] {
  const options: AreaOption[] = dictionary.map((item) => ({
    value: item.region,
    label: item.name,
    count: counts ? (counts.byRegion.get(item.region) ?? 0) : undefined,
  }));
  if (counts) {
    const known = new Set(options.map((option) => option.value));
    for (const [region, count] of counts.byRegion) {
      // `none` — viloyati noma'lum buyurtmalar, bu viloyat emas.
      if (region !== AREA_ZONE_NONE && !known.has(region)) {
        options.push({ value: region, label: region, count });
      }
    }
  }
  return options;
}

/**
 * Zona tanlovi: tanlangan viloyatlarning zonalari (faol yoki buyurtmasi bor)
 * → hisobda bor, ro'yxatda yo'q zona (faqat viloyatsiz — viloyati noma'lum)
 * → "Hududi noma'lum". Viloyat tanlanmasa — hamma zona.
 *
 * `none` savati soni server bo'yicha umumiy; viloyat tanlanganda viloyat
 * kesimi yo'q — son ko'rsatilmaydi.
 */
export function zoneAreaOptions(
  regions: readonly string[],
  zones: readonly ZoneLite[],
  counts: AreaCounts | null,
  noneLabel: string,
): AreaOption[] {
  const options: AreaOption[] = [];
  const known = new Set<string>();
  const regionSet = new Set(regions);
  for (const zone of zones) {
    if (regionSet.size && !regionSet.has(zone.region)) continue;
    const key = String(zone.id);
    const count = counts?.byZone.get(key) ?? 0;
    if (!zone.isActive && count === 0) continue;
    known.add(key);
    options.push({ value: key, label: zone.name, count: counts ? count : undefined });
  }
  if (counts && regionSet.size === 0) {
    for (const [key, count] of counts.byZone) {
      if (key === AREA_ZONE_NONE || known.has(key)) continue;
      known.add(key);
      options.push({ value: key, label: `#${key}`, count });
    }
  }
  let noneCount: number | undefined;
  if (counts) noneCount = regionSet.size ? undefined : (counts.byZone.get(AREA_ZONE_NONE) ?? 0);
  options.push({ value: AREA_ZONE_NONE, label: noneLabel, count: noneCount });
  return options;
}

/** Tanlangan haqiqiy zonalar (`none` siz). */
function selectedZones(filter: Pick<AreaFilter, "zones">, zones: readonly ZoneLite[]): ZoneLite[] {
  const keys = new Set(filter.zones.filter((key) => key !== AREA_ZONE_NONE));
  return zones.filter((zone) => keys.has(String(zone.id)));
}

/**
 * Tuman tanlovi: zona(lar) tanlangan bo'lsa — ularning `district_codes`
 * birlashmasi; aks holda tanlangan viloyatlarning faol tumanlari; viloyat
 * ham yo'q — hamma tuman.
 */
export function districtAreaOptions(
  filter: Pick<AreaFilter, "regions" | "zones">,
  zones: readonly ZoneLite[],
  dictionary: readonly RegionDistricts[],
  counts: AreaCounts | null,
  locale: Locale,
): AreaOption[] {
  const picked = selectedZones(filter, zones);
  const allowed = picked.length ? new Set(picked.flatMap((zone) => zone.districtCodes)) : null;
  const regions = new Set([...filter.regions, ...picked.map((zone) => zone.region).filter(Boolean)]);
  const districts: District[] = dictionary
    .filter((item) => regions.size === 0 || regions.has(item.region))
    .flatMap((item) => item.districts)
    .filter((district) => (allowed ? allowed.has(district.code) : district.isActive));
  const options = districts.map((district) => ({
    value: district.code,
    label: districtName(district, locale),
    count: counts ? (counts.byDistrict.get(district.code) ?? 0) : undefined,
  }));
  if (allowed) {
    // Zona kodi lug'atda yo'q (nofaol yoki eski) — kodi bilan chiqadi.
    const known = new Set(options.map((option) => option.value));
    for (const code of allowed) {
      if (!known.has(code)) {
        options.push({
          value: code,
          label: code,
          count: counts ? (counts.byDistrict.get(code) ?? 0) : undefined,
        });
      }
    }
  }
  return options;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kaskad o'tishlari
// ─────────────────────────────────────────────────────────────────────────────

function toggled(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/**
 * Viloyatni qo'shish/olib tashlash. Viloyat ro'yxati o'zgarsa, endi
 * tanlanmagan viloyatning zonasi va tumani tushib qoladi.
 */
export function toggleAreaRegion(
  filter: AreaFilter,
  region: string,
  zones: readonly ZoneLite[],
): AreaFilter {
  const regions = toggled(filter.regions, region);
  if (regions.length === 0) return { regions, zones: filter.zones, districts: filter.districts };
  const set = new Set(regions);
  const keptZones = filter.zones.filter((key) => {
    if (key === AREA_ZONE_NONE) return true;
    const zone = zones.find((item) => String(item.id) === key);
    return !zone || set.has(zone.region);
  });
  const keptDistricts = filter.districts.filter((code) => {
    const owner = regionOfDistrictCode(code);
    return owner === null || set.has(owner);
  });
  return { regions, zones: keptZones, districts: keptDistricts };
}

/**
 * Zonani qo'shish/olib tashlash. `none` boshqa zonalar bilan birlashmaydi.
 * Viloyatlar tanlangan bo'lsa zonaning viloyati ham qo'shiladi; tanlangan
 * zonalarga kirmay qolgan tuman tushadi.
 */
export function toggleAreaZone(
  filter: AreaFilter,
  zone: string,
  zones: readonly ZoneLite[],
): AreaFilter {
  if (zone === AREA_ZONE_NONE) {
    const on = !filter.zones.includes(AREA_ZONE_NONE);
    return { ...filter, zones: on ? [AREA_ZONE_NONE] : [], districts: on ? [] : filter.districts };
  }
  const nextZones = toggled(filter.zones.filter((key) => key !== AREA_ZONE_NONE), zone);
  const found = zones.find((item) => String(item.id) === zone);
  const regions =
    found?.region && filter.regions.length && !filter.regions.includes(found.region)
      ? [...filter.regions, found.region]
      : [...filter.regions];
  const picked = selectedZones({ zones: nextZones }, zones);
  const allowed = new Set(picked.flatMap((item) => item.districtCodes));
  const districts = picked.length
    ? filter.districts.filter((code) => allowed.has(code))
    : [...filter.districts];
  return { regions, zones: nextZones, districts };
}

/**
 * Tumanni qo'shish/olib tashlash. Qo'shilganda viloyati (ro'yxat bo'sh
 * bo'lmasa) va egasi zona (zonalar tanlangan bo'lsa) ham qo'shiladi.
 */
export function toggleAreaDistrict(
  filter: AreaFilter,
  district: string,
  zones: readonly ZoneLite[],
): AreaFilter {
  const removing = filter.districts.includes(district);
  const districts = toggled(filter.districts, district);
  if (removing) return { ...filter, districts };
  const region = regionOfDistrictCode(district);
  const regions =
    region && filter.regions.length && !filter.regions.includes(region)
      ? [...filter.regions, region]
      : [...filter.regions];
  const realZones = filter.zones.filter((key) => key !== AREA_ZONE_NONE);
  const covered = selectedZones(filter, zones).some((zone) => zone.districtCodes.includes(district));
  const owner = zones.find((item) => item.districtCodes.includes(district));
  const nextZones =
    realZones.length && !covered && owner ? [...realZones, String(owner.id)] : realZones;
  return { regions, zones: nextZones, districts };
}

export function clearArea(): AreaFilter {
  return EMPTY_AREA;
}

export function isAreaEmpty(filter: AreaFilter): boolean {
  return filter.regions.length === 0 && filter.zones.length === 0 && filter.districts.length === 0;
}

/** URL qiymatlaridan (`nuqs` massivlari, `null` — yo'q) filtr. */
export function areaFromUrl(
  regions: readonly string[] | null,
  zones: readonly string[] | null,
  districts: readonly string[] | null,
): AreaFilter {
  const clean = (list: readonly string[] | null) => [...new Set((list ?? []).map((item) => item.trim()).filter(Boolean))];
  const zoneList = clean(zones);
  return {
    regions: clean(regions),
    zones: zoneList.includes(AREA_ZONE_NONE) ? [AREA_ZONE_NONE] : zoneList,
    districts: clean(districts),
  };
}

/**
 * Sukut: logist filiali viloyati (buyurtmasi bo'lsa), aks holda eng ko'p
 * buyurtmali viloyat; zona — shu viloyatda eng ko'p buyurtmali zona
 * (`none` savati sanalmaydi). So'ralgan zona (sahifa filtri) ustun.
 */
export function defaultArea(
  counts: AreaCounts | null,
  zones: readonly ZoneLite[],
  preferredRegion: string | null,
  requestedZone: string | null = null,
): AreaFilter {
  counts ??= EMPTY_AREA_COUNTS;
  if (requestedZone) {
    if (requestedZone === AREA_ZONE_NONE) return { regions: [], zones: [requestedZone], districts: [] };
    const zone = zones.find((item) => String(item.id) === requestedZone);
    if (zone) return { regions: zone.region ? [zone.region] : [], zones: [requestedZone], districts: [] };
  }
  let region = preferredRegion && (counts.byRegion.get(preferredRegion) ?? 0) > 0 ? preferredRegion : null;
  if (!region) {
    let best = 0;
    for (const [key, count] of counts.byRegion) {
      if (key !== AREA_ZONE_NONE && count > best) {
        best = count;
        region = key;
      }
    }
  }
  if (!region) region = preferredRegion;
  let zone: string | null = null;
  let bestZone = 0;
  for (const item of zones) {
    if (region && item.region !== region) continue;
    const count = counts.byZone.get(String(item.id)) ?? 0;
    if (count > bestZone) {
      bestZone = count;
      zone = String(item.id);
    }
  }
  return { regions: region ? [region] : [], zones: zone ? [zone] : [], districts: [] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Server parametrlari
// ─────────────────────────────────────────────────────────────────────────────

/** Haqiqiy zona id lari (butun musbat). */
function zoneIds(filter: Pick<AreaFilter, "zones">): number[] {
  return filter.zones
    .filter((key) => key !== AREA_ZONE_NONE)
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
}

/**
 * Buyurtmalar so'rovi — hammasi serverda, vergul bilan:
 * `?region=a,b` · `?zone=7,8` / `none` · `?district=k1,k2`.
 */
export function ordersAreaQuery(filter: AreaFilter): {
  regions?: string[];
  zones?: number[] | "none";
  districts?: string[];
} {
  const query: { regions?: string[]; zones?: number[] | "none"; districts?: string[] } = {};
  if (filter.regions.length) query.regions = [...filter.regions];
  if (filter.zones.includes(AREA_ZONE_NONE)) query.zones = "none";
  else {
    const ids = zoneIds(filter);
    if (ids.length) query.zones = ids;
  }
  if (filter.districts.length) query.districts = [...filter.districts];
  return query;
}

/**
 * Kuryerlar so'rovi — hammasi serverda (backend A6/A7): `?region=a,b`,
 * `?zone=7,8`, `?district=k1,k2`. `none` zonasi kuryerda bo'lmaydi —
 * zona filtri yuborilmaydi.
 */
export function couriersAreaQuery(filter: AreaFilter): {
  region: string | null;
  zoneIds: number[] | null;
  districts: string[] | null;
} {
  const ids = zoneIds(filter);
  return {
    region: filter.regions.length ? filter.regions.join(",") : null,
    zoneIds: ids.length ? ids : null,
    districts: filter.districts.length ? [...filter.districts] : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chiplar
// ─────────────────────────────────────────────────────────────────────────────

export type AreaChipKind = "region" | "zone" | "district";

export type AreaChip = { kind: AreaChipKind; value: string; label: string };

/** Tanlangan har bir qiymat — olib tashlanadigan chip; yorliq tanlovlardan topiladi. */
export function areaChips(
  filter: AreaFilter,
  labels: { regions: readonly AreaOption[]; zones: readonly AreaOption[]; districts: readonly AreaOption[] },
): AreaChip[] {
  const find = (options: readonly AreaOption[], value: string) =>
    options.find((option) => option.value === value)?.label ?? value;
  return [
    ...filter.regions.map((value) => ({ kind: "region" as const, value, label: find(labels.regions, value) })),
    ...filter.zones.map((value) => ({ kind: "zone" as const, value, label: find(labels.zones, value) })),
    ...filter.districts.map((value) => ({ kind: "district" as const, value, label: find(labels.districts, value) })),
  ];
}

export function removeAreaChip(
  filter: AreaFilter,
  chip: Pick<AreaChip, "kind" | "value">,
  zones: readonly ZoneLite[],
): AreaFilter {
  if (chip.kind === "region") return toggleAreaRegion(filter, chip.value, zones);
  if (chip.kind === "zone") return { ...filter, zones: filter.zones.filter((key) => key !== chip.value) };
  return { ...filter, districts: filter.districts.filter((code) => code !== chip.value) };
}
