import { api } from "@/shared/lib/api-client";

import { regionSettingsSchema, type AutoAssignMode, type RegionSettings } from "../model/region-settings";

function settingsPath(region: string): string {
  return `admin/regions/${encodeURIComponent(region)}/settings/`;
}

export function fetchRegionSettings(region: string, signal?: AbortSignal): Promise<RegionSettings> {
  return api.get(settingsPath(region), { schema: regionSettingsSchema, signal });
}

export function updateRegionSettings(region: string, autoAssign: AutoAssignMode): Promise<RegionSettings> {
  return api.patch(settingsPath(region), { schema: regionSettingsSchema, json: { auto_assign: autoAssign } });
}
