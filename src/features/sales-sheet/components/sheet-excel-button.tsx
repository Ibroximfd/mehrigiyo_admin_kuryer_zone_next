"use client";

import { useMutation } from "@tanstack/react-query";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api-client";
import { isEndpointMissing } from "@/lib/api-availability";

import { downloadSalesSheetExcel } from "../api";
import type { SheetRange } from "../period";

/**
 * «Excel yuklab olish» — ochiq turgan davr bilan (hujjat 83 §5). Fayl egasi
 * jadvali ko'rinishida serverda yasaladi; sayt o'zi yig'maydi — format bitta joyda.
 */
export function SheetExcelButton({ range, salesFilial = null }: { range: SheetRange; salesFilial?: string | null }) {
  const download = useMutation({
    mutationFn: () => downloadSalesSheetExcel(range, salesFilial),
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
