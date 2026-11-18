"use client";

import { useMutation } from "@tanstack/react-query";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";

import { downloadSkladSheetExcel } from "../api";
import type { SkladSheetQuery } from "../api";

/**
 * «Excel yuklab olish» — ochiq turgan kun yoki davr bilan (hujjat 85 §1.6).
 * Fayl egasi sheet'i ko'rinishida serverda yasaladi; endpoint hali chiqmagan
 * bo'lsa — qizil xato emas, tushunarli xabar.
 */
export function SkladSheetExcelButton({ query }: { query: SkladSheetQuery }) {
  const download = useMutation({
    mutationFn: () => downloadSkladSheetExcel(query),
    onSuccess: (name) => toast.success(`Yuklab olindi: ${name}`),
    onError: (error) =>
      toast.error(isEndpointMissing(error) ? "Excel serverda hali yoqilmagan" : errorMessage(error, "Excel faylini yuklab bo'lmadi")),
  });
  return (
    <Button variant="outline" disabled={download.isPending} aria-busy={download.isPending} onClick={() => download.mutate()}>
      {download.isPending ? <LoaderCircle className="animate-spin" /> : <Download />}
      Excel yuklab olish
    </Button>
  );
}
