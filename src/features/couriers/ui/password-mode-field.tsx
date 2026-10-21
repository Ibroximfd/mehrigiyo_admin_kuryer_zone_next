"use client";

import { useT } from "@/shared/i18n/locale";
import { SegmentedControl } from "@/shared/ui/segmented-control";

import type { PasswordMode } from "../model/courier-form";

/** "Avtomatik yaratish" / "O'zim kiritaman" — izohi tanlangan rejimga qarab. */
export function PasswordModeField({ mode, onModeChange }: { mode: PasswordMode; onModeChange: (mode: PasswordMode) => void }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <SegmentedControl
        label={t.couriers.passwordMode}
        value={mode}
        onValueChange={onModeChange}
        options={[
          { value: "auto", label: t.couriers.passwordAuto },
          { value: "manual", label: t.couriers.passwordManual },
        ]}
      />
      {mode === "auto" ? <p className="text-xs text-ink-faint">{t.couriers.passwordAutoHint}</p> : null}
    </div>
  );
}
