"use client";

import { MapPinOff } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useIsWideScreen } from "@/shared/hooks/use-media-query";
import { describeError } from "@/shared/i18n/messages";
import { useLocale, useT } from "@/shared/i18n/locale";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { EmptyState, ErrorState, NoResults } from "@/shared/ui/states";
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";
import { Tooltip } from "@/shared/ui/tooltip";

import { useDistricts, useUpdateDistrict } from "../hooks/use-districts";
import {
  DISTRICT_NAME_FIELDS,
  districtDisplayName,
  filterDistricts,
  type AdminDistrict,
  type DistrictNameField,
} from "../model/district";
import { InlineNameInput } from "./inline-name-input";

type DistrictsViewProps = {
  region: string;
  query: string;
  onQueryClear: () => void;
  /** Zona nomlari (`zone_id` → nom) — zonalar sahifasidan, app qatlamida yig'iladi. */
  zoneNames: ReadonlyMap<number, string>;
  /** Faollik o'zgarganda zonalar keshini eskirtirish uchun. */
  onZonesAffected: () => void;
};

export function DistrictsView({ region, query, onQueryClear, zoneNames, onZonesAffected }: DistrictsViewProps) {
  const t = useT();
  const locale = useLocale();
  const isWide = useIsWideScreen();
  const districtsQuery = useDistricts(region);
  const update = useUpdateDistrict(region, onZonesAffected);
  const [pendingDeactivation, setPendingDeactivation] = useState<AdminDistrict | null>(null);

  const sorted = useMemo(
    () => [...(districtsQuery.data ?? [])].sort((a, b) => districtDisplayName(a, "uz").localeCompare(districtDisplayName(b, "uz"))),
    [districtsQuery.data],
  );
  const visible = useMemo(() => filterDistricts(sorted, query), [sorted, query]);

  const fieldLabels: Record<DistrictNameField, string> = {
    nameUz: t.districts.nameUz,
    nameUzCyrl: t.districts.nameUzCyrl,
    nameRu: t.districts.nameRu,
  };

  const saveName = (district: AdminDistrict, field: DistrictNameField, value: string) =>
    update.mutateAsync({ code: district.code, patch: { [field]: value } }).catch((error: unknown) => {
      toast.error(describeError(error, t));
      throw error;
    });

  const setActive = (district: AdminDistrict, isActive: boolean) =>
    update.mutate(
      { code: district.code, patch: { isActive } },
      {
        onSuccess: () => toast.success(isActive ? t.districts.activated : t.districts.deactivated),
        onError: (error) => toast.error(describeError(error, t)),
        onSettled: () => setPendingDeactivation(null),
      },
    );

  const requestToggle = (district: AdminDistrict, next: boolean) => {
    if (next) setActive(district, true);
    else setPendingDeactivation(district);
  };

  if (districtsQuery.isPending) return <DistrictsSkeleton />;
  if (districtsQuery.isError) return <ErrorState error={districtsQuery.error} onRetry={() => void districtsQuery.refetch()} />;
  if (sorted.length === 0) return <EmptyState title={t.districts.emptyTitle} description={t.districts.emptyText} />;

  const inactiveCount = sorted.filter((district) => !district.isActive).length;
  const rowProps = { zoneNames, fieldLabels, locale, onSaveName: saveName, onToggle: requestToggle };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-muted tabular" aria-live="polite">
        {t.districts.counts(visible.length, sorted.length)}
        {inactiveCount > 0 ? ` · ${t.districts.inactiveCount(inactiveCount)}` : null}
      </p>

      {visible.length === 0 ? (
        <NoResults query={query} onClear={onQueryClear} />
      ) : isWide ? (
        <DistrictsTable districts={visible} {...rowProps} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((district) => (
            <li key={district.code}>
              <DistrictCard district={district} {...rowProps} />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDeactivation !== null}
        onOpenChange={(open) => (open ? undefined : setPendingDeactivation(null))}
        title={t.districts.deactivateTitle(pendingDeactivation ? districtDisplayName(pendingDeactivation, locale) : "")}
        description={t.districts.deactivateText}
        confirmLabel={t.districts.deactivateConfirm}
        pending={update.isPending}
        onConfirm={() => (pendingDeactivation ? setActive(pendingDeactivation, false) : undefined)}
      />
    </div>
  );
}

type RowProps = {
  district: AdminDistrict;
  zoneNames: ReadonlyMap<number, string>;
  fieldLabels: Record<DistrictNameField, string>;
  locale: "uz" | "ru";
  onSaveName: (district: AdminDistrict, field: DistrictNameField, value: string) => Promise<unknown>;
  onToggle: (district: AdminDistrict, next: boolean) => void;
};

function KindBadge({ district }: { district: AdminDistrict }) {
  const t = useT();
  return <Badge tone={district.kind === "city" ? "info" : "neutral"}>{district.kind === "city" ? t.districts.kindCity : t.districts.kindDistrict}</Badge>;
}

function BoundaryBadge({ district }: { district: AdminDistrict }) {
  const t = useT();
  if (district.hasBoundary) return null;
  return (
    <Tooltip content={t.districts.noBoundaryHint}>
      <Badge tone="warn" tabIndex={0}>
        <MapPinOff aria-hidden />
        {t.districts.noBoundary}
      </Badge>
    </Tooltip>
  );
}

function ZoneCell({ district, zoneNames }: { district: AdminDistrict; zoneNames: ReadonlyMap<number, string> }) {
  const t = useT();
  if (district.zoneId === null) {
    return <Badge tone={district.isActive ? "warn" : "neutral"}>{t.districts.noZone}</Badge>;
  }
  return <span className="text-sm text-ink">{zoneNames.get(district.zoneId) ?? `#${district.zoneId}`}</span>;
}

function NameInputs({ district, fieldLabels, locale, onSaveName, layout }: RowProps & { layout: "row" | "stack" }) {
  return DISTRICT_NAME_FIELDS.map((field) => {
    const input = (
      <InlineNameInput
        key={`${district.code}:${field}`}
        field={field}
        value={district[field]}
        label={`${districtDisplayName(district, locale)}: ${fieldLabels[field]}`}
        onCommit={(value) => onSaveName(district, field, value)}
      />
    );
    return layout === "row" ? (
      <td key={field} className="px-2 py-1.5 align-top">
        {input}
      </td>
    ) : (
      <div key={field} className="flex flex-col gap-0.5">
        <span className="px-3 text-xs text-ink-faint">{fieldLabels[field]}</span>
        {input}
      </div>
    );
  });
}

function DistrictsTable({ districts, ...props }: Omit<RowProps, "district"> & { districts: readonly AdminDistrict[] }) {
  const t = useT();
  return (
    <Card className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-surface-2 text-left text-xs font-medium text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3">{t.districts.code}</th>
            <th scope="col" className="px-5 py-3">{t.districts.nameUz}</th>
            <th scope="col" className="px-5 py-3">{t.districts.nameUzCyrl}</th>
            <th scope="col" className="px-5 py-3">{t.districts.nameRu}</th>
            <th scope="col" className="px-4 py-3">{t.districts.kind}</th>
            <th scope="col" className="px-4 py-3">{t.districts.zone}</th>
            <th scope="col" className="px-4 py-3 text-right">{t.districts.status}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {districts.map((district) => (
            <tr key={district.code} className={district.isActive ? undefined : "bg-surface-2 text-ink-muted"}>
              <td className="px-4 py-2.5 align-top">
                <div className="flex flex-col items-start gap-1.5 pt-1.5">
                  <code className="font-mono text-xs text-ink-muted">{district.code}</code>
                  <BoundaryBadge district={district} />
                </div>
              </td>
              <NameInputs district={district} layout="row" {...props} />
              <td className="px-4 py-2.5 align-top">
                <div className="pt-1.5">
                  <KindBadge district={district} />
                </div>
              </td>
              <td className="px-4 py-2.5 align-top">
                <div className="pt-1.5">
                  <ZoneCell district={district} zoneNames={props.zoneNames} />
                </div>
              </td>
              <td className="px-4 py-2.5 text-right align-top">
                <div className="pt-2">
                  <Switch
                    checked={district.isActive}
                    onCheckedChange={(next) => props.onToggle(district, next)}
                    aria-label={`${districtDisplayName(district, props.locale)}: ${t.districts.status}`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function DistrictCard(props: RowProps) {
  const t = useT();
  const { district, locale } = props;
  return (
    <Card className={district.isActive ? "p-4" : "bg-surface-2 p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate font-medium text-ink">{districtDisplayName(district, locale)}</p>
          <code className="block truncate font-mono text-xs text-ink-faint">{district.code}</code>
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge district={district} />
            <ZoneCell district={district} zoneNames={props.zoneNames} />
            <BoundaryBadge district={district} />
          </div>
        </div>
        <Switch
          checked={district.isActive}
          onCheckedChange={(next) => props.onToggle(district, next)}
          aria-label={`${districtDisplayName(district, locale)}: ${t.districts.status}`}
          className="mt-1"
        />
      </div>
      <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
        <NameInputs layout="stack" {...props} />
      </div>
    </Card>
  );
}

function DistrictsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-4 w-24" />
      <Card className="divide-y divide-line">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 flex-1 md:block" />
            <Skeleton className="hidden h-4 flex-1 md:block" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>
        ))}
      </Card>
    </div>
  );
}
