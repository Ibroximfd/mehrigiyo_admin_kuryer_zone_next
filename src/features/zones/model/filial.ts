import { z } from "zod";

import { optionalTextSchema } from "@/shared/lib/schema";

/**
 * Kassa tanlovi uchun filiallar — `GET /api/admin/filials/` (backend #21):
 * massiv `[{id, name, region, is_main, is_active}]`, nofaollar oxirida.
 */
const filialSchema = z
  .object({
    id: z.number().int(),
    name: optionalTextSchema,
    region: optionalTextSchema,
    is_main: z.boolean().nullish(),
    is_active: z.boolean().nullish(),
  })
  .transform((raw) => ({
    id: raw.id,
    name: raw.name ?? `#${raw.id}`,
    region: raw.region,
    isMain: raw.is_main ?? false,
    isActive: raw.is_active ?? true,
  }));

export type Filial = z.output<typeof filialSchema>;

export const filialsResponseSchema = z.array(filialSchema);

export type FilialGroups = {
  /** Zona viloyatidagi faol filiallar. */
  regional: Filial[];
  /** Boshqa viloyatlardagi faol filiallar. */
  other: Filial[];
  /** Nofaol — ko'rinadi, lekin tanlab bo'lmaydi (joriy kassa bo'lsa o'zi tanlangan qoladi). */
  inactive: Filial[];
};

/** Asosiy filial oldin, keyin nom bo'yicha. */
const byMainThenName = (a: Filial, b: Filial) => {
  if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
  return a.name.localeCompare(b.name);
};

/**
 * Kassa tanlovi tartibi: zona viloyati filiallari tepada, keyin boshqa faol
 * filiallar, nofaollar oxirida. Joriy kassa filiali ro'yxatda bo'lmasa
 * (o'chirilgan yoki ko'rinmaydigan) — nomi bilan "boshqa" guruhga qo'shiladi,
 * aks holda tanlov bo'sh ko'rinardi.
 */
export function groupFilialOptions(
  filials: readonly Filial[],
  zoneRegion: string,
  current: { id: number; name: string | null } | null = null,
): FilialGroups {
  const groups: FilialGroups = { regional: [], other: [], inactive: [] };
  const all = [...filials];
  if (current && !all.some((filial) => filial.id === current.id)) {
    all.push({ id: current.id, name: current.name ?? `#${current.id}`, region: null, isMain: false, isActive: true });
  }
  for (const filial of all) {
    if (!filial.isActive) groups.inactive.push(filial);
    else if (filial.region === zoneRegion) groups.regional.push(filial);
    else groups.other.push(filial);
  }
  groups.regional.sort(byMainThenName);
  groups.other.sort(byMainThenName);
  groups.inactive.sort(byMainThenName);
  return groups;
}
