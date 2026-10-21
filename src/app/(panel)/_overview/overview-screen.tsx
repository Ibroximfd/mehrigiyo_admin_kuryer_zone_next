"use client";

import { ArrowLeftRight, ArrowRight, Hexagon, MapPinOff, Settings2, Truck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useCouriers } from "@/features/couriers/hooks/use-couriers";
import { useRegions } from "@/features/regions/hooks/use-regions";
import { useZones } from "@/features/zones/hooks/use-zones";
import { ROUTES, type AppRoute } from "@/shared/config/routes";
import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { ErrorState, OfflineBanner } from "@/shared/ui/states";

import { buildOverviewStats } from "./overview-stats";

const ALL_COURIERS = { region: null, zone: null, shift: "all", status: "all", search: "" } as const;

export function OverviewScreen() {
  const t = useT();
  const regions = useRegions();
  const zones = useZones(null);
  const couriers = useCouriers(ALL_COURIERS);

  const stats = useMemo(
    () =>
      regions.data && zones.data && couriers.data
        ? buildOverviewStats(regions.data, zones.data.zones, couriers.data)
        : null,
    [regions.data, zones.data, couriers.data],
  );
  const failed = [regions, zones, couriers].find((query) => query.isError);

  return (
    <>
      <PageHeader title={t.overview.title} description={t.overview.description} />
      <OfflineBanner />
      {failed ? (
        <ErrorState
          error={failed.error}
          onRetry={() => {
            void regions.refetch();
            void zones.refetch();
            void couriers.refetch();
          }}
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-3" aria-busy={stats === null}>
          <StatCard
            href={ROUTES.zones}
            icon={Hexagon}
            label={t.overview.zones}
            value={stats?.activeZones}
            hint={stats ? t.overview.zonesHint(stats.inactiveZones) : null}
          />
          <StatCard
            href={ROUTES.zones}
            icon={MapPinOff}
            label={t.overview.unzoned}
            value={stats?.unzonedDistricts}
            hint={stats ? (stats.unzonedDistricts > 0 ? t.overview.unzonedHint : t.overview.unzonedOk) : null}
            tone={stats && stats.unzonedDistricts > 0 ? "warn" : "default"}
          />
          <StatCard
            href={ROUTES.couriers}
            icon={Truck}
            label={t.overview.couriersOnShift}
            value={stats?.couriersOnShift}
            hint={stats ? t.overview.couriersHint(stats.activeCouriers) : null}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink-muted">{t.overview.quickLinks}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickLink href={ROUTES.settings} icon={Settings2} label={t.overview.settingsLink} />
          <QuickLink href={ROUTES.interfilial} icon={ArrowLeftRight} label={t.overview.reportLink} />
        </div>
      </section>
    </>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  href: AppRoute;
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  hint: string | null;
  tone?: "default" | "warn";
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <Card className="flex h-full flex-col gap-3 p-5 transition group-hover:border-line-strong group-hover:shadow-raised">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-muted">{label}</span>
          <span className={cn("grid size-9 place-items-center rounded-xl", tone === "warn" ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand")}>
            <Icon className="size-5" aria-hidden />
          </span>
        </div>
        {value === undefined ? (
          <Skeleton className="h-10 w-20" />
        ) : (
          <p className={cn("text-4xl font-semibold tracking-tight tabular", tone === "warn" ? "text-warn" : "text-ink")}>{value}</p>
        )}
        {hint ? <p className="text-sm text-ink-faint">{hint}</p> : <Skeleton className="h-4 w-32" />}
      </Card>
    </Link>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: AppRoute; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink outline-none transition hover:border-line-strong focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <Icon className="size-5 text-brand" aria-hidden />
      <span className="flex-1">{label}</span>
      <ArrowRight className="size-4 text-ink-faint transition group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
