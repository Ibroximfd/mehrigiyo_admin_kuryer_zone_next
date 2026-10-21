"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { describeError } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Skeleton } from "@/shared/ui/skeleton";
import { InlineError } from "@/shared/ui/states";

import { useRegionSettings, useUpdateRegionSettings } from "../hooks/use-region-settings";
import { AUTO_ASSIGN_MODES, RECOMMENDED_MODE, type AutoAssignMode } from "../model/region-settings";

export type SettingsRegion = { code: string; name: string };

/** Rejimlar izohi — sahifa boshida bir marta, har qatorda takrorlanmaydi. */
export function AutoAssignLegend() {
  const t = useT();
  return (
    <Card className="grid gap-px overflow-hidden bg-line p-0 md:grid-cols-3">
      {AUTO_ASSIGN_MODES.map((mode) => (
        <div key={mode} className="flex flex-col gap-1.5 bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            {t.settings.modes[mode]}
            {mode === RECOMMENDED_MODE ? (
              <Badge tone="brand">
                <Sparkles aria-hidden />
                {t.settings.recommended}
              </Badge>
            ) : null}
          </p>
          <p className="text-sm text-ink-muted">{t.settings.modeDescriptions[mode]}</p>
        </div>
      ))}
    </Card>
  );
}

export function RegionSettingsList({ regions }: { regions: readonly SettingsRegion[] }) {
  return (
    <Card className="divide-y divide-line">
      {regions.map((region) => (
        <RegionSettingsRow key={region.code} region={region} />
      ))}
    </Card>
  );
}

function RegionSettingsRow({ region }: { region: SettingsRegion }) {
  const t = useT();
  const settings = useRegionSettings(region.code);
  const update = useUpdateRegionSettings(region.code);
  const mode = settings.data?.autoAssign;

  const change = (next: AutoAssignMode) => {
    if (next === mode) return;
    update.mutate(next, {
      onSuccess: () => toast.success(t.settings.saved(region.name)),
      onError: (error) => toast.error(describeError(error, t)),
    });
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-6">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-ink">{region.name}</p>
        {mode ? <p className="text-xs text-ink-faint md:max-w-md">{t.settings.modeDescriptions[mode]}</p> : null}
      </div>
      {settings.isPending ? (
        <Skeleton className="h-12 w-full rounded-xl md:w-96" />
      ) : settings.isError ? (
        <InlineError error={settings.error} onRetry={() => void settings.refetch()} />
      ) : (
        <SegmentedControl<AutoAssignMode>
          label={t.settings.modeLabel(region.name)}
          value={mode}
          onValueChange={change}
          disabled={update.isPending}
          className="w-full md:w-96"
          options={AUTO_ASSIGN_MODES.map((value) => ({ value, label: t.settings.modes[value] }))}
        />
      )}
    </div>
  );
}
