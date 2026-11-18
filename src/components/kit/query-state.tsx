"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Lock, ServerCog, TriangleAlert, WifiOff } from "lucide-react";

import { EmptyView, ErrorView } from "@/components/kit/state-views";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api-client";
import { isAccessDenied, isEndpointMissing } from "@/lib/api-availability";

const BOX = "border-line bg-surface rounded-2xl border";

/**
 * So'rov holatlari bitta joyda: ruxsat yo'q · server hali chiqarmagan · xato +
 * qayta urinish · oflayn (keshsiz) · skelet · tayyor. «Server chiqarmagan» —
 * qizil xato emas, neytral izoh (backend shartnoma bo'yicha parallel ishlaydi).
 * Keshdagi javob bo'lsa — u ko'rsatiladi; qayta so'rov yiqilgan bo'lsa raqamlar
 * eski ekani ochiq aytiladi. Vaqtinchalik (`placeholderData`) javob — hali
 * javob emas: skelet chiqadi, eski raqam yangi sarlavha ostida ko'rinmaydi.
 *
 * «Sotuv jadvali» dagi `SheetQueryState` bilan bir xil qoida — keyin u ham shu
 * komponentga o'tadi.
 */
export function QueryStateView<T>({
  query,
  deniedTitle,
  missingTitle,
  skeleton,
  children,
}: {
  query: UseQueryResult<T>;
  deniedTitle: string;
  missingTitle: string;
  skeleton: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (query.data !== undefined && !query.isPlaceholderData) {
    return (
      <>
        {query.isRefetchError ? (
          <p role="status" className="bg-warn-soft text-warn flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3.5 py-2 text-meta font-medium">
            <TriangleAlert aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">Yangilab bo&apos;lmadi — ko&apos;rsatilgani oxirgi yuklangan holat</span>
            <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
              Qayta urinish
            </Button>
          </p>
        ) : null}
        {children(query.data)}
      </>
    );
  }
  if (query.isError) {
    if (isAccessDenied(query.error)) {
      return <EmptyView Icon={Lock} title={deniedTitle} description="Dopuskni asosiy filialning bosh logisti beradi." className={BOX} />;
    }
    if (isEndpointMissing(query.error)) {
      return (
        <EmptyView
          Icon={ServerCog}
          title={missingTitle}
          description="Backend yangilanishi chiqishi bilan raqamlar shu yerda ko'rinadi. Qolgan bo'limlar odatdagidek ishlaydi."
          className={BOX}
        />
      );
    }
    return <ErrorView message={errorMessage(query.error, "Yuklashda xatolik")} onRetry={() => void query.refetch()} className={BOX} />;
  }
  // Internet yo'q va kesh ham yo'q: so'rov to'xtab turadi — cheksiz skelet o'rniga sababi aytiladi.
  if (query.fetchStatus === "paused") {
    return (
      <EmptyView Icon={WifiOff} title="Internet aloqasi yo'q" description="Ulanish tiklanishi bilan ma'lumot o'zi yuklanadi." className={BOX} />
    );
  }
  return <>{skeleton}</>;
}
