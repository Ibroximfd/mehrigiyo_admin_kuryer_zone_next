"use client";

import { Landmark, TriangleAlert, UserRound } from "lucide-react";

import { useT } from "@/shared/i18n/locale";

import type { CashPoint } from "../model/zone";

export function CashPointLabel({ cashPoint }: { cashPoint: CashPoint | null }) {
  const t = useT();
  if (!cashPoint) {
    return (
      <span className="inline-flex items-center gap-1.5 text-warn">
        <TriangleAlert className="size-4" aria-hidden />
        {t.zones.cashPointMissing}
      </span>
    );
  }
  const Icon = cashPoint.kind === "filial" ? Landmark : UserRound;
  const fallback =
    cashPoint.kind === "person" && cashPoint.userId !== null
      ? t.zones.personLabel(cashPoint.userId)
      : t.zones.cashFilial;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
      <span className="truncate">{cashPoint.name ?? fallback}</span>
    </span>
  );
}
