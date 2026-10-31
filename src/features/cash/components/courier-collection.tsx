"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { parseISO } from "date-fns";
import {
  HandCoins,
  LoaderCircle,
  ReceiptText,
  SearchX,
  Wallet,
} from "lucide-react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useState } from "react";

import { DateRangeField } from "@/components/kit/date-range";
import { Section } from "@/components/kit/key-figures";
import { SelectField } from "@/components/kit/select-field";
import {
  EmptyView,
  ErrorView,
  TableSkeleton,
} from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchChiefCouriers } from "@/features/chief/api";
import { errorMessage } from "@/lib/api-client";
import { formatSom, formatUzDate } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";

import { fetchCourierHandovers } from "../api";
import { CASH_SORTS, CASH_STATUSES, courierHandoverView } from "../types";
import type { CashSort, CourierHandover, CourierHandoverView } from "../types";
import { AcceptDialog } from "./accept-dialog";
import { CourierCodSheet } from "./courier-cod-sheet";

const STATUS: Record<CourierHandoverView, { label: string; color: string }> = {
  pending: { label: "kutilmoqda", color: "var(--brand)" },
  overdue: { label: "muddati o'tgan", color: "var(--danger)" },
  confirmed: { label: "qabul qilindi", color: "var(--ok)" },
  disputed: { label: "kam qabul qilindi", color: "var(--warn)" },
};

const SORT_LABELS: Record<CashSort, string> = {
  "-date": "Sana: yangi birinchi",
  date: "Sana: eski birinchi",
  "-amount": "Summa: katta birinchi",
  amount: "Summa: kichik birinchi",
  courier: "Kuryer: A–Z",
};

function day(iso: string): string {
  return iso ? formatUzDate(parseISO(iso)) : "—";
}

/** Kassa filtri URLda; hammasi serverda (V10). «Muddati o'tgan» — `pending` dan 3 kundan eskisi. */
function useCashFilters() {
  const [state, setState] = useQueryStates({
    from: parseAsString,
    to: parseAsString,
    courier: parseAsInteger,
    status: parseAsStringLiteral(CASH_STATUSES),
    sort: parseAsStringLiteral(CASH_SORTS),
  });
  return {
    state,
    sort: state.sort ?? "-date",
    narrowed: Boolean(
      state.from || state.to || state.courier !== null || state.status,
    ),
    set: (patch: Partial<typeof state>) => void setState(patch),
    clear: () =>
      void setState({ from: null, to: null, courier: null, status: null }),
  };
}

/**
 * Kassa 1-pog'ona: kuryer → bosh kuryer (§6). Kuryer ilovadan topshirgan pul
 * (`chief/cod/handovers/`): sana, kuryer, holat bo'yicha filtr va tartib.
 * «Qabul qilish» sanalgan summani so'raydi (`chief/couriers/{id}/settle/`) —
 * kam bo'lsa farq kuryerda qarz. Kuryer tanlansa — «Naqd hisobi»: e'lon
 * qilinmagan kunlar ham, bir necha kunni birga qabul qilish (V11).
 */
