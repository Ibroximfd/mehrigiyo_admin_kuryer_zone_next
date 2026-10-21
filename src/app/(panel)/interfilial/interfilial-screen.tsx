"use client";

import { InterfilialReportView } from "@/features/interfilial/ui/interfilial-report";
import { useT } from "@/shared/i18n/locale";
import { PageHeader } from "@/shared/ui/page-header";
import { OfflineBanner } from "@/shared/ui/states";

export function InterfilialScreen() {
  const t = useT();
  return (
    <>
      <PageHeader title={t.interfilial.title} description={t.interfilial.description} />
      <OfflineBanner />
      <InterfilialReportView />
    </>
  );
}
