"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Leaflet `window` ga tayanadi — serverda umuman import qilinmaydi.
 * Yuklanguncha xarita o'lchamidagi skelet turadi, joylashuv sakramaydi.
 */
export const LiveMapIsland = dynamic(
  () => import("./live-map").then((module) => module.LiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-none" />,
  },
);
