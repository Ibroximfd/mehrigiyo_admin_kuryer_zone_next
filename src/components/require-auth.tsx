"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { SplashScreen } from "@/components/splash-screen";
import { ROUTES } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Marshrut qo'riqchisi.
 *
 *  • sessiya hali tekshirilmagan  → splash ekranida ushlab turamiz;
 *  • sessiya yo'q                 → `/login?from=<manzil>`;
 *  • hammasi joyida               → sahifani ko'rsatamiz.
 *
 * Bosh kuryer ekanini login (`site: "chief"`) va `ChiefSiteGate` tekshiradi.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unknown") restoreSession();
  }, [status, restoreSession]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const target = `${pathname}${window.location.search}`;
      router.replace(`${ROUTES.login}?from=${encodeURIComponent(target)}`);
    }
  }, [status, pathname, router]);

  if (status !== "authenticated") return <SplashScreen />;

  return <>{children}</>;
}
