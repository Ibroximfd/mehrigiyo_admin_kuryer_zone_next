"use client";

import { chiefCan } from "@/features/chief/types";
import { useChiefMe } from "@/features/chief/use-chief-me";

import { NAV } from "./nav";
import type { NavItem } from "./nav";

/** Menyu — dopuski yo'q bo'lim ko'rinmaydi; `me` kelguncha hammasi (sahifaning o'zi ham tekshiradi). */
export function useNavItems(): NavItem[] {
  const { me } = useChiefMe();
  return NAV.filter((item) => !item.permission || !me || chiefCan(me, item.permission));
}
