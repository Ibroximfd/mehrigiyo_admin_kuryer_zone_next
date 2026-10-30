"use client";

import { useEffect } from "react";

import { ErrorView } from "@/components/kit/state-views";

/**
 * Panel ichidagi kutilmagan xatolik uchun to'siq.
 *
 * Bittagina komponent yiqilsa ham butun ilova oq ekranga aylanib qolmasin —
 * operator "Qayta urinish" bosib ishni davom ettiradi.
 */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel] kutilmagan xatolik:", error);
  }, [error]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <ErrorView
        message={
          error.message ||
          "Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko'ring."
        }
        onRetry={reset}
        className="border-line bg-surface w-full max-w-md rounded-2xl border"
      />
    </div>
  );
}
