"use client";

import { useIsWideScreen } from "@/shared/hooks/use-media-query";
import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { Card } from "@/shared/ui/card";

import type { Courier } from "../model/courier";
import { CourierActions, type CourierAction } from "./courier-actions";
import {
  CourierAccount,
  CourierDevice,
  CourierLoad,
  CourierPhone,
  CourierShift,
  CourierToday,
  CourierZones,
} from "./courier-bits";

type CourierListProps = {
  couriers: readonly Courier[];
  zoneNames: ReadonlyMap<number, string>;
  onAction: (courier: Courier, action: CourierAction) => void;
};

/** `lg` dan kengda — jadval, torroq ekranda — kartochkalar (gorizontal aylantirish yo'q). */
export function CourierList(props: CourierListProps) {
  return useIsWideScreen() ? <CourierTable {...props} /> : <CourierCards {...props} />;
}

function CourierTable({ couriers, zoneNames, onAction }: CourierListProps) {
  const t = useT();
  return (
    <Card className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-2 text-left text-xs font-medium text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3">{t.couriers.fullName}</th>
            <th scope="col" className="px-4 py-3">{t.couriers.zones}</th>
            <th scope="col" className="px-4 py-3">{t.couriers.shift}</th>
            <th scope="col" className="px-4 py-3 text-right" title={t.couriers.loadHint}>{t.couriers.load}</th>
            <th scope="col" className="px-4 py-3">{t.couriers.today}</th>
            <th scope="col" className="px-4 py-3">{t.couriers.account}</th>
            <th scope="col" className="px-4 py-3">{t.couriers.device}</th>
            <th scope="col" className="w-14 px-2 py-3">
              <span className="sr-only">{t.common.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {couriers.map((courier) => (
            <tr key={courier.id} className={cn("align-top", !courier.isActive && "bg-surface-2")}>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onAction(courier, "edit")}
                  className="block rounded text-left font-medium text-ink outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  {courier.fullName}
                </button>
                <CourierPhone phone={courier.phone} />
              </td>
              <td className="max-w-64 px-4 py-3">
                <CourierZones courier={courier} zoneNames={zoneNames} />
              </td>
              <td className="px-4 py-3">
                <CourierShift courier={courier} />
              </td>
              <td className="px-4 py-3 text-right">
                <CourierLoad courier={courier} />
              </td>
              <td className="px-4 py-3">
                <CourierToday courier={courier} />
              </td>
              <td className="px-4 py-3">
                <CourierAccount courier={courier} />
              </td>
              <td className="max-w-56 px-4 py-3">
                <CourierDevice courier={courier} />
              </td>
              <td className="px-2 py-2 text-right">
                <CourierActions courier={courier} onAction={(action) => onAction(courier, action)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function CourierCards({ couriers, zoneNames, onAction }: CourierListProps) {
  const t = useT();
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {couriers.map((courier) => (
        <li key={courier.id}>
          <Card className={cn("flex flex-col gap-3 p-4", !courier.isActive && "bg-surface-2")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onAction(courier, "edit")}
                  className="block max-w-full truncate rounded text-left font-semibold text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  {courier.fullName}
                </button>
                <CourierPhone phone={courier.phone} />
              </div>
              <CourierActions courier={courier} onAction={(action) => onAction(courier, action)} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <CourierShift courier={courier} />
              <CourierAccount courier={courier} />
            </div>
            <CourierZones courier={courier} zoneNames={zoneNames} />
            <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <div>
                <dt className="text-xs text-ink-faint">{t.couriers.load}</dt>
                <dd>
                  <CourierLoad courier={courier} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-faint">{t.couriers.today}</dt>
                <dd>
                  <CourierToday courier={courier} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="sr-only">{t.couriers.device}</dt>
                <dd>
                  <CourierDevice courier={courier} />
                </dd>
              </div>
            </dl>
          </Card>
        </li>
      ))}
    </ul>
  );
}
