"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

import { useT } from "@/shared/i18n/locale";
import { Button } from "@/shared/ui/button";

/** Render xatosi (kutilmagan). Kutilgan xatolar — sahifa ichidagi holatlar. */
export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t.states.pageErrorTitle}</h1>
        <p className="max-w-md text-sm text-ink-muted">{t.states.pageErrorText}</p>
      </div>
      <Button variant="outline" onClick={reset}>
        <RotateCw aria-hidden />
        {t.common.retry}
      </Button>
    </div>
  );
}
