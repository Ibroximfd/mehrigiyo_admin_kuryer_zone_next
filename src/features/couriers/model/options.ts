/**
 * Kuryer UI ga tashqaridan (app qatlami) beriladigan ma'lumotnoma shakllari.
 * Zonalar/viloyatlar boshqa bo'limlarniki — bu yerda faqat kerakli maydonlar.
 */
export type CourierZoneOption = { id: number; name: string; region: string; isActive: boolean };
export type CourierRegionOption = { code: string; name: string };

/** Viloyat bo'yicha faol zonalar, nom tartibida. */
export function zonesForRegion(zones: readonly CourierZoneOption[], region: string | null): CourierZoneOption[] {
  return zones
    .filter((zone) => zone.isActive && (region === null || zone.region === region))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Kuryer viloyati: o'z maydoni, bo'lmasa asosiy zonasi viloyati. */
export function inferCourierRegion(
  courier: { region: string | null; zoneIds: readonly number[] },
  zones: readonly CourierZoneOption[],
): string | null {
  if (courier.region) return courier.region;
  const primary = courier.zoneIds[0];
  return zones.find((zone) => zone.id === primary)?.region ?? null;
}
