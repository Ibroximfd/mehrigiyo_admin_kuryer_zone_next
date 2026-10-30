"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { fetchActivity } from "@/features/activity/api";
import type { ActivityEntry } from "@/features/activity/types";
import { DashboardCard } from "@/features/orders/components/dashboard/dashboard-card";
import { orderStatusInfo } from "@/features/orders/types";
import { errorCode } from "@/lib/api-client";
import { formatTime, parseDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { useActivityStore } from "@/stores/activity-store";

function entryText(entry: ActivityEntry): string {
  const to = entry.toStatus ? orderStatusInfo(entry.toStatus).label.toLowerCase() : "";
  const parts = [to ? `→ ${to}` : entry.type.replace(/_/g, " "), entry.note].filter(Boolean);
  return parts.join(" · ");
}

/** Oxirgi harakatlar — server jurnalidan (§4.11) 6 ta; to'liqi — jurnal panelida. */
export function RecentActivityCard() {
  const openFeed = useActivityStore((state) => state.setOpen);
  const activity = useQuery({
    // Jurnal paneli shu prefiks ostida cheksiz ro'yxat saqlaydi — alohida kalit,
    // lekin soket `activity` ni eskirtirganda bu ham yangilanadi.
    queryKey: [...queryKeys.activity, "recent"],
    queryFn: ({ signal }) => fetchActivity(1, signal),
    retry: false,
  });
  const entries = (activity.data?.entries ?? []).slice(0, 6);
  const missing = errorCode(activity.error) === "endpoint_missing";

  return (
    <DashboardCard
      title="Oxirgi harakatlar"
      aside={
        <button type="button" onClick={() => openFeed(true)} className="text-link hover:text-brand">
          jurnal
        </button>
      }
      className="flex-1"
    >
      {activity.isPending ? (
        <p className="text-ink-faint text-meta">Yuklanmoqda…</p>
      ) : missing ? (
        <p className="text-ink-faint text-meta">Jurnal backend chiqishi bilan ko&apos;rinadi.</p>
      ) : activity.isError ? (
        <button type="button" onClick={() => void activity.refetch()} className="text-danger text-left text-meta">
          Jurnalni yuklab bo&apos;lmadi — qayta urinish
        </button>
      ) : entries.length === 0 ? (
        <p className="text-ink-faint text-meta">Hali harakat yo&apos;q.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {entries.map((entry) => {
            const at = parseDate(entry.at);
            const mark = entry.toStatus ? orderStatusInfo(entry.toStatus).mark : "var(--amber)";
            return (
              <li key={entry.id} className="flex items-start gap-2.5 text-dense">
                <span className="text-ink-faint tabular w-10 shrink-0">{at ? formatTime(at) : "—"}</span>
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: mark }} />
                <span className="min-w-0">
                  {entry.orderId ? (
                    <Link
                      href={ROUTES.orderDetail(entry.orderId)}
                      className="text-link hover:text-brand font-semibold"
                      data-no-translit
                    >
                      #{entry.orderNumber ?? entry.orderId.slice(0, 8)}
                    </Link>
                  ) : null}{" "}
                  {entryText(entry)}
                  {entry.actor ? <span className="text-ink-faint"> · {entry.actor}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
