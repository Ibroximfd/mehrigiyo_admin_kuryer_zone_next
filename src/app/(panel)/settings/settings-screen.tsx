"use client";

import { useRegions } from "@/features/regions/hooks/use-regions";
import { AutoAssignLegend, RegionSettingsList } from "@/features/settings/ui/region-settings-list";
import { useT } from "@/shared/i18n/locale";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/shared/ui/states";

export function SettingsScreen() {
  const t = useT();
  const regions = useRegions();

  return (
    <>
      <PageHeader title={t.settings.title} description={t.settings.description} />
      <OfflineBanner />
      <AutoAssignLegend />
      {regions.isPending ? (
        <Card className="divide-y divide-line" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-12 w-full rounded-xl md:w-96" />
            </div>
          ))}
        </Card>
      ) : regions.isError ? (
        <ErrorState error={regions.error} title={t.regions.loadError} onRetry={() => void regions.refetch()} />
      ) : regions.data.length === 0 ? (
        <EmptyState title={t.settings.emptyTitle} description={t.settings.emptyText} />
      ) : (
        <RegionSettingsList regions={regions.data.map((region) => ({ code: region.code, name: region.name }))} />
      )}
    </>
  );
}
