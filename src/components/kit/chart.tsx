"use client";

import { cn } from "@/lib/utils";

/**
 * Grafik primitivlari — sof CSS/SVG, kutubxonasiz.
 *
 * Nega kutubxona emas: doskadagi zichlik va `data-perf="low"` pog'onasi shu
 * loyihaning asosiy cheklovi (zaif ofis kompyuteri). Bu yerdagi grafiklar
 * bir nechta `div` va bitta `svg` dan iborat — bundle nolga teng, ranglar esa
 * to'g'ridan-to'g'ri mavzu tokenlaridan keladi, ya'ni yorug'/qorong'i rejim
 * o'zi moslashadi va hech qayerda `dark:` prefiksi kerak emas.
 *
 * ── Rang bo'yicha muhim qaror ────────────────────────────────────────────
 * Status ranglari (`--order-*`) butun ekotizim bo'ylab umumiy: bir status —
 * bir rang, hamma saytda. Ular *kategorik palitra* sifatida tekshiruvdan
 * o'tmaydi — masalan "Tasdiqlangan" (#006c56) bilan "To'langan" (#1a6b35)
 * orasidagi farq oddiy ko'z uchun ham ΔE 4.6, "Tayyorlanmoqda" bilan
 * "Yetkazilmoqda" esa protanopiyada ΔE 2.5. Ranglarni o'zgartirish
 * ekotizim kelishuvini buzadi, shuning uchun boshqa yo'l tanlandi:
 *
 *   BU YERDAGI HECH BIR GRAFIK RANGGA TAYANMAYDI.
 *
 * Har bir ustun/bo'lak yonida o'z nomi va soni yozilgan (direct label),
 * bo'laklar orasida 2px sirt oralig'i bor. Rang faqat "yana bir belgi",
 * yagona belgi emas. Shu sababli aylana diagramma (pie/donut) ham yo'q —
 * u ranggacha qisqaradigan yagona shakl.
 * ────────────────────────────────────────────────────────────────────── */

