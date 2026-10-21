/**
 * Kuryer zonalari tartibi: `zone_ids[0]` — ASOSIY zona (kassa, filial shu
 * zonadan aniqlanadi). Hamma amallar yangi massiv qaytaradi.
 */

export function addZone(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}

export function removeZone(ids: readonly number[], id: number): number[] {
  return ids.filter((item) => item !== id);
}

/** Zonani boshiga ko'chiradi; qolganlarning nisbiy tartibi saqlanadi. */
export function makePrimary(ids: readonly number[], id: number): number[] {
  if (!ids.includes(id)) return [...ids];
  return [id, ...ids.filter((item) => item !== id)];
}

/** Bir pog'ona yuqoriga/pastga; chegarada o'zgarmaydi. */
export function moveZone(ids: readonly number[], id: number, direction: "up" | "down"): number[] {
  const index = ids.indexOf(id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  const current = next[index];
  const swapped = next[target];
  if (current === undefined || swapped === undefined) return next;
  next[index] = swapped;
  next[target] = current;
  return next;
}

/** Endi mavjud bo'lmagan (o'chirilgan) zonalarni tashlaydi, tartibni saqlaydi. */
export function keepKnownZones(ids: readonly number[], known: ReadonlySet<number>): number[] {
  return ids.filter((id) => known.has(id));
}
