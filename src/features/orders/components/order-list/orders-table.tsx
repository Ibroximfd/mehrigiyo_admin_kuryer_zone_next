"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { OrderListCard } from "@/features/orders/components/order-list/order-list-card";
import type { RowActions } from "@/features/orders/components/order-list/order-row-menu";
import { OrderTableRow } from "@/features/orders/components/order-list/order-table-row";
import type { OrderGroup } from "@/features/orders/list-grouping";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { key: "select", label: "" },
  { key: "number", label: "#" },
  { key: "status", label: "Status" },
  { key: "client", label: "Mijoz" },
  { key: "phones", label: "Telefonlar" },
  { key: "amount", label: "Summa", align: "right" },
  { key: "payment", label: "To'lov" },
  { key: "creator", label: "Yaratdi" },
  { key: "date", label: "Yetk. sana" },
  { key: "address", label: "Manzil" },
  { key: "courier", label: "Kuryer" },
  { key: "menu", label: "" },
] as const;

/**
 * Ro'yxat — dizayndagi jadval (md+) va mobil kartochkalar. Guruhlash
 * yoqilsa har guruh sarlavha qatori bilan boshlanadi.
 */
export function OrdersTable({
  orders,
  groups,
  selected,
  actions,
  onToggleAll,
  dimmed,
}: {
  orders: LogistOrder[];
  groups: OrderGroup[] | null;
  selected: ReadonlySet<string>;
  actions: RowActions;
  onToggleAll: (checked: boolean) => void;
  /** Filtr almashayotganda eski qatorlar xira turadi. */
  dimmed: boolean;
}) {
  const sections = groups ?? [{ key: "all", label: "", orders }];
  const allChecked = orders.length > 0 && orders.every((order) => selected.has(order.id));
  const someChecked = !allChecked && orders.some((order) => selected.has(order.id));

  return (
    <div
      className={cn(
        "border-line bg-surface overflow-hidden rounded-xl border transition-opacity duration-(--dur-standard)",
        dimmed && "opacity-60",
      )}
    >
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-0">
          <thead className="bg-subtle sticky top-0 z-10">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "border-line text-ink-muted text-micro border-b px-2.5 py-2.5 text-left whitespace-nowrap uppercase",
                    column.key === "select" && "w-9 pl-3.5",
                    "align" in column && column.align === "right" && "text-right",
                  )}
                >
                  {column.key === "select" ? (
                    <Checkbox
                      checked={allChecked ? true : someChecked ? "indeterminate" : false}
                      onCheckedChange={(value) => onToggleAll(value === true)}
                      aria-label="Barchasini tanlash"
                    />
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          {sections.map((section) => (
            <tbody key={section.key}>
              {groups ? (
                <tr>
                  <th
                    colSpan={COLUMNS.length}
                    scope="colgroup"
                    className="bg-canvas border-line text-ink-muted border-b px-3.5 py-1.5 text-left text-meta font-semibold"
                  >
                    {section.label}
                    <span className="text-ink-faint tabular ml-2 font-normal">{section.orders.length} ta</span>
                  </th>
                </tr>
              ) : null}
              {section.orders.map((order) => (
                <OrderTableRow
                  key={order.id}
                  order={order}
                  checked={selected.has(order.id)}
                  actions={actions}
                />
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="divide-line divide-y md:hidden">
        {sections.map((section) => (
          <section key={section.key}>
            {groups ? (
              <h2 className="bg-canvas text-ink-muted px-4 py-1.5 text-meta font-semibold">
                {section.label} · {section.orders.length} ta
              </h2>
            ) : null}
            <div className="divide-line divide-y">
              {section.orders.map((order) => (
                <OrderListCard
                  key={order.id}
                  order={order}
                  checked={selected.has(order.id)}
                  actions={actions}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
