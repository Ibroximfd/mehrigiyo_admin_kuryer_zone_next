"use client";

import { Suspense } from "react";

import { MainScrollMemory } from "@/components/panel/main-scroll-memory";
import { PanelShell } from "@/components/panel/panel-shell";
import { RequireAuth } from "@/components/require-auth";
import { ChiefSiteGate } from "@/features/chief/components/chief-site-gate";

/**
 * Panel ichidagi barcha sahifalar uchun umumiy karkas.
 *
 * `(panel)` qavs ichidagi papka — Next'ning "route group" imkoniyati: u
 * manzilga qo'shilmaydi, faqat shu papkadagi sahifalarga umumiy layout
 * beradi. Ya'ni `/`, `/orders`, `/couriers` — hammasi shu sidebar
 * ichida ochiladi, xuddi Flutter'dagi `StatefulShellRoute` kabi.
 */
export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <PanelShell>
        {/* Sahifalar `nuqs` (ichida `useSearchParams`) ishlatadi — statik
            eksportda Suspense chegarasi talab qilinadi. */}
        <Suspense fallback={null}>
          <MainScrollMemory />
          <ChiefSiteGate>{children}</ChiefSiteGate>
        </Suspense>
      </PanelShell>
    </RequireAuth>
  );
}