export function CourierCollection({ canAccept }: { canAccept: boolean }) {
  const controls = useCashFilters();
  const [accepting, setAccepting] = useState<CourierHandover | null>(null);
  const [codOpen, setCodOpen] = useState(false);
  const couriers = useQuery({
    queryKey: queryKeys.chiefCouriers,
    queryFn: ({ signal }) => fetchChiefCouriers(signal),
  });
  const { state } = controls;
  const serverStatus = state.status === "overdue" ? "pending" : state.status;
  const query = {
    status: serverStatus,
    courierId: state.courier,
    from: state.from,
    to: state.to,
    sort: controls.sort,
  };
  const handovers = useInfiniteQuery({
    queryKey: queryKeys.chiefCourierHandovers(query),
    queryFn: ({ pageParam, signal }) =>
      fetchCourierHandovers({ ...query, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last, all) =>
      last.hasMore ? all.length + 1 : undefined,
  });
  const today = new Date();
  const loaded = handovers.data?.pages.flatMap((page) => page.rows) ?? [];
  const rows =
    state.status === "overdue"
      ? loaded.filter((row) => courierHandoverView(row, today) === "overdue")
      : loaded;
  const selectedCourier =
    (couriers.data ?? []).find((courier) => courier.id === state.courier) ??
    null;

  return (
    <Section
      title="Kuryerlardan qabul"
      description="Har kuni, 3–4 kunda yoki haftada bir — kuryer topshirgan pulni qabul qiling"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <DateRangeField
          from={state.from ?? ""}
          to={state.to ?? ""}
          onChange={(from, to) =>
            controls.set({ from: from || null, to: to || null })
          }
          onClear={
            state.from || state.to
              ? () => controls.set({ from: null, to: null })
              : undefined
          }
          className="sm:col-span-2"
        />
        <SelectField
          label="Kuryer"
          allLabel="Hamma kuryer"
          value={state.courier === null ? null : String(state.courier)}
          options={(couriers.data ?? []).map((courier) => ({
            value: String(courier.id),
            label: courier.fullName,
            translate: false,
          }))}
          onChange={(value) =>
            controls.set({ courier: value === null ? null : Number(value) })
          }
          className="lg:w-44"
        />
        <SelectField
          label="Holat"
          allLabel="Hamma holat"
          value={state.status}
          options={CASH_STATUSES.map((status) => ({
            value: status,
            label: STATUS[status].label,
          }))}
          onChange={(value) =>
            controls.set({
              status: CASH_STATUSES.find((status) => status === value) ?? null,
            })
          }
          className="lg:w-44"
        />
        <Select
          value={controls.sort}
          onValueChange={(value) =>
            controls.set({
              sort:
                CASH_SORTS.find((sort) => sort === value && sort !== "-date") ??
                null,
            })
          }
        >
          <SelectTrigger aria-label="Tartib" className="w-full lg:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CASH_SORTS.map((sort) => (
              <SelectItem key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCourier && canAccept ? (
          <Button
            variant="outline"
            className="lg:ml-auto"
            onClick={() => setCodOpen(true)}
          >
            <ReceiptText />
            Naqd hisobi
          </Button>
        ) : null}
      </div>

      {handovers.isPending ? (
        <TableSkeleton
          rows={5}
          className="border-line overflow-hidden rounded-2xl border"
        />
      ) : handovers.isError ? (
        <ErrorView
          message={errorMessage(
            handovers.error,
            "Kuryerlar pulini yuklashda xatolik",
          )}
          onRetry={() => void handovers.refetch()}
          className="border-line bg-surface rounded-2xl border"
        />
      ) : rows.length === 0 && !handovers.hasNextPage ? (
        controls.narrowed ? (
          <EmptyView
            Icon={SearchX}
            title="Hech narsa topilmadi"
            description="Sana yoki filtrlarni o'zgartiring."
            action={
              <Button variant="outline" onClick={controls.clear}>
                Filtrni tozalash
              </Button>
            }
            className="border-line bg-surface rounded-2xl border"
          />
        ) : (
          <EmptyView
            Icon={Wallet}
            title="Kuryerlardan topshiriq yo'q"
            description="Kuryer ilovadan pul topshirsa shu yerda kun bo'yicha ko'rinadi."
            className="border-line bg-surface rounded-2xl border"
          />
        )
      ) : (
        <div className="border-line bg-surface overflow-hidden rounded-2xl border">
          <p className="text-ink-faint border-line border-b px-4 py-2 text-meta">
            {`${handovers.data?.pages[0]?.count ?? rows.length} ta yozuv`}
          </p>
          <ul className="divide-line divide-y">
            {rows.map((row) => (
              <HandoverRow
                key={`${row.courier?.id ?? 0}-${row.date}`}
                row={row}
                today={today}
                onAccept={canAccept ? () => setAccepting(row) : null}
              />
            ))}
          </ul>
          {handovers.hasNextPage ? (
            <div className="border-line border-t p-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                disabled={handovers.isFetchingNextPage}
                onClick={() => void handovers.fetchNextPage()}
              >
                {handovers.isFetchingNextPage ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                Yana yuklash
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {accepting?.courier ? (
        <AcceptDialog
          courier={accepting.courier}
          date={accepting.date}
          dateTo={accepting.date}
          amount={accepting.amount}
          onClose={() => setAccepting(null)}
        />
      ) : null}
      {codOpen && selectedCourier ? (
        <CourierCodSheet
          courier={{
            id: selectedCourier.id,
            fullName: selectedCourier.fullName,
          }}
          onClose={() => setCodOpen(false)}
        />
      ) : null}
    </Section>
  );
}

function HandoverRow({
  row,
  today,
  onAccept,
}: {
  row: CourierHandover;
  today: Date;
  /** `null` — `cash.accept` dopuski yo'q: tugma chiqmaydi. */
  onAccept: (() => void) | null;
}) {
  const status = STATUS[courierHandoverView(row, today)];
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5">
      <span className="text-ink w-20 shrink-0 text-dense">{day(row.date)}</span>
      <span className="min-w-0 flex-1 basis-40">
        <span
          className="text-ink block truncate text-dense font-semibold"
          data-no-translit
        >
          {row.courier?.fullName ?? "—"}
        </span>
        {row.byFilial.length > 0 ? (
          <span className="text-ink-faint block truncate text-meta">
            {row.byFilial.map((split, index) => (
              <span key={`${split.filialName}-${index}`}>
                {index > 0 ? " · " : null}
                <span data-no-translit>{split.filialName || "—"}</span>{" "}
                <span>{formatSom(split.amount)}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-ink tabular text-dense font-semibold">
          {formatSom(row.amount)}
        </span>
        {row.confirmedAmount !== null && row.confirmedAmount !== row.amount ? (
          <span className="text-warn tabular text-fine">{`qabul ${formatSom(row.confirmedAmount)}`}</span>
        ) : null}
      </span>
      <StatusPill label={status.label} color={status.color} size="sm" />
      {onAccept && row.status === "pending" && row.courier ? (
        <Button size="sm" variant="outline" onClick={onAccept}>
          <HandCoins />
          Qabul qilish
        </Button>
      ) : null}
    </li>
  );
}
