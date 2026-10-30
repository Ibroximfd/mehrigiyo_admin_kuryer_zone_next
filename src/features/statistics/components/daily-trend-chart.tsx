"use client";

import { useState } from "react";

import { niceScale } from "@/features/statistics/scale";
import {
  formatCompactMoney,
  formatSom,
  formatUzDay,
  parseDate,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type DailyPoint = {
  date: string;
  delivered: number;
  /** Yetkazilganlarning MOL summasi (chegirmadan oldin, §14.3). */
  amount: number;
  /** Shu kuni yaratilgan; eski deploy bermasa `null`. */
  orders: number | null;
  /** Shu kuni bekor qilingan; eski deploy bermasa `null`. */
  cancelled: number | null;
};

type Metric = "delivered" | "orders" | "cancelled" | "amount";

/**
 * Har o'lchov o'z sana maydonidan (2026-10-01 C §14.3): "Kelgan" —
 * yaratilgan, "Yetkazildi" — yetkazilgan, "Bekor" — bekor qilingan kuni.
 * Ular ustma-ust qo'yilmaydi (bir to'plam emas) — bir vaqtda bittasi.
 * "Bekor" kunliklari jamiga teng bo'lmasligi mumkin (sanasiz eski qatorlar).
 */
const METRICS: { value: Metric; label: string; color: string }[] = [
  { value: "delivered", label: "Yetkazildi", color: "var(--order-delivered-mark)" },
  { value: "orders", label: "Kelgan", color: "var(--brand)" },
  { value: "cancelled", label: "Bekor", color: "var(--order-cancelled-mark)" },
  { value: "amount", label: "Tovar summasi", color: "var(--order-delivered-mark)" },
];

function metricValue(day: DailyPoint, metric: Metric): number {
  return day[metric] ?? 0;
}

/** O'q ostidagi yorliq: `24-avgust` → `24-avg`. */
function shortDay(date: string): { short: string; full: string } {
  const parsed = parseDate(date);
  const full = parsed ? formatUzDay(parsed) : date;
  return {
    full,
    short: full.replace(/-(iyu[nl]|\p{L}{3})\p{L}*$/u, "-$1"),
  };
}

/**
 * Kunlik dinamika — vaqt bo'ylab ustunlar, o'q va bo'linmalar bilan.
 *
 * Bir vaqtda **bitta** o'lchov (soni yoki summa): ikkalasining shkalasi
 * boshqa va ikki o'qli grafik o'quvchini aldaydi. Ustunning o'zi
 * sichqoncha/klaviatura nishoni — ustida sana, son va summa chiqadi;
 * ekran o'quvchi uchun xuddi shu qiymatlar yashirin jadvalda.
 */
export function DailyTrendChart({ data }: { data: DailyPoint[] }) {
  const [metric, setMetric] = useState<Metric>("delivered");
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <p className="text-ink-faint text-meta py-10 text-center">
        Bu davrda kunlik ma&apos;lumot yo&apos;q
      </p>
    );
  }

  // Server bermagan o'lchov tugmasi chiqmaydi (eski deploy).
  const metrics = METRICS.filter(
    (item) =>
      (item.value !== "orders" && item.value !== "cancelled") ||
      data.some((day) => day[item.value] !== null),
  );
  const barColor = METRICS.find((item) => item.value === metric)?.color ?? METRICS[0].color;
  const values = data.map((day) => metricValue(day, metric));
  const scale = niceScale(Math.max(...values));
  const format = (value: number) =>
    metric === "amount" ? formatCompactMoney(value) : String(value);
  // Yorliqlar ustma-ust tushmasin: 10 tadan ko'p bo'lsa siyraklashadi.
  const labelStep = Math.ceil(data.length / 10);
  const focused = active !== null ? data[active] : null;

  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          role="radiogroup"
          aria-label="Grafik o'lchovi"
          className="bg-subtle inline-flex rounded-lg p-0.5"
        >
          {metrics.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={metric === item.value}
              onClick={() => setMetric(item.value)}
              className={cn(
                "text-meta rounded-md px-2.5 py-1 font-medium transition-colors",
                metric === item.value
                  ? "bg-surface text-ink elev-1"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Joriy ustun — tooltip bilan bir xil ma'lumot, joy sakramaydi. */}
        <p className="text-ink-muted tabular min-w-0 truncate text-right text-meta" aria-live="polite">
          {focused ? (
            <>
              <span className="text-ink font-semibold">
                {metric === "amount"
                  ? formatSom(focused.amount)
                  : `${metricValue(focused, metric)} ta`}
              </span>{" "}
              · {shortDay(focused.date).full}
            </>
          ) : (
            "Ustun ustiga olib boring"
          )}
        </p>
      </div>

      <div className="flex gap-2">
        {/* Y o'qi — toza bo'linmalar. */}
        <div className="relative h-48 w-12 shrink-0" aria-hidden>
          {scale.ticks.map((tick) => (
            <span
              key={tick}
              className="text-ink-faint tabular absolute right-0 translate-y-1/2 text-fine leading-none"
              style={{ bottom: `${(tick / scale.max) * 100}%` }}
            >
              {format(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            {/* Gridline — tutash, ingichka, sokin. */}
            {scale.ticks.map((tick) => (
              <span
                key={tick}
                aria-hidden
                className={cn(
                  "absolute inset-x-0 h-px",
                  tick === 0 ? "bg-line" : "bg-line/50",
                )}
                style={{ bottom: `${(tick / scale.max) * 100}%` }}
              />
            ))}

            <ol
              className="absolute inset-0 flex items-end gap-0.5"
              onMouseLeave={() => setActive(null)}
            >
              {data.map((day, index) => {
                const value = metricValue(day, metric);
                const height = (value / scale.max) * 100;
                const { full } = shortDay(day.date);
                const isActive = active === index;

                return (
                  <li key={day.date} className="flex h-full min-w-0 flex-1 justify-center">
                    <button
                      type="button"
                      aria-label={`${full}: ${day.delivered} ta, ${formatSom(day.amount)}`}
                      onMouseEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      onBlur={() => setActive(null)}
                      className="group relative flex h-full w-full items-end justify-center rounded-sm focus-visible:ring-offset-0"
                    >
                      {isActive ? (
                        <span
                          role="tooltip"
                          className={cn(
                            "border-line bg-elevated elev-3 pointer-events-none absolute z-10 rounded-lg border px-2.5 py-1.5 text-left whitespace-nowrap",
                            index > data.length / 2 ? "right-0" : "left-0",
                          )}
                          style={{ bottom: `${Math.max(height, 2)}%`, marginBottom: 8 }}
                        >
                          <span className="text-ink tabular block text-dense font-semibold">
                            {`${day.delivered} ta yetkazildi`}
                          </span>
                          <span className="text-ink-muted tabular block text-fine">
                            {`tovar: ${formatSom(day.amount)}`}
                          </span>
                          {day.orders !== null ? (
                            <span className="text-ink-muted tabular block text-fine">
                              {`${day.orders} ta kelgan`}
                            </span>
                          ) : null}
                          {day.cancelled !== null ? (
                            <span className="text-ink-muted tabular block text-fine">
                              {`${day.cancelled} ta bekor`}
                            </span>
                          ) : null}
                          <span className="text-ink-faint block text-fine">{full}</span>
                        </span>
                      ) : null}

                      <span
                        className="block w-full max-w-6 rounded-t-[4px] transition-[height,opacity] duration-(--dur-standard) ease-out"
                        style={{
                          height: value > 0 ? `${Math.max(height, 1.5)}%` : "2px",
                          backgroundColor: value > 0 ? barColor : "var(--surface-3)",
                          opacity: active === null || isActive ? 1 : 0.55,
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <ol className="mt-1.5 flex gap-0.5" aria-hidden>
            {data.map((day, index) => (
              <li
                key={day.date}
                className="text-ink-faint text-fine min-w-0 flex-1 truncate text-center"
              >
                {index % labelStep === 0 ? shortDay(day.date).short : " "}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Jadval ko'rinishi — rangsiz va sichqonchasiz ham hamma qiymat. */}
      <table className="sr-only">
        <caption>Kunlik dinamika</caption>
        <thead>
          <tr>
            <th scope="col">Sana</th>
            <th scope="col">Kelgan</th>
            <th scope="col">Yetkazildi</th>
            <th scope="col">Bekor</th>
            <th scope="col">Tovar summasi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((day) => (
            <tr key={day.date}>
              <td>{shortDay(day.date).full}</td>
              <td>{day.orders ?? "—"}</td>
              <td>{day.delivered}</td>
              <td>{day.cancelled ?? "—"}</td>
              <td>{formatSom(day.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
