"use client";

import { useQuery } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchOrderTimeline } from "@/features/orders/api";
import { pendingDoorPayment } from "@/features/orders/timeline";
import type { LogistOrder } from "@/features/orders/types";
import { formatTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

/** Muddat o'tganini sezish uchun qayta hisoblash oralig'i. */
const TICK_MS = 30_000;

/**
 * "Onlayn to'lov kutilmoqda (Payme, 12:45 gacha)" — kuryer eshikda QR
 * ochgan yoki mijoz ilovadan ochgan (§2.4b). Lentadan olinadi: oxirgi
 * `payment.door_opened` dan keyin `paid` / `door_closed` kelmaguncha.
 * Lenta so'rovi tarix bo'limi bilan umumiy (bir xil kalit).
 */
export function DoorPaymentStrip({ order }: { order: LogistOrder }) {
  const timeline = useQuery({
    queryKey: queryKeys.orderTimeline(order.id),
    queryFn: ({ signal }) => fetchOrderTimeline(order.id, signal),
  });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const door = timeline.data ? pendingDoorPayment(timeline.data, now) : null;
  if (!door) return null;

  const detail = [door.provider, door.expiresAt ? `${formatTime(door.expiresAt)} gacha` : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      role="status"
      className="border-amber-line bg-amber-soft flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5"
    >
      <CreditCard className="text-gold size-4 shrink-0" aria-hidden />
      <span className="text-gold text-dense font-medium">
        {detail ? `Onlayn to'lov kutilmoqda (${detail})` : "Onlayn to'lov kutilmoqda"}
      </span>
    </div>
  );
}
