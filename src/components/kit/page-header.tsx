"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatClock, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Sahifa sarlavhasi — barcha sahifalarda bir xil ritm va bo'shliq.
 * Yopishqoq: jadval pastga surilganda ham sarlavha va boshqaruv ko'z oldida.
 *
 * Fon `glass-chrome`: kuchli mashinada shaffof va biroz xiralashgan, zaif
 * mashinada esa oddiy qattiq sirt. Ikkalasi ham ataylab — pastdagi kontent
 * sarlavha ostidan o'tayotgani sezilib tursin, lekin blur hech kimga
 * kadr yo'qotmasin.
 *
 * ── Nima olib tashlandi va nega ──────────────────────────────────────────
 * Sarlavhaning tepasida indigo→akcent→amber "kamalak" chizig'i, sarlavha
 * yonida esa yana bitta gradient tayoqcha bor edi. Ikkalasi ham ma'no
 * tashimasdi — sof bezak, va aynan shu ikkisi interfeysga "shablon" tusini
 * berardi (har qanday shoshib yig'ilgan panelda o'sha gradient bor).
 *
 * Ularning o'rniga hech narsa qo'yilmadi: sarlavha o'z og'irligi bilan
 * turadi (tight tracking, katta kegl), ajratgich esa oddiy hairline. Ierarxiya
 * bezakdan emas, tipografiyadan keladi.
 */
export function PageHeader({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  updatedAt,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  updatedAt?: Date | null;
  actions?: React.ReactNode;
  /** Sarlavha ostidagi qator — filtrlar va h.k. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-line glass-chrome sticky top-0 z-20 border-b",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-5 pb-3.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-ink text-h1 sm:text-display truncate">{title}</h1>
          {description ? (
            <p className="text-ink-muted text-meta mt-1 truncate">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {updatedAt ? <LiveStamp at={updatedAt} busy={isRefreshing} /> : null}

          {actions}

          {onRefresh ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Yangilash"
              title="Yangilash — R"
            >
              <RefreshCw
                className={cn("size-4", isRefreshing && "animate-spin")}
              />
              <span className="hidden sm:inline">Yangilash</span>
            </Button>
          ) : null}
        </div>
      </div>

      {children ? <div className="px-4 pb-3.5 sm:px-6">{children}</div> : null}
    </header>
  );
}

/**
 * "Jonli" belgi — ma'lumot qachon olingani va hozir yangilanayotgani.
 *
 * Sana `Intl` orqali emas, `date-fns` bilan formatlanadi: bu yerda ham
 * `toLocaleTimeString("uz-UZ")` turardi va `uz` locale ma'lumoti yo'q
 * qurilmada xom ICU qiymati chiqib qolardi (izoh `lib/format.ts` da).
 */
function LiveStamp({ at, busy }: { at: Date; busy: boolean }) {
  return (
    <span
      title={`Oxirgi yangilanish: ${formatDateTime(at)}`}
      className="border-line bg-surface text-ink-faint hidden h-(--control-h) items-center gap-1.5 rounded-full border px-3 lg:inline-flex"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors",
          busy ? "bg-brand animate-pulse" : "bg-ok",
        )}
      />
      <span className="tabular text-meta">{formatClock(at)}</span>
    </span>
  );
}
