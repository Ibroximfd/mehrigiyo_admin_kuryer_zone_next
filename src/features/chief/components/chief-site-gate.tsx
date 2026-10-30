"use client";

import { LogOut, ServerOff, UserRoundX } from "lucide-react";

import { EmptyView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";

import { useChiefMe } from "../use-chief-me";

/**
 * Butun sayt eshigi (bosh kuryer sayti, 2026-10-30): faqat `GET /chief/me/`
 * 200 bergan akkaunt kiradi. Logist yoki operator kirsa — «bu sayt bosh
 * kuryerlar uchun» va chiqish tugmasi (logist saytida ishlaydi).
 */
export function ChiefSiteGate({ children }: { children: React.ReactNode }) {
  const { isChief, missing, isPending } = useChiefMe();
  const logout = useAuthStore((state) => state.logout);

  if (isPending) {
    return (
      <div className="space-y-3 p-6" aria-label="Yuklanmoqda">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  if (isChief) return <>{children}</>;
  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-6">
      <EmptyView
        Icon={missing ? ServerOff : UserRoundX}
        title={missing ? "Serverda bosh kuryer bo'limi hali yoqilmagan" : "Bu sayt bosh kuryerlar uchun"}
        description={
          missing
            ? "Backend bosh kuryer API'sini chiqargach shu yerdan ishlaysiz."
            : "Akkauntingizda bosh kuryer roli yo'q. Rolni bosh logist beradi; logistlar logist saytida ishlaydi."
        }
        action={
          <Button variant="outline" onClick={logout}>
            <LogOut />
            Chiqish
          </Button>
        }
        className="border-line bg-surface rounded-2xl border"
      />
    </div>
  );
}
