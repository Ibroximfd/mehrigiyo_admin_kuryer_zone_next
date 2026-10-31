import { KeyFigures } from "@/components/kit/key-figures";
import { groupThousands } from "@/lib/format";

import type { ChiefMe } from "../types";

/** Zakazlar tepasidagi holat (`chief/me/ summary`) — bir qarashda. */
export function ChiefSummary({ me }: { me: ChiefMe }) {
  const s = me.summary;
  return (
    <KeyFigures
      items={[
        {
          label: "Kelganlar",
          value: groupThousands(s.incoming),
          hint: "kuryerga berilmagan",
          tone: s.incoming > 0 ? "warn" : "default",
        },
        { label: "Faoliyatda", value: groupThousands(s.active), hint: "kuryerlarda" },
        { label: "Kuryerlar", value: groupThousands(s.couriers), hint: `${s.couriersOnShift} tasi smenada` },
        { label: "Bugun yakunlandi", value: groupThousands(s.finalizedToday), hint: "logist tasdiqlagan" },
      ]}
    />
  );
}
