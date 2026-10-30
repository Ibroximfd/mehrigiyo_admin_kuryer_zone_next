"use client";

import { StatusPill } from "@/components/kit/status-pill";
import { formatSmartTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { regionName } from "../regions";
import { movementInfo, type LedgerRow } from "../types";

/**
 * Daftar qatorlari jadvali — harakatlar sahifasi, viloyat paneli
 * («oxirgi 10») va kuryer sahifasida bitta ko'rinish.
 */
export function LedgerTable({
  rows,
  showRegion = true,
  showLocation = true,
  compact = false,
}: {
  rows: LedgerRow[];
  showRegion?: boolean;
  /** Kuryer sahifasida ombor ustuni ortiqcha — hammasi o'sha kuryerniki. */
  showLocation?: boolean;
  compact?: boolean;
}) {
  return (
    <table className="w-full text-dense">
      <thead className="text-ink-faint text-micro uppercase">
        <tr className="border-line border-b">
          <th className="py-2 pr-3 text-left font-semibold">Vaqt</th>
          {showRegion ? <th className="py-2 pr-3 text-left font-semibold">Viloyat</th> : null}
          {showLocation ? <th className="py-2 pr-3 text-left font-semibold">Ombor / kuryer</th> : null}
          <th className="py-2 pr-3 text-left font-semibold">Mahsulot</th>
          <th className="py-2 pr-3 text-left font-semibold">Turi</th>
          <th className="py-2 pr-3 text-right font-semibold">Dona</th>
          <th className="py-2 pr-3 text-right font-semibold">Qoldi</th>
          {!compact ? <th className="py-2 pr-3 text-left font-semibold">Manba</th> : null}
          {!compact ? <th className="py-2 text-left font-semibold">Kim</th> : null}
        </tr>
      </thead>
      <tbody className="divide-line divide-y">
        {rows.map((row) => {
          const info = movementInfo(row.movementType);
          return (
            <tr key={row.id} className="hover:bg-subtle/60">
              <td className="text-ink-muted tabular py-2 pr-3 whitespace-nowrap">
                {row.createdAt ? formatSmartTime(row.createdAt) : "—"}
              </td>
              {showRegion ? <td className="py-2 pr-3 whitespace-nowrap">{regionName(row.region)}</td> : null}
              {showLocation ? (
                <td className="max-w-48 truncate py-2 pr-3" data-no-translit>
                  {row.location.name}
                </td>
              ) : null}
              <td className="text-ink max-w-56 truncate py-2 pr-3 font-medium" data-no-translit>
                {row.item.name}
              </td>
              <td className="py-2 pr-3">
                <StatusPill label={info.label} color={info.color} size="sm" />
              </td>
              <td className={cn("tabular py-2 pr-3 text-right font-semibold", row.quantity < 0 ? "text-danger" : "text-ok")}>
                {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
              </td>
              <td className={cn("tabular py-2 pr-3 text-right", row.balanceAfter < 0 ? "text-danger font-semibold" : "text-ink-muted")}>
                {row.balanceAfter}
              </td>
              {!compact ? (
                <td className="text-ink-muted tabular py-2 pr-3 whitespace-nowrap" data-no-translit>
                  {row.source?.number ?? "—"}
                </td>
              ) : null}
              {!compact ? (
                <td className="text-ink-muted py-2 whitespace-nowrap" data-no-translit>
                  {row.actor?.kind === "system" ? "tizim" : (row.actor?.fullName ?? "—")}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
