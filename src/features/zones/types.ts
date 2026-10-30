import type { Locale } from "@/lib/i18n/locale";
import {
  asArray,
  asBool,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Hudud ma'lumotnomasi (2026-10-15 kontrakti):
 *
 *   • `region` — viloyat kodi (`fargona`);
 *   • `district` — tuman kodi (`fargona/qoqon_sh`), viloyat prefiksi bilan;
 *   • `zone` — tumanlar guruhi + kassa nuqtasi. Zonani faqat admin web
 *     yaratadi, logist o'qiydi.
 *
 * Mapperlar bag'rikeng: eski yoki yarim javob kelsa ham yiqilmaydi.
 */

export type District = {
  code: string;
  region: string;
  nameUz: string;
  nameRu: string | null;
  nameUzCyrl: string | null;
  /** `city` · `district` va h.k. — server qiymati xom holida. */
  kind: string | null;
  isActive: boolean;
};

export type RegionDistricts = {
  region: string;
  name: string;
  districts: District[];
};

function mapDistrict(raw: unknown, region: string): District | null {
  if (!isRecord(raw)) return null;
  const code = asOptionalString(raw.code);
  if (!code) return null;
  return {
    code,
    region: asOptionalString(raw.region) ?? region,
    nameUz: asOptionalString(raw.name_uz ?? raw.name) ?? code,
    nameRu: asOptionalString(raw.name_ru),
    nameUzCyrl: asOptionalString(raw.name_uz_cyrl),
    kind: asOptionalString(raw.kind),
    isActive: asBool(raw.is_active, true),
  };
}

/** `GET /api/meta/regions/` — massiv yoki `{results}` / `{regions}` ichida. */
export function mapRegionsDictionary(raw: unknown): RegionDistricts[] {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.results ?? json.regions);
  return list.filter(isRecord).flatMap((item) => {
    const region = asOptionalString(item.region ?? item.code);
    if (!region) return [];
    return [
      {
        region,
        name: asOptionalString(item.name ?? item.name_uz) ?? region,
        districts: asArray(item.districts)
          .map((district) => mapDistrict(district, region))
          .filter((district): district is District => district !== null),
      },
    ];
  });
}

/**
 * Tanlovdagi tuman nomi UI tiliga qarab (backend javobi #1): `ru` →
 * `name_ru`, kirill → `name_uz_cyrl`, aks holda `name_uz`. Nom bo'lmasa —
 * `name_uz`. Buyurtmadagi `district_display` ni server o'zi `X-Lang` bo'yicha
 * beradi — u uchun bu funksiya kerak emas.
 */
export function districtName(district: District, locale: Locale): string {
  if (locale === "ru") return district.nameRu ?? district.nameUz;
  if (locale === "uz-cyrl") return district.nameUzCyrl ?? district.nameUz;
  return district.nameUz;
}

/** Kod bo'yicha tuman (topilmasa `null`). */
export function findDistrict(
  dictionary: readonly RegionDistricts[] | undefined,
  code: string | null | undefined,
): District | null {
  if (!dictionary || !code) return null;
  for (const region of dictionary) {
    const found = region.districts.find((district) => district.code === code);
    if (found) return found;
  }
  return null;
}

/** Tanlov uchun: viloyat berilsa — faqat uning faol tumanlari. */
export function districtOptions(
  dictionary: readonly RegionDistricts[] | undefined,
  region: string | null,
): District[] {
  if (!dictionary) return [];
  return dictionary
    .filter((item) => !region || item.region === region)
    .flatMap((item) => item.districts)
    .filter((district) => district.isActive);
}

/**
 * Tuman shu viloyatda faol holda bormi — eski/nofaol yoki boshqa viloyat
 * kodini aniqlash uchun (tahrir formasida "tumanni qayta tanlang").
 * Viloyat tanlanmagan bo'lsa tuman unga mos kela olmaydi — `false`.
 */
export function isActiveDistrictOf(
  dictionary: readonly RegionDistricts[] | undefined,
  region: string | null | undefined,
  code: string | null | undefined,
): boolean {
  if (!region || !code) return false;
  return districtOptions(dictionary, region).some((district) => district.code === code);
}

// ─────────────────────────────────────────────────────────────────────────────
// Kassa nuqtasi va zona
// ─────────────────────────────────────────────────────────────────────────────

/** Kassa turi (backend javobi #17): filial kassasi yoki aniq xodim. */
export type CashPointKind = "filial" | "person";

export function asCashPointKind(value: unknown): CashPointKind | null {
  return value === "filial" || value === "person" ? value : null;
}

/** Pul topshiriladigan joy: filial kassasi yoki aniq xodim. */
export type CashPoint = {
  kind: CashPointKind | null;
  filialId: number | null;
  userId: number | null;
  name: string | null;
};

export function mapCashPoint(raw: unknown): CashPoint | null {
  if (!isRecord(raw)) return null;
  const point: CashPoint = {
    kind: asCashPointKind(raw.kind),
    filialId: asOptionalInt(raw.filial_id),
    userId: asOptionalInt(raw.user_id),
    name: asOptionalString(raw.name),
  };
  return Object.values(point).some((value) => value !== null) ? point : null;
}

/** Kassa nuqtasining o'qiladigan nomi. */
export function cashPointLabel(point: CashPoint | null): string {
  if (!point) return "";
  if (point.name) return point.name;
  return point.kind === "person" ? "Mas'ul xodim" : "Filial kassasi";
}

export type Zone = {
  id: number;
  region: string;
  name: string;
  isActive: boolean;
  districtCodes: string[];
  cashPoint: CashPoint | null;
  neighborZoneIds: number[];
};

/** Butun son id lar ro'yxati (yaroqsizlari tashlanadi). */
export function asIdList(raw: unknown): number[] {
  return asArray(raw)
    .map((item) => asOptionalInt(item))
    .filter((id): id is number => id !== null);
}

export function mapZone(raw: unknown): Zone | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return {
    id,
    region: asString(raw.region),
    name: asOptionalString(raw.name) ?? `#${id}`,
    isActive: asBool(raw.is_active, true),
    districtCodes: asArray(raw.district_codes)
      .map((code) => asString(code).trim())
      .filter(Boolean),
    cashPoint: mapCashPoint(raw.cash_point),
    neighborZoneIds: asIdList(raw.neighbor_zone_ids),
  };
}

export function mapZones(raw: unknown): Zone[] {
  const json = asRecord(raw);
  const list = Array.isArray(raw) ? raw : asArray(json.results);
  return list.map(mapZone).filter((zone): zone is Zone => zone !== null);
}

/** `{id, name}` — kuryer va buyurtmadagi qisqa zona havolasi. */
export type ZoneRef = { id: number; name: string };

export function mapZoneRef(raw: unknown): ZoneRef | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  return { id, name: asOptionalString(raw.name) ?? `#${id}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Viloyat sozlamasi
// ─────────────────────────────────────────────────────────────────────────────

export type AutoAssignMode = "off" | "suggest" | "full";

export type RegionSettings = { region: string; autoAssign: AutoAssignMode };

export function mapRegionSettings(raw: unknown): RegionSettings {
  const json = asRecord(raw);
  const mode = asString(json.auto_assign);
  return {
    region: asString(json.region),
    autoAssign: mode === "suggest" || mode === "full" ? mode : "off",
  };
}

export const AUTO_ASSIGN_MODE_LABELS: Record<AutoAssignMode, string> = {
  off: "Avto taqsimlash o'chiq",
  suggest: "Avto taqsimlash: faqat taklif",
  full: "Avto taqsimlash: to'liq",
};
