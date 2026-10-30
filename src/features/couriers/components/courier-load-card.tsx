import Link from "next/link";

import type { Courier } from "@/features/couriers/types";
import { DashboardCard } from "@/features/orders/components/dashboard/dashboard-card";
import { formatCompactMoney } from "@/lib/format";
import { ROUTES } from "@/lib/routes";

/**
 * Kuryerlar yuklamasi: yetkazdi / biriktirilgan, naqd va bajarilish chizig'i.
 * Ko'p yuklangan kuryer tepada.
 */
export function CourierLoadCard({
  couriers,
  isPending,
  missing,
}: {
  couriers: Courier[];
  isPending: boolean;
  /** Kuryerlar endpointi hali chiqmagan. */
  missing: boolean;
}) {
  const active = couriers
    .filter((courier) => courier.isActive && courier.today.assigned > 0)
    .sort((a, b) => b.today.assigned - a.today.assigned)
    .slice(0, 6);

  return (
    <DashboardCard
      title="Kuryerlar yuklamasi"
      aside={
        <Link href={ROUTES.couriers} className="text-link hover:text-brand">
          biriktirish
        </Link>
      }
    >
      {isPending ? (
        <p className="text-ink-faint text-meta">Yuklanmoqda…</p>
      ) : missing ? (
        <p className="text-ink-faint text-meta">
          Kuryerlar bo&apos;limi backend chiqishi bilan ko&apos;rinadi.
        </p>
      ) : active.length === 0 ? (
        <p className="text-ink-faint text-meta">
          Bugun kuryerlarga buyurtma biriktirilmagan.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((courier) => {
            const share = Math.min(
              100,
              Math.round(
                (courier.today.delivered / courier.today.assigned) * 100,
              ),
            );
            return (
              <li key={courier.id} className="flex flex-col gap-1 text-dense">
                <div className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <b className="font-semibold" data-no-translit>
                      {courier.fullName}
                    </b>
                  </span>
                  <span className="text-ink-muted tabular shrink-0">
                    {courier.today.delivered}/{courier.today.assigned} · naqd{" "}
                    {formatCompactMoney(courier.today.codTotal)}
                    {courier.today.stops !== null && courier.today.stops > 0
                      ? ` · ${courier.today.stops} manzil`
                      : null}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={share}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${courier.fullName}: ${share}% yetkazildi`}
                  className="bg-surface-3 h-2 overflow-hidden rounded-full"
                >
                  {/* Kenglik — hisoblangan qiymat, token emas. */}
                  <i
                    className="bg-brand block h-full rounded-full transition-[width] duration-(--dur-standard) ease-out"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
