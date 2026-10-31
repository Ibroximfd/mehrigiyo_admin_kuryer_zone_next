import { toast } from "sonner";

import { WARNING_OFF_SHIFT, WARNING_ZONE_MISMATCH } from "@/features/orders/assign-warnings";

/** Server ogohlantirishlari — bloklamaydi, faqat aytadi (A2: smena · zona). */
export function assignWarningToasts(warnings: readonly string[]): void {
  if (warnings.includes(WARNING_OFF_SHIFT)) {
    toast.warning("Kuryer smenada emas", {
      description: "Biriktirish bajarildi — kuryer smenaga chiqmaguncha ko'rmasligi mumkin",
    });
  }
  if (warnings.includes(WARNING_ZONE_MISMATCH)) {
    toast.warning("Kuryer buyurtma zonasidan emas", {
      description: "Biriktirish bajarildi — zonani tekshiring",
    });
  }
}
