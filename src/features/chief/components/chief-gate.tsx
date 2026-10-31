"use client";

import { Lock, UserRoundCog } from "lucide-react";

import { EmptyView } from "@/components/kit/state-views";
import { Skeleton } from "@/components/ui/skeleton";

import { useChiefMe } from "../use-chief-me";
import { chiefCan } from "../types";
import type { ChiefMe, ChiefPermission } from "../types";

/**
 * Bo'lim eshigi: rol so'rovi kelguncha skelet, backend yo'q — «kutilmoqda»,
 * rol yo'q — qulf. Rol bor bo'lsa sahifa `me` bilan chiziladi.
 */
export function ChiefGate({
  children,
  permission,
}: {
  children: (me: ChiefMe) => React.ReactNode;
  /** Sahifa uchun dopusk — yo'q bo'lsa so'rov yuborilmaydi, tushunarli izoh chiqadi (403 emas). */
  permission?: ChiefPermission;
}) {
  const { me, missing, isPending } = useChiefMe();
  if (isPending) return <Skeleton className="h-64 rounded-2xl" />;
  if (missing) {
    return (
      <EmptyView
        Icon={UserRoundCog}
        title="Bosh kuryer bo'limi backend'ni kutmoqda"
        description="API chiqishi bilan zakazlar, kuryerlar va kassa shu yerda bo'ladi."
        className="border-line bg-surface rounded-xl border"
      />
    );
  }
  if (!me) {
    return (
      <EmptyView
        Icon={Lock}
        title="Faqat bosh kuryer uchun"
        description="Bu bo'lim bosh kuryer roli berilgan akkauntda ochiladi. Rolni bosh logist beradi."
        className="border-line bg-surface rounded-xl border"
      />
    );
  }
  if (permission && !chiefCan(me, permission)) {
    return (
      <EmptyView
        Icon={Lock}
        title="Bu bo'lim sizga ochilmagan"
        description="Dopuskni asosiy filialning bosh logisti beradi."
        className="border-line bg-surface rounded-xl border"
      />
    );
  }
  return <>{children(me)}</>;
}
