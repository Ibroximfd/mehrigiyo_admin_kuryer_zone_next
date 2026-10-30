"use client";

import { AnimatedNumber } from "@/components/fx/animated-number";
import { Meter } from "@/components/kit/chart";
import { cn } from "@/lib/utils";

/**
 * Ko'rsatkich kartochkasi — boshqaruv paneli va statistika uchun **bitta**
 * ta'rif. Ilgari ikkala sahifa o'zining nusxasini yozardi va ular jimgina
 * ajralib ketgandi (biri `text-3xl`, ikkinchisi `text-4xl`; biri umurtqali,
 * ikkinchisi umurtqasiz).
 *
 * Tuzilishi qat'iy: nom · qiymat · izoh · (ixtiyoriy) ulush chizig'i.
 *
 * Raqamda `tabular` ATAYLAB YO'Q. Teng kenglikdagi raqamlar faqat ustunda
 * tikka tizilishi kerak bo'lganda foydali; katta yakka son esa ular bilan
 * bo'shashib ko'rinadi (`121` da `1` lar `0` ning kengligini oladi). Ustunlar
 * — jadval va o'q belgilari — `tabular` ni o'zi qo'yadi.
 */
export function StatTile({
  Icon,
  label,
  value,
  text,
  suffix,
  sub,
  color = "var(--brand)",
  /** Ko'rsatkich ulushi (0–100) — berilsa pastda chiziq chiqadi. */
  share,
  /** Eng katta ko'rsatkich — sahifada aynan bittasi shunday bo'ladi. */
  emphasis = false,
  className,
  ...rest
}: {
  Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  /** Sanaladigan qiymat — o'zi yugurib chiqadi. */
  value?: number;
  /**
   * Sanoq emas, tayyor matn (summa, foiz oralig'i…). `value` bilan birga
   * berilmaydi: kartochkada bitta bosh qiymat bo'ladi.
   *
   * Pul uchun aynan shu yo'l: summani sanagich bilan "yugurtirish" katta
   * raqamlarda titrab ko'rinadi va o'qishga xalaqit qiladi.
   */
  text?: string;
  suffix?: string;
  sub?: React.ReactNode;
  color?: string;
  share?: number | null;
  emphasis?: boolean;
  className?: string;
} & Omit<React.ComponentProps<"div">, "color">) {
  return (
    <div
      {...rest}
      style={{ "--spine": color, ...rest.style } as React.CSSProperties}
      className={cn(
        "glass-card spine tile-tint lift relative overflow-hidden rounded-2xl border",
        emphasis ? "spine-strong p-5" : "p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink-muted text-meta font-medium">{label}</p>
        {Icon ? <Icon className="size-4 shrink-0" style={{ color }} /> : null}
      </div>

      <p
        className={cn(
          "text-ink mt-1.5 truncate font-semibold tracking-tight",
          // Pul matni raqamdan uzun — bir pog'ona kichikroq, aks holda
          // "12 450 000 so'm" kartochkadan chiqib ketadi.
          text !== undefined ? "text-h1" : emphasis ? "text-stat" : "text-display",
        )}
        title={text}
      >
        {text !== undefined ? text : <AnimatedNumber value={value ?? 0} />}
        {suffix ?? ""}
      </p>

      {sub ? <div className="text-ink-faint text-meta mt-1">{sub}</div> : null}

      {share !== null && share !== undefined ? (
        <Meter value={share} color={color} className="mt-3" />
      ) : null}
    </div>
  );
}
