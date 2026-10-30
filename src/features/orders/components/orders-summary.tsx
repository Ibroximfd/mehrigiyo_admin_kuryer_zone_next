import { formatSom, groupThousands } from "@/lib/format";

/**
 * Ro'yxat xulosasi — dizayndagi bitta qator:
 * "30 ta · 25 100 000 so'm · to'lanmagan 14 600 000".
 *
 * Summalar serverdan (`total_amount`, `total_unpaid_amount` — butun filtr
 * bo'yicha). Server bermasa yuklangan qatorlar aylanmasi ko'rsatiladi va
 * bu `title` da aytiladi. To'lanmagan qism bosilsa o'sha ro'yxat ochiladi.
 */
export function OrdersSummary({
  count,
  totalAmount,
  unpaidAmount,
  loadedAmount,
  onUnpaidClick,
}: {
  count: number;
  totalAmount: number | null;
  unpaidAmount: number | null;
  loadedAmount: number;
  onUnpaidClick?: () => void;
}) {
  const amount = totalAmount ?? loadedAmount;
  return (
    <p className="text-ink-muted shrink-0 text-meta" aria-live="polite">
      <span className="tabular">{count}</span> ta ·{" "}
      <b
        className="text-ink tabular font-semibold"
        title={
          totalAmount === null
            ? "Yuklangan buyurtmalar bo'yicha, bekor qilinganlarsiz"
            : "Filtrga tushgan barcha buyurtmalar"
        }
      >
        {formatSom(amount)}
      </b>
      {unpaidAmount !== null && unpaidAmount > 0 ? (
        <>
          {" "}
          · to&apos;lanmagan{" "}
          {onUnpaidClick ? (
            <button
              type="button"
              onClick={onUnpaidClick}
              title="To'lanmaganlarni ko'rsatish"
              className="text-danger tabular font-semibold underline-offset-2 hover:underline"
            >
              {groupThousands(unpaidAmount)}
            </button>
          ) : (
            <b className="text-danger tabular font-semibold">{groupThousands(unpaidAmount)}</b>
          )}
        </>
      ) : null}
    </p>
  );
}
