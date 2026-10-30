"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { inputClass } from "@/components/kit/field";
import { EmptyView, ErrorView } from "@/components/kit/state-views";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAnomalies } from "@/features/orders/anomalies";
import type { DeliveryAnomaly } from "@/features/orders/anomalies";
import { anomalyLabel, anomalyTone, proofMapLink } from "@/features/orders/delivery-proof";
import type { AnomalyTone } from "@/features/orders/delivery-proof";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { formatClock, formatSom, todayIso } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Aldov belgisi (soxta GPS, uzoqda yopilgan) — qizil, qolgani sariq. */
const FLAG_TONE: Record<AnomalyTone, string> = {
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
};

/**
 * Shubhali yetkazishlar kun bo'yicha: manzildan uzoq, GPS yo'q, soat
 * qochgan, summa kam. Hech biri rad etilmagan — logist ko'rib, kerak bo'lsa
 * kuryer bilan gaplashadi.
 */
export function AnomaliesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [date, setDate] = useState(todayIso());

  const anomalies = useQuery({
    queryKey: queryKeys.anomalies(date),
    queryFn: ({ signal }) => fetchAnomalies(date, signal),
    enabled: open,
    retry: false,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[460px] max-w-[calc(100vw-1.5rem)] flex-col gap-0 p-0"
      >
        <div className="border-line border-b px-5 py-4 pr-12">
          <SheetTitle className="text-ink flex items-center gap-2 text-base font-semibold">
            <TriangleAlert className="text-warn size-4.5" />
            Anomaliyalar
          </SheetTitle>
          <SheetDescription className="mt-0.5 text-meta">
            Qabul qilingan, lekin shubhali yetkazishlar
          </SheetDescription>
          <label className="mt-3 flex items-center gap-2">
            <span className="text-ink-muted text-meta">Kun</span>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(event) => setDate(event.target.value || todayIso())}
              className={cn(inputClass, "h-9 w-auto flex-1 text-dense")}
            />
          </label>
        </div>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {anomalies.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : null}

          {anomalies.isError ? (
            <ErrorView
              message={orderErrorMessage(
                anomalies.error,
                "Anomaliyalarni yuklashda xatolik",
              )}
              onRetry={() => void anomalies.refetch()}
              className="border-line rounded-xl border"
            />
          ) : null}

          {anomalies.data && anomalies.data.length === 0 ? (
            <EmptyView
              Icon={ShieldCheck}
              title="Bu kunda shubhali yetkazish yo'q"
              description="Manzildan uzoqda, GPS'siz yoki kam summa bilan yopilgan buyurtmalar shu yerda chiqadi."
            />
          ) : null}

          {anomalies.data && anomalies.data.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {anomalies.data.map((item) => (
                <AnomalyRow key={item.orderId} item={item} />
              ))}
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AnomalyRow({ item }: { item: DeliveryAnomaly }) {
  const proof = item.proof;
  const mapLink = proof ? proofMapLink(proof) : null;
  return (
    <li className="border-line rounded-xl border px-3.5 py-3">
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.orderDetail(item.orderId)}
          className="text-ink tabular min-w-0 flex-1 truncate text-dense font-semibold hover:underline"
          data-no-translit
        >
          {item.orderNumber || "—"}
        </Link>
        {proof?.deliveredAt ? (
          <span className="text-ink-faint tabular text-fine">
            {formatClock(proof.deliveredAt)}
          </span>
        ) : null}
      </div>
      {item.courier ? (
        <p className="text-ink-muted text-meta mt-0.5" data-no-translit>
          {item.courier.fullName}
        </p>
      ) : null}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {item.flags.map((flag) => (
          <li
            key={flag}
            className={cn(
              "rounded-full px-2 py-0.5 text-fine font-semibold",
              FLAG_TONE[anomalyTone(flag)],
            )}
          >
            {anomalyLabel(flag)}
          </li>
        ))}
      </ul>
      {proof ? (
        <p className="text-ink-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
          {proof.receivedAmount !== null ? (
            <span className="tabular">
              {proof.receivedAmountDisplay ?? formatSom(proof.receivedAmount)}
            </span>
          ) : null}
          {mapLink ? (
            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="text-link inline-flex items-center gap-1 hover:underline"
            >
              <MapPin className="size-3" aria-hidden />
              {proof.distanceToAddressM !== null
                ? `manzildan ${proof.distanceToAddressM} m`
                : "xaritada"}
            </a>
          ) : null}
          {proof.timeDriftS !== null && proof.timeDriftS > 0 ? (
            <span className="tabular">soat farqi {proof.timeDriftS} s</span>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}
