"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useScrollMemory } from "@/hooks/use-scroll-memory";

/** `PanelShell` dagi asosiy scroll konteyneri. */
export const PANEL_MAIN_ID = "panel-main";

/**
 * Sahifa scrolli manzil (yo'l + query) bo'yicha eslab qolinadi: ro'yxatdan
 * detalga kirib Esc/«orqaga» bilan qaytganda yoki boshqa bo'limga o'tib
 * kelganda sahifa o'sha joyda ochiladi. `useSearchParams` sabab — layout'dagi
 * Suspense ichida chiziladi; `main` elementiga id orqali ulanadi.
 */
export function MainScrollMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const attach = useScrollMemory<HTMLElement>(`main:${pathname}${search ? `?${search}` : ""}`);

  useEffect(() => {
    attach(document.getElementById(PANEL_MAIN_ID));
    return () => attach(null);
  }, [attach]);

  return null;
}
