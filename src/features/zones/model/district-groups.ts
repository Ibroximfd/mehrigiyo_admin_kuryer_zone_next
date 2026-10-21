/**
 * Zona formasidagi tumanlar tanlovi uchun guruhlash.
 *
 *   • unzoned — hech qaysi zonada emas (birinchi ko'rsatiladi);
 *   • current — tahrirlanayotgan zonaning o'zida;
 *   • taken   — boshqa zonada: tanlab bo'lmaydi (409 `district_in_zone`),
 *               avval o'sha zonadan chiqarish kerak.
 * Nofaol tumanlar umuman ko'rsatilmaydi — ular zonaga kira olmaydi.
 */

export type DistrictOption = {
  code: string;
  name: string;
  zoneId: number | null;
  isActive: boolean;
};

export type TakenDistrict = DistrictOption & { zoneName: string };

export type DistrictGroups = {
  unzoned: DistrictOption[];
  current: DistrictOption[];
  taken: TakenDistrict[];
};

const byName = (a: DistrictOption, b: DistrictOption) => a.name.localeCompare(b.name);

export function groupDistrictOptions(
  options: readonly DistrictOption[],
  editingZoneId: number | null,
  zoneNames: ReadonlyMap<number, string>,
): DistrictGroups {
  const groups: DistrictGroups = { unzoned: [], current: [], taken: [] };
  for (const option of options) {
    if (!option.isActive) continue;
    if (option.zoneId === null) groups.unzoned.push(option);
    else if (option.zoneId === editingZoneId) groups.current.push(option);
    else groups.taken.push({ ...option, zoneName: zoneNames.get(option.zoneId) ?? `#${option.zoneId}` });
  }
  groups.unzoned.sort(byName);
  groups.current.sort(byName);
  groups.taken.sort((a, b) => a.zoneName.localeCompare(b.zoneName) || byName(a, b));
  return groups;
}

/** Qidiruv bo'yicha guruhlarni toraytiradi (bo'sh guruhlar qoladi — UI yashiradi). */
export function filterDistrictGroups(groups: DistrictGroups, query: string): DistrictGroups {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return groups;
  const matches = (option: DistrictOption) =>
    option.name.toLocaleLowerCase().includes(needle) || option.code.includes(needle);
  return {
    unzoned: groups.unzoned.filter(matches),
    current: groups.current.filter(matches),
    taken: groups.taken.filter(matches),
  };
}

/** Kod → ko'rsatish nomi; topilmasa kodning oxirgi bo'lagi. */
export function districtLabel(names: ReadonlyMap<string, string>, code: string): string {
  return names.get(code) ?? code.split("/").pop() ?? code;
}

/**
 * Server xabaridagi tuman kodlarini nomga almashtiradi:
 * `fargona/beshariq: Qo'qon markaz` → `Beshariq: Qo'qon markaz` (409 `district_in_zone`).
 */
export function humanizeDistrictCodes(text: string, names: ReadonlyMap<string, string>): string {
  return text.replace(/[a-z0-9_-]+\/[a-z0-9_-]+/gi, (code) => districtLabel(names, code));
}
