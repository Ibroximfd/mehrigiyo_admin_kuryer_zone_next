"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { describeError } from "@/shared/i18n/messages";
import { useT } from "@/shared/i18n/locale";
import type { Dictionary } from "@/shared/i18n/uz";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState, ErrorState, NoResults } from "@/shared/ui/states";
import { Skeleton } from "@/shared/ui/skeleton";

import { useCourierFilters } from "../hooks/use-courier-filters";
import { useCouriers, useDeactivateCourier, useLogoutCourierDevice, useReactivateCourier } from "../hooks/use-couriers";
import { sortCouriers, type Courier } from "../model/courier";
import { zonesForRegion, type CourierRegionOption, type CourierZoneOption } from "../model/options";
import type { CourierAction } from "./courier-actions";
import { CourierFilters } from "./courier-filters";
import { CourierFormSheet, type CourierSheetTarget } from "./courier-form-sheet";
import { CourierList } from "./courier-list";
import { OneTimePasswordDialog, type OneTimePassword } from "./one-time-password-dialog";
import { SetPasswordDialog } from "./set-password-dialog";

type CouriersViewProps = {
  /** Hamma viloyat zonalari (nofaollari ham — eski bog'lanish nomi uchun). */
  zones: readonly CourierZoneOption[];
  regions: readonly CourierRegionOption[];
};

type Confirmation = { courier: Courier; action: "logout-device" | "deactivate" | "activate" };

export function CouriersView({ zones, regions }: CouriersViewProps) {
  const t = useT();
  const filters = useCourierFilters();
  const couriersQuery = useCouriers(filters.server);
  // Qidiruv serverda (debounce `useCourierFilters` da) — natija shu so'rov bo'yicha.
  const query = filters.server.search.trim();

  const reactivate = useReactivateCourier();
  const deactivate = useDeactivateCourier();
  const logoutDevice = useLogoutCourierDevice();

  const [sheet, setSheet] = useState<CourierSheetTarget | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Courier | null>(null);
  const [oneTimePassword, setOneTimePassword] = useState<OneTimePassword | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const zoneNames = useMemo(() => new Map(zones.map((zone) => [zone.id, zone.name])), [zones]);
  const filterZones = useMemo(() => zonesForRegion(zones, filters.filters.region), [zones, filters.filters.region]);
  const visible = useMemo(() => sortCouriers(couriersQuery.data ?? []), [couriersQuery.data]);

  const handleAction = (courier: Courier, action: CourierAction) => {
    if (action === "edit") setSheet({ mode: "edit", courier });
    else if (action === "set-password") setPasswordTarget(courier);
    else setConfirmation({ courier, action });
  };

  const confirm = () => {
    if (!confirmation) return;
    const { courier, action } = confirmation;
    const mutation = action === "deactivate" ? deactivate : action === "activate" ? reactivate : logoutDevice;
    const success = { deactivate: t.couriers.deactivated, activate: t.couriers.activated, "logout-device": t.couriers.loggedOut };
    mutation.mutate(courier.id, {
      onSuccess: () => toast.success(success[action]),
      onError: (error) => toast.error(describeError(error, t)),
      onSettled: () => setConfirmation(null),
    });
  };

  let content;
  if (couriersQuery.isPending) content = <CouriersSkeleton />;
  else if (couriersQuery.isError) content = <ErrorState error={couriersQuery.error} onRetry={() => void couriersQuery.refetch()} />;
  else if (visible.length === 0 && !filters.isFiltered && !query) {
    content = (
      <EmptyState
        title={t.couriers.emptyTitle}
        description={t.couriers.emptyText}
        action={
          <Button onClick={() => setSheet({ mode: "create" })}>
            <Plus aria-hidden />
            {t.couriers.create}
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = <NoResults query={query || undefined} onClear={filters.reset} />;
  } else {
    content = (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted tabular" aria-live="polite">
          {t.couriers.count(visible.length)}
        </p>
        <CourierList couriers={visible} zoneNames={zoneNames} onAction={handleAction} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="flex-1">
          <CourierFilters
            query={filters.filters.q}
            region={filters.filters.region}
            zone={filters.filters.zone}
            shift={filters.filters.shift}
            status={filters.filters.status}
            regions={regions}
            zones={filterZones}
            onQueryChange={filters.setQuery}
            onRegionChange={filters.setRegion}
            onZoneChange={filters.setZone}
            onShiftChange={filters.setShift}
            onStatusChange={filters.setStatus}
          />
        </div>
        <Button onClick={() => setSheet({ mode: "create" })} className="xl:shrink-0">
          <Plus aria-hidden />
          {t.couriers.create}
        </Button>
      </div>

      {content}

      <CourierFormSheet
        target={sheet}
        onClose={() => setSheet(null)}
        zones={zones}
        regions={regions}
        defaultRegion={filters.filters.region}
        onPassword={setOneTimePassword}
      />
      <SetPasswordDialog courier={passwordTarget} onClose={() => setPasswordTarget(null)} onPassword={setOneTimePassword} />
      <OneTimePasswordDialog value={oneTimePassword} onClose={() => setOneTimePassword(null)} />

      <ConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => (open ? undefined : setConfirmation(null))}
        {...confirmationCopy(confirmation, t)}
        pending={deactivate.isPending || logoutDevice.isPending || reactivate.isPending}
        onConfirm={confirm}
      />
    </div>
  );
}

function confirmationCopy(confirmation: Confirmation | null, t: Dictionary) {
  const name = confirmation?.courier.fullName ?? "";
  switch (confirmation?.action) {
    case "deactivate":
      return {
        title: t.couriers.deactivateTitle(name),
        description: t.couriers.deactivateText,
        confirmLabel: t.couriers.deactivateConfirm,
        intent: "danger" as const,
      };
    case "activate":
      // Backend #26: akkaunt ham tiklanadi, parol o'sha — kuryer qurilmada qayta kiradi.
      return {
        title: t.couriers.activateTitle(name),
        description: t.couriers.activateText(confirmation.courier.hasAccount),
        confirmLabel: t.couriers.activateConfirm,
        intent: "primary" as const,
      };
    default:
      return {
        title: t.couriers.logoutDeviceTitle(name),
        description: t.couriers.logoutDeviceText,
        confirmLabel: t.couriers.logoutDeviceConfirm,
        intent: "primary" as const,
      };
  }
}

function CouriersSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </Card>
      ))}
    </div>
  );
}
