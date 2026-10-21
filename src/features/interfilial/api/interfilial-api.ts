import { api } from "@/shared/lib/api-client";

import type { DateRange } from "../model/date-range";
import { interfilialReportSchema, type InterfilialReport } from "../model/report";

export function fetchInterfilialReport(range: DateRange, signal?: AbortSignal): Promise<InterfilialReport> {
  return api.get("admin/cod/interfilial/", {
    schema: interfilialReportSchema,
    searchParams: { date_from: range.from, date_to: range.to },
    signal,
  });
}
