import { MapPinPlus } from "lucide-react";

import { extraAddressDay } from "@/features/orders/extra-address";
import type { ExtraAddress } from "@/features/orders/extra-address";
import { formatDateTime } from "@/lib/format";

/**
 * Zakazdagi qo'shimcha manzillar (2026-11-26) — faqat ko'rish: logist qo'shadi,
 * bosh kuryer ko'radi (kuryerga shu kun manzil hisoblangan, zakaz holati
 * o'zgarmagan). Bo'sh — chizilmaydi.
 */
export function ExtraAddressList({ items }: { items: readonly ExtraAddress[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Qo'shimcha manzil" className="flex flex-col gap-1.5">
      <h3 className="text-ink-faint inline-flex items-center gap-1.5 text-micro uppercase">
        <MapPinPlus className="size-3.5" aria-hidden />
        {`Qo'shimcha manzil · ${items.length} ta`}
      </h3>
      <ul className="divide-line border-line divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5 px-3 py-2 text-dense">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-ink tabular font-semibold">{extraAddressDay(item.date)}</span>
              {item.courier?.fullName ? (
                <span className="text-ink-muted" data-no-translit>
                  {item.courier.fullName}
                </span>
              ) : null}
            </span>
            {item.note ? (
              <span className="text-ink" data-no-translit>
                {item.note}
              </span>
            ) : null}
            {item.byName || item.createdAt ? (
              <span className="text-ink-faint text-meta">
                {item.byName ? <span data-no-translit>{item.byName}</span> : null}
                {item.byName && item.createdAt ? " · " : null}
                {item.createdAt ? <span className="tabular">{formatDateTime(item.createdAt)}</span> : null}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