/** Sirt ustidagi grafik kartochkasi — sarlavha + izoh + tana. */
export function ChartCard({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "glass-card rounded-2xl border p-4 sm:p-5",
        className,
      )}
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-ink text-title">{title}</h2>
          {description ? (
            <p className="text-ink-faint text-meta mt-0.5">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Gorizontal ustunlar ro'yxati
// ─────────────────────────────────────────────────────────────────────────────

export type BarDatum = {
  key: string;
  label: string;
  value: number;
  /** O'ng chekkadagi ikkinchi qiymat — odatda summa. */
  meta?: string | null;
  color: string;
};

/**
 * Gorizontal ustunlar — "kattaligini solishtir" ishi uchun sukutdagi shakl.
 *
 * Ustun 10px (spetsifikatsiya bo'yicha 24px dan yupqa), oldingi cheti 4px
 * yumaloq, tayanchi to'g'ri burchak. Setka chiziqlari yo'q: har bir qator
 * o'z sonini yonida ko'tarib turadi, ya'ni setka takrorlash bo'lardi.
 *
 * Bu komponentning o'zi ayni paytda **jadval ko'rinishi** ham: nom, son va
 * summa matn sifatida DOMda turadi — Ctrl+F topadi, skrinrider o'qiydi,
 * nusxa ko'chirsa jadval bo'lib tushadi.
 */
export function BarList({
  data,
  total,
  emptyLabel = "Ma'lumot yo'q",
  valueSuffix,
  className,
}: {
  data: BarDatum[];
  /**
   * Ustun uzunligi nimaga nisbatan o'lchanadi. Berilmasa eng katta qiymat
   * olinadi — ya'ni eng uzun ustun har doim to'liq kenglikda turadi.
   */
  total?: number;
  emptyLabel?: string;
  valueSuffix?: string;
  className?: string;
}) {
  const max = Math.max(1, total ?? Math.max(...data.map((item) => item.value), 0));
  const hasMeta = data.some((item) => item.meta);

  if (data.length === 0) {
    return <p className="text-ink-faint text-meta py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {data.map((item) => {
        const share = Math.min(100, (item.value / max) * 100);

        return (
          <li
            key={item.key}
            className="group grid grid-cols-[minmax(6.5rem,9rem)_1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(8rem,11rem)_1fr_auto_auto]"
          >
            {/* Nom — rang bilan emas, matn bilan taniladi. */}
            <span className="text-ink-muted text-dense flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate">{item.label}</span>
            </span>

            {/* O'lchov chizig'i. Tayanch chapda, o'sish o'ngga. */}
            <span className="bg-surface-3 relative h-2.5 min-w-0 rounded-full">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-(--dur-standard) ease-out"
                style={{
                  width: `${share}%`,
                  backgroundColor: item.color,
                  // Nolinchi qiymat ham ko'rinib tursin — "yo'q" va "juda oz"
                  // farqi ustun uzunligidan emas, sondan o'qiladi.
                  minWidth: item.value > 0 ? "0.5rem" : "0",
                }}
              />
            </span>

            <span className="text-ink tabular text-dense w-12 shrink-0 text-right font-semibold">
              {item.value}
              {valueSuffix ?? ""}
            </span>

            {hasMeta ? (
              <span className="text-ink-faint tabular text-meta hidden w-28 shrink-0 text-right sm:block">
                {item.meta ?? ""}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vaqt qatori (kunlik dinamika)
// ─────────────────────────────────────────────────────────────────────────────

export type TrendDatum = {
  key: string;
  /** O'q ostidagi qisqa yorliq: `24-avg`. */
  label: string;
  /** Sichqoncha ostidagi to'liq matn: sana + son + summa. */
  title: string;
  value: number;
  /** Ustun ustidagi ikkinchi qiymat (summa) — faqat tanlanganlarida. */
  meta?: string | null;
};

/**
 * Kunlik ustunlar — "vaqt bo'ylab qanday o'zgardi" ishi uchun.
 *
 * Nega vertikal: vaqt qatorida o'q chapdan o'ngga oqadi va ko'z shaklni
 * (o'sish/pasayish) shundan o'qiydi. Gorizontal ro'yxat esa "kattaligini
 * solishtir" ishiga mo'ljallangan (`BarList`).
 *
 * Ranga tayanmaydi: har ustun `title` da o'z sanasi va soni bilan, eng
 * baland kuni esa ustma-ust yozuv bilan belgilanadi. Ustunlar soni ko'p
 * bo'lsa yorliqlar siyraklashadi — matn ustma-ust tushmaydi.
 */
export function TrendBars({
  data,
  color = "var(--brand)",
  peakColor = "var(--ok)",
  emptyLabel = "Bu davrda ma'lumot yo'q",
  className,
}: {
  data: TrendDatum[];
  color?: string;
  /** Eng katta ustun rangi (dizayn: ko'k ichida bitta yashil). */
  peakColor?: string;
  emptyLabel?: string;
  className?: string;
}) {
  if (data.length === 0) {
    return <p className="text-ink-faint text-meta py-6 text-center">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((item) => item.value), 1);
  const peak = data.reduce(
    (best, item) => (item.value > best.value ? item : best),
    data[0],
  );
  // Yorliqlar zich bo'lib ketmasin: 14 ta ustundan keyin har ikkinchisi.
  const labelStep = Math.ceil(data.length / 14);

  return (
    // Ustun soni oz bo'lsa (1–3 kun) karta bo'ylab cho'zilmasin —
    // kenglik ustun soniga qarab hisoblanadi.
    <div className={cn("min-w-0", className)} style={{ maxWidth: data.length < 6 ? `${data.length * 7}rem` : undefined }}>
      <ol
        className="grid h-52 items-end gap-2.5"
        style={{ gridTemplateColumns: gridColumns(data.length) }}
      >
        {data.map((item) => {
          const height = (item.value / max) * 100;
          const isPeak = item.key === peak.key && item.value > 0;
          const fill = isPeak ? peakColor : color;

          return (
            <li
              key={item.key}
              title={item.title}
              className="group flex h-full min-w-0 flex-col items-center justify-end gap-1.5"
            >
              <span className={cn("tabular text-meta truncate font-semibold", isPeak ? "" : "text-ink")} style={isPeak ? { color: fill } : undefined}>
                {item.meta ?? item.value}
              </span>
              <span
                className="w-full rounded-t-md transition-[height] duration-(--dur-standard) ease-out"
                style={{
                  height: `${Math.max(height, item.value > 0 ? 3 : 1.5)}%`,
                  backgroundColor: item.value > 0 ? fill : "var(--surface-3)",
                }}
              />
            </li>
          );
        })}
      </ol>

      <ol
        className="mt-1.5 grid gap-2.5"
        style={{ gridTemplateColumns: gridColumns(data.length) }}
      >
        {data.map((item, index) => (
          <li
            key={item.key}
            className="text-ink-faint tabular text-meta min-w-0 truncate text-center"
          >
            {index % labelStep === 0 ? item.label : "\u00A0"}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Juft ustunlar — ikki qator bitta o'qda (lid / yetkazildi)
// ─────────────────────────────────────────────────────────────────────────────

/** `repeat(n, minmax(0, 1fr))` — ustunlar soni ma'lumotdan keladi. */
function gridColumns(count: number): string {
  return `repeat(${count}, minmax(0, 1fr))`;
}

export type GroupedDatum = {
  key: string;
  label: string;
  title?: string;
  values: [number, number];
};

/**
 * Har nuqtada ikki ustun yonma-yon (dizayn 7, «4»): birinchisi asos
 * (lid), ikkinchisi natija (yetkazildi) — orasidagi farq yo'qotish.
 * Tepada birinchi qiymat, pastda yorliq, ostida legenda.
 */
export function GroupedBars({
  data,
  series,
  className,
}: {
  data: GroupedDatum[];
  series: [{ label: string; color: string }, { label: string; color: string }];
  className?: string;
}) {
  if (data.length === 0) {
    return <p className="text-ink-faint text-meta py-6 text-center">Bu davrda ma&apos;lumot yo&apos;q</p>;
  }
  const max = Math.max(1, ...data.map((item) => Math.max(item.values[0], item.values[1])));
  const labelStep = Math.ceil(data.length / 14);

  return (
    <div className={cn("min-w-0", className)} style={{ maxWidth: data.length < 6 ? `${data.length * 7}rem` : undefined }}>
      <ol className="grid h-44 items-end gap-2.5" style={{ gridTemplateColumns: gridColumns(data.length) }}>
        {data.map((item) => (
          <li key={item.key} title={item.title} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
            <span className="text-ink tabular text-meta font-semibold">{item.values[0]}</span>
            <span className="flex h-full w-full items-end gap-0.5" style={{ height: `${Math.max(3, (Math.max(item.values[0], item.values[1]) / max) * 100)}%` }}>
              {item.values.map((value, index) => (
                <span
                  key={series[index]!.label}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(value > 0 ? 4 : 1.5, (value / Math.max(item.values[0], item.values[1], 1)) * 100)}%`,
                    backgroundColor: value > 0 ? series[index]!.color : "var(--surface-3)",
                  }}
                />
              ))}
            </span>
          </li>
        ))}
      </ol>
      <ol className="mt-1.5 grid gap-2.5" style={{ gridTemplateColumns: gridColumns(data.length) }}>
        {data.map((item, index) => (
          <li key={item.key} className="text-ink-faint tabular text-meta min-w-0 truncate text-center">
            {index % labelStep === 0 ? item.label : "\u00A0"}
          </li>
        ))}
      </ol>
      <ul className="text-ink-muted mt-2 flex gap-4 text-meta">
        {series.map((entry) => (
          <li key={entry.label} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ulush chizig'i (part-to-whole)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Yagona gorizontal chiziqda ulushlar + ostida nomli ro'yxat.
 *
 * Bo'laklar orasidagi ajratgich — 2px SIRT rangidagi bo'shliq, chegara
 * emas: chegara ma'lumot bo'lmagan siyoh qo'shadi va yonma-yon turgan ikki
 * yaqin rang orasida o'zi yana bir chiziq bo'lib ko'rinadi.
 *
 * Ro'yxatda har bir bo'lakning nomi, summasi va foizi yozilgan — chiziqning
 * o'zi hech qachon yagona manba emas.
 */
export function ShareBar({
  data,
  formatValue,
  emptyLabel = "Ma'lumot yo'q",
}: {
  data: BarDatum[];
  formatValue: (value: number) => string;
  emptyLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const visible = data.filter((item) => item.value > 0);

  if (total <= 0) {
    return <p className="text-ink-faint text-meta py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="bg-surface-3 flex h-3 gap-[2px] overflow-hidden rounded-full">
        {visible.map((item) => (
          <span
            key={item.key}
            title={`${item.label}: ${formatValue(item.value)}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              // Eng ingichka bo'lak ham ko'rinib tursin.
              flex: `1 1 ${Math.max((item.value / total) * 100, 1.5)}%`,
              backgroundColor: item.color,
            }}
          />
        ))}
      </div>

      <ul className="mt-3.5 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {visible.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-ink-muted text-dense min-w-0 flex-1 truncate">
              {item.label}
            </span>
            <span className="text-ink tabular text-dense shrink-0 font-semibold">
              {formatValue(item.value)}
            </span>
            <span className="text-ink-faint tabular text-meta w-11 shrink-0 text-right">
              {Math.round((item.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Oqim (funnel)
// ─────────────────────────────────────────────────────────────────────────────

export type FlowStage = {
  key: string;
  label: string;
  value: number;
  color: string;
  Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href?: string;
};

/**
 * Oqim bosqichlari — ish qayerda to'planib qolganini ko'rsatadi.
 *
 * ── Nima uchun "konversiya" yo'q ─────────────────────────────────────────
 * Boshida har bosqich ostiga "oldingisidan N% o'tdi" yozilgandi. Bu SON
 * NOTO'G'RI: ustunlardagi qiymatlar bir kogortaning yo'li emas, ayni
 * damdagi kesim. "Yo'lda 7 ta" bilan "Yetkazildi 23 ta" bir-biridan
 * kelib chiqmaydi — yetkazilganlar allaqachon o'tib ketgan, yo'ldagilar
 * hali kelmagan. Natijada ekranda "329% o'tdi" turardi, ya'ni ma'nosiz son.
 *
 * Endi har bosqich butun oqimdagi ULUSHINI ko'rsatadi. Bu kesim
 * ma'lumotining o'ziga to'g'ri keladigan yagona nisbat va u hech qachon
 * 100% dan oshmaydi.
 *
 * Bosqichlar **tartibli** (ordinal) — o'rinlari almashmaydi, shuning uchun
 * chapdan o'ngga tartibning o'zi ma'no tashiydi. Rang esa shu yerda ham
 * yagona belgi emas: har bosqichning nomi ham, soni ham yonida yozilgan.
 */
/**
 * Bitta bog'langan chiziq + pastida nomli ro'yxat — to'rtta bir xil
 * qolipdagi karta o'rniga.
 *
 * Ilgari bu yerda to'rtta chegarali karta turardi: har birida ikonka,
 * katta son, mayda chiziq — bir xil qolip to'rt marta takrorlanardi. Bitta
 * qaraganda tushunarli, lekin to'rttasi qatorda "shablon" his qiladi.
 * Endi bosqichlar bitta o'lchov chizig'ida ulangan — bo'sh joy behuda
 * ketmaydi va ish qayerda to'planganini bir chiziqning o'zi aytadi.
 */
export function StageFlow({
  stages,
  renderStage,
}: {
  stages: FlowStage[];
  /** Bosqichni havolaga o'rash kerak bo'lsa. */
  renderStage?: (stage: FlowStage, content: React.ReactNode) => React.ReactNode;
}) {
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);

  return (
    <div>
      <div className="bg-surface-3 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
        {stages.map((stage) => {
          const share = total > 0 ? (stage.value / total) * 100 : 0;
          return (
            <span
              key={stage.key}
              aria-hidden
              style={{
                width: `${Math.max(share, stage.value > 0 ? 2 : 0)}%`,
                backgroundColor: stage.color,
              }}
              className="h-full transition-[width] duration-(--dur-standard) ease-out first:rounded-l-full last:rounded-r-full"
            />
          );
        })}
      </div>

      <ol className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
        {stages.map((stage) => {
          const share = total > 0 ? Math.round((stage.value / total) * 100) : 0;

          const content = (
            <div className="group min-w-0">
              <div className="flex items-center gap-1.5">
                {stage.Icon ? (
                  <stage.Icon
                    className="size-3.5 shrink-0 transition-transform group-hover:scale-110"
                    style={{ color: stage.color }}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                )}
                <span className="text-ink-muted text-meta min-w-0 truncate font-medium">
                  {stage.label}
                </span>
              </div>
              <p className="text-ink tabular text-title mt-1 font-semibold">
                {stage.value}
                <span className="text-ink-faint text-fine ml-1.5 font-normal">
                  {share}%
                </span>
              </p>
            </div>
          );

          return (
            <li key={stage.key}>
              {renderStage ? renderStage(stage, content) : content}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// O'lchagich (meter) — bitta nisbat
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bitta nisbat: chegara qanchaga bajarildi.
 *
 * To'ldirilmagan yo'l — o'sha rangning ochroq pog'onasi (`color-mix`), ya'ni
 * holat butun chiziq bo'ylab o'qiladi. Yumaloq (donut) o'rniga chiziq:
 * yonma-yon turgan ikki nisbatni solishtirish uzunlikda osonroq.
 */
export function Meter({
  value,
  color = "var(--brand)",
  className,
}: {
  /** 0–100 oralig'idagi foiz. */
  value: number;
  color?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <span
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ "--accent": color } as React.CSSProperties}
      className={cn(
        "block h-2 rounded-full bg-[color-mix(in_oklab,var(--accent)_18%,var(--surface-3))]",
        className,
      )}
    >
      <span
        className="block h-full rounded-r-[4px] transition-[width] duration-(--dur-standard) ease-out"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </span>
  );
}
