"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect } from "react";

import type { Region } from "../model/region";

const STORAGE_KEY = "mehrigiyo_admin_region";

function readRemembered(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function remember(region: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, region);
  } catch {
    // Eslab qolinmasa ham URL'dagi tanlov ishlaydi.
  }
}

/**
 * Tanlangan viloyat URL'da (`?region=fargona`) — sahifani ulashish va
 * "Orqaga" tugmasi to'g'ri ishlaydi. Boshqa bo'limga o'tganda ham oxirgi
 * tanlov esda qoladi; umuman tanlanmagan bo'lsa — birinchi viloyat.
 *
 * `required: false` — "Barcha viloyatlar" ruxsat etilgan sahifa (kuryerlar).
 */
export function useSelectedRegion(regions: readonly Region[] | undefined, { required = true } = {}) {
  const [region, setRegion] = useQueryState("region", parseAsString.withOptions({ history: "replace" }));

  const known = regions?.some((item) => item.code === region) ?? false;

  useEffect(() => {
    if (!regions || regions.length === 0) return;
    if (region && known) {
      remember(region);
      return;
    }
    if (region === null && !required) return;
    const remembered = readRemembered();
    const fallback = regions.find((item) => item.code === remembered) ?? regions[0];
    if (fallback && fallback.code !== region) void setRegion(fallback.code);
  }, [regions, region, known, required, setRegion]);

  const selectRegion = (next: string | null) => {
    if (next) remember(next);
    void setRegion(next);
  };

  return { region: known ? region : null, selectRegion } as const;
}
