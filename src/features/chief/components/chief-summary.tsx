import { Inbox, PackageCheck, Truck, UsersRound } from "lucide-react";

import { StatTile } from "@/components/kit/stat-tile";

import type { ChiefMe } from "../types";

/** Bo'lim tepasidagi ko'rsatkichlar (`chief/me/ summary`). */
export function ChiefSummary({ me }: { me: ChiefMe }) {
  const s = me.summary;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile Icon={Inbox} label="Kelganlar" value={s.incoming} sub="kuryerga berilmagan" emphasis={s.incoming > 0} color="var(--order-review-mark)" />
      <StatTile Icon={Truck} label="Faoliyatda" value={s.active} sub="kuryerlarda" color="var(--order-shipping-mark)" />
      <StatTile Icon={UsersRound} label="Kuryerlar" value={s.couriers} sub={`${s.couriersOnShift} tasi smenada`} />
      <StatTile Icon={PackageCheck} label="Bugun yakunlandi" value={s.finalizedToday} sub="logist tasdiqlagan" color="var(--order-delivered-mark)" />
    </div>
  );
}
