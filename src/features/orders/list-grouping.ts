import { regionLabel } from "./regions";
import { ORDER_STATUSES, orderStatusInfo } from "./types";
import type { LogistOrder } from "./types";

/** Ro'yxatni guruhlash (dizayn: "Guruhlash: viloyat ▾"). */
export type OrderGroup = { key: string; label: string; orders: LogistOrder[] };

const NO_VALUE = "__none__";

function groupKey(order: LogistOrder, grouping: string): [string, string] {
  switch (grouping) {
    case "region": {
      const info = order.deliveryInfo;
      const label = info?.regionDisplay || regionLabel(info?.region) || "";
      return label ? [info?.region ?? label, label] : [NO_VALUE, "Viloyat ko'rsatilmagan"];
    }
    case "status":
      return [order.status, orderStatusInfo(order.status).label];
    case "courier":
      return order.courier
        ? [String(order.courier.id), order.courier.fullName]
        : [NO_VALUE, "Kuryersiz"];
    default:
      return [NO_VALUE, ""];
  }
}

const STATUS_ORDER: string[] = ORDER_STATUSES.map((status) => status.value);

/** Guruhlar: statusda — oqim tartibi, qolganlarida — alifbo; "yo'q" doim oxirida. */
export function groupOrders(orders: LogistOrder[], grouping: string | null): OrderGroup[] | null {
  if (!grouping || orders.length === 0) return null;
  const groups = new Map<string, OrderGroup>();
  for (const order of orders) {
    const [key, label] = groupKey(order, grouping);
    const group = groups.get(key) ?? { key, label, orders: [] };
    group.orders.push(order);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.key === NO_VALUE) return 1;
    if (b.key === NO_VALUE) return -1;
    if (grouping === "status") return STATUS_ORDER.indexOf(a.key) - STATUS_ORDER.indexOf(b.key);
    return a.label.localeCompare(b.label);
  });
}
