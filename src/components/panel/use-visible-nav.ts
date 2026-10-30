"use client";

import { useMemo } from "react";

import { useChiefMe } from "@/features/chief/use-chief-me";

import { NAV } from "./nav";
import type { NavItem } from "./nav";

/**
 * Navigatsiya — rolga bog'liq bo'limlar faqat roli borga: «Bosh kuryer»
 * `chief/me/` 200 bersa (403/404 — yashirin). «Logistlar» hammaga ko'rinadi:
 * dopuski yo'q logistga sahifa o'zi «nima kerak» ni aytadi (yashirish
 * «bo'lim yo'q» degan chalkashlik berardi).
 */
export function useVisibleNav(): NavItem[] {
  const { isChief } = useChiefMe();
  return useMemo(() => NAV.filter((item) => item.requires !== "chief" || isChief), [isChief]);
}
