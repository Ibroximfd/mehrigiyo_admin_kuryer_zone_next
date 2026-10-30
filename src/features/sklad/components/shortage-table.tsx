import type { Shortage } from "../types";

/**
 * `409 insufficient_stock` — toast emas, jadval: nima, qancha kerak, qancha
 * bor. Logist raqamni to'g'rilab qayta yuboradi.
 */
export function ShortageTable({ shortages }: { shortages: Shortage[] }) {
  return (
    <div role="alert" className="bg-danger-soft rounded-lg px-3 py-2.5">
      <p className="text-danger text-meta font-semibold">Omborda yetarli emas</p>
      <table className="mt-1.5 w-full text-dense">
        <thead className="text-ink-faint text-micro uppercase">
          <tr>
            <th className="text-left font-semibold">Mahsulot</th>
            <th className="text-right font-semibold">Kerak</th>
            <th className="text-right font-semibold">Bor</th>
          </tr>
        </thead>
        <tbody>
          {shortages.map((row) => (
            <tr key={`${row.itemId}-${row.locationId ?? 0}`}>
              <td className="text-ink py-0.5" data-no-translit>
                {row.name}
              </td>
              <td className="tabular py-0.5 text-right">{row.need}</td>
              <td className="text-danger tabular py-0.5 text-right font-semibold">{row.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
