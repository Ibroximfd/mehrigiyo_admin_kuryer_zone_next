import { z } from "zod";

/** Viloyat avto-taqsimlash rejimi (`/api/admin/regions/{region}/settings/`). */

export const AUTO_ASSIGN_MODES = ["off", "suggest", "full"] as const;
export type AutoAssignMode = (typeof AUTO_ASSIGN_MODES)[number];

/** Kontrakt §6: boshida `suggest` tavsiya etiladi. */
export const RECOMMENDED_MODE: AutoAssignMode = "suggest";

export const regionSettingsSchema = z
  .object({ region: z.string(), auto_assign: z.enum(AUTO_ASSIGN_MODES) })
  .transform((raw) => ({ region: raw.region, autoAssign: raw.auto_assign }));

export type RegionSettings = z.output<typeof regionSettingsSchema>;

export function isAutoAssignMode(value: string): value is AutoAssignMode {
  return AUTO_ASSIGN_MODES.some((mode) => mode === value);
}
