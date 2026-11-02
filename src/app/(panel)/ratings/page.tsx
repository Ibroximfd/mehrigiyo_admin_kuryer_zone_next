"use client";

import { PageHeader } from "@/components/kit/page-header";
import { ChiefGate } from "@/features/chief/components/chief-gate";
import { RatingsView } from "@/features/ratings/components/ratings-view";

/** Reytinglar (`ILOVA_HOLAT…` §7.1): mijozlar o'z kuryerlaringizga qo'ygan baholar. */
export default function RatingsPage() {
  return (
    <>
      <PageHeader title="Reytinglar" description="Mijozlar kuryerlaringizga qo'ygan baholar — jamlanma, kuryerlar va izohlar" />
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <ChiefGate>{(me) => <RatingsView me={me} />}</ChiefGate>
      </div>
    </>
  );
}
