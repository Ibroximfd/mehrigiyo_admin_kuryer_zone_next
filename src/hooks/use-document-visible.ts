"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/**
 * Tab ko'rinib turibdimi (chat o'qilganini belgilash, jonli xarita so'rovi).
 * Masalan, xona yashirin tabda kanalni o'qilgan deb
 * belgilamaydi — aks holda logist ko'rmagan xabar "o'qildi" bo'lib,
 * belgi hech qayerda yonmasdi.
 */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !document.hidden,
    () => true,
  );
}
