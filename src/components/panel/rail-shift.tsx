"use client";

import { useQuery } from "@tanstack/react-query";
import { Banknote, PackageCheck, Truck } from "lucide-react";
import Link from "next/link";

import { fetchOrdersBoard } from "@/features/orders/api";
import { orderStatusInfo } from "@/features/orders/types";
import { formatCompactMoney } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Yon paneldagi "bugungi smena" paneli.
 *
 * ── Nima uchun bu bor ────────────────────────────────────────────────────
 * Yon panelning pastki yarmi butunlay bo'sh turardi: beshta bo'lim havolasi,
 * keyin ~600px hech narsa, keyin foydalanuvchi menyusi. Katta monitorda bu
 * eng ko'zga tashlanadigan "tugallanmagan" belgi edi — interfeys shu yerda
 * to'xtab qolgandek ko'rinardi.
 *
 * Bo'shliqni bezak bilan emas, ish bilan to'ldiramiz: logist qaysi bo'limda
 * turmasin, kunning holati ko'z oldida qoladi — nechta ish oqimda, nechtasi
 * yopildi, kuryerlarda qancha naqd bor.
 *
 * ── So'rov haqida ────────────────────────────────────────────────────────
 * Kalit boshqaruv sahifasi bilan AYNAN BIR XIL (`ordersBoard({period:"today"})`),
 * shuning uchun boshqaruvda turganda qo'shimcha so'rov ketmaydi — ikkalasi
 * bitta keshdan o'qiydi. Boshqa bo'limlarda bitta yengil so'rov qo'shiladi
 * va u 60 soniya "yangi" hisoblanadi.
 *
 * Backend doskani bermasa (`endpoint_missing`) panel jimgina yashirinadi —
 * yon panelda xato ko'rsatish ish oqimini to'sadi, foydasi esa yo'q.
 */
const TODAY = { period: "today" } as const;

export function RailShift({ collapsed }: { collapsed: boolean }) {
  const board = useQuery({
    queryKey: queryKeys.ordersBoard(TODAY),
    queryFn: ({ signal }) => fetchOrdersBoard(TODAY, signal),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!board.data) return null;

  const columnFor = (status: string) =>
    board.data.columns.find((column) => column.status === status);

  const delivered = columnFor("delivered");
  // Oqimdagilar — logist ishlaydigan ikki bosqich (`02` §2.1).
  const active =
    (columnFor("confirmed")?.count ?? 0) + (columnFor("shipping")?.count ?? 0);
  const shipping = columnFor("shipping")?.count ?? 0;
  const deliveredCount = delivered?.count ?? 0;
  const total = active + deliveredCount;
  const done = total > 0 ? Math.round((deliveredCount / total) * 100) : 0;

  /* Yig'ilgan holatda — faqat ikkita raqam, ustma-ust. */
  if (collapsed) {
    return (
      <div className="mt-4 space-y-2 px-2">
        <RailStatDot
          value={active}
          label="oqimda"
          color="var(--order-shipping-mark)"
          href={`${ROUTES.orders}?view=board`}
        />
        <RailStatDot
          value={deliveredCount}
          label="yetkazildi"
          color="var(--order-delivered-mark)"
          href={`${ROUTES.orders}?status=delivered&view=list`}
        />
      </div>
    );
  }

  return (
    <section className="mt-5 px-3">
      <p className="text-rail-ink-muted text-micro px-2 pb-2 tracking-widest uppercase">
        Bugungi smena
      </p>

      <div className="border-rail-line bg-rail-elevated/70 rounded-xl border p-3">
        {/* Kun qanchaga bajarilgani — bitta chiziq, ikkita son. */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-rail-ink text-h1">{deliveredCount}</span>
          <span className="text-rail-ink-muted text-meta">
            / {total} ta
          </span>
        </div>

        <span className="bg-rail mt-2 block h-1.5 overflow-hidden rounded-full">
          <span
            className="block h-full rounded-r-[3px] transition-[width] duration-(--dur-standard) ease-out"
            style={{
              width: `${done}%`,
              backgroundColor: "var(--order-delivered-mark)",
            }}
          />
        </span>
        <p className="text-rail-ink-muted text-fine mt-1.5">
          kun {done}% bajarildi
        </p>

        <div className="border-rail-line mt-3 space-y-1.5 border-t pt-3">
          <RailStatRow
            Icon={Truck}
            label="Yo'lda"
            value={String(shipping)}
            color={orderStatusInfo("shipping").mark}
            href={`${ROUTES.orders}?status=shipping&view=list`}
          />
          <RailStatRow
            Icon={PackageCheck}
            label="Navbatda"
            value={String(columnFor("confirmed")?.count ?? 0)}
            color={orderStatusInfo("confirmed").mark}
            href={`${ROUTES.orders}?status=confirmed&view=list`}
          />
          {delivered?.totalAmount !== null &&
          delivered?.totalAmount !== undefined ? (
            <RailStatRow
              Icon={Banknote}
              label="Aylanma"
              value={formatCompactMoney(delivered.totalAmount)}
              color="var(--rail-gold)"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function RailStatRow({
  Icon,
  label,
  value,
  color,
  href,
}: {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="text-rail-ink-muted flex-1 truncate text-meta">
        {label}
      </span>
      <span className="text-rail-ink tabular text-meta font-semibold">
        {value}
      </span>
    </>
  );

  if (!href) {
    return <div className="flex items-center gap-2">{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        "hover:bg-rail-hover -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-0.5",
        "transition-colors duration-(--dur-micro)",
      )}
    >
      {body}
    </Link>
  );
}

/** Yig'ilgan yon panel uchun — rangli nuqta va son. */
function RailStatDot({
  value,
  label,
  color,
  href,
}: {
  value: number;
  label: string;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      title={`${value} ta ${label}`}
      className="hover:bg-rail-hover flex flex-col items-center rounded-lg py-1.5 transition-colors"
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-rail-ink tabular mt-1 text-meta font-semibold">
        {value}
      </span>
    </Link>
  );
}
