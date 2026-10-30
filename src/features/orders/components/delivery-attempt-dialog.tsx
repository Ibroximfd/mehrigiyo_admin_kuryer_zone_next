"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDeliveryAttempt } from "@/features/orders/api";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { ATTEMPT_REASONS } from "@/features/orders/types";
import type { DeliveryAttemptReason } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * "Yetkazib bo'lmadi" oynasi (LOGIST-PLAN §7.3, backend §5.3).
 *
 * Buyurtma `shipping` da qoladi — faqat urinish yoziladi, kartada ⚠ nishon
 * chiqadi va CRM tomonga WS orqali ko'rinadi. Bekor qilish qarori CRMniki.
 */
export function DeliveryAttemptDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<DeliveryAttemptReason>(
    "client_unavailable",
  );
  const [note, setNote] = useState("");

  const submit = useMutation({
    // Kim belgilaganini server o'zi yozadi (`created_by` — token egasi).
    mutationFn: () =>
      createDeliveryAttempt(orderId, { reason, note: note.trim() || null }),
    onSuccess: () => {
      toast.success("Urinish belgilandi — buyurtma yetkazilmoqda holatida qoladi");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      onOpenChange(false);
      setNote("");
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "Urinishni belgilashda xatolik")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[26rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle className="flex items-center gap-2">
          <TriangleAlert className="text-warn size-4.5" />
          Yetkazib bo&apos;lmadi
        </DialogTitle>
        <DialogDescription>
          Sabab yozib qo&apos;yiladi, buyurtma holati o&apos;zgarmaydi —
          qarorni CRM chiqaradi.
        </DialogDescription>

        <div className="mt-3 space-y-3.5">
          <Field label="Sabab">
            <Select
              value={reason}
              onValueChange={(value) =>
                setReason(value as DeliveryAttemptReason)
              }
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTEMPT_REASONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Izoh" hint="Masalan: 2 marta qo'ng'iroq qilindi">
            <textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={cn(inputClass, "h-auto resize-y py-2.5")}
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            variant="destructive"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Belgilash
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
