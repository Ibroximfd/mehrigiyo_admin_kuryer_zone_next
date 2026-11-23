"use client";

import { Lock, Warehouse } from "lucide-react";

import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChiefMe } from "@/features/chief/types";
import { SkladDayView } from "@/features/sklad-sheet/components/sklad-day-view";
import { errorMessage } from "@/lib/api-client";
import { isAccessDenied } from "@/lib/api-availability";

import { useChiefSklad } from "../use-chief-sklad";
import { useSkladLive } from "../use-sklad-live";

/**
 * Sklad (§5; TZ 32 S-7; egasi, 2026-11-20): bitta ko'rinish — kun tanlash,
 * kunning saqlangan holati (Jami · kuryerlarga berilgan · omborda qolgan —
 * sotuvgacha; egasi, 2026-11-23) va kunlik harakat. «Sanadan
 * sanagacha» va «Kuryerlar ombori» olib tashlandi: kuryerga berish, qabul,
 * tuzatish va kirim so'rovlari — Sotuv jadvalida. Bosh kuryer faqat o'ziga
 * biriktirilgan skladni ko'radi; boshqa skladga o'tkazilsa (`sklad_changed`)
 * eski sklad darhol yopiladi. Qoldiq va harakat real vaqtda (`useSkladLive`).
 */
export function SkladView({ me }: { me: ChiefMe }) {
  useSkladLive(me.seat.id);
  const sklad = useChiefSklad();

  if (sklad.isPending) return <SkladSkeleton />;
  if (sklad.isError && isAccessDenied(sklad.error)) return <SkladForbidden />;
  if (sklad.isError) {
    return (
      <ErrorView
        message={errorMessage(sklad.error, "Skladni yuklashda xatolik")}
        onRetry={() => void sklad.refetch()}
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }

  const data = sklad.data;
  if (data.kind === "forbidden") return <SkladForbidden />;
  if (data.kind === "unassigned") {
    return (
      <EmptyView
        Icon={Warehouse}
        title="Sklad biriktirilmagan"
        description="Sizga hali sklad biriktirilmagan. Bosh logistga murojaat qiling."
        className="border-line bg-surface rounded-2xl border"
      />
    );
  }
  // Server kun holatini hali bermasa bugun «Hozirgi qoldiq» ham chiziladi: javobdagi `current`, u kelmasa — shu yerda yuklangan sklad qoldig'i.
  return <SkladDayView fallback={data.stock} />;
}

function SkladForbidden() {
  return (
    <EmptyView
      Icon={Lock}
      title="Sklad sizga ochilmagan"
      description="Skladni ko'rish dopuskini asosiy filialning bosh logisti beradi."
      className="border-line bg-surface rounded-2xl border"
    />
  );
}

function SkladSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Yuklanmoqda">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
