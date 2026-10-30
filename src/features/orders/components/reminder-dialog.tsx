"use client";

import { AlarmClock, LoaderCircle } from "lucide-react";
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
import type { LogistOrder } from "@/features/orders/types";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRemindersStore } from "@/stores/reminders-store";

/**
 * Eslatma qo'yish oynasi (LOGIST-PLAN §14): "mijoz 15:00da qayta
 * qo'ng'iroq dedi". Tez chiplar (+30 daq / +1 soat / +3 soat) yoki aniq
 * vaqt; vaqti kelganda panel toast + desktop bildirishnoma chiqaradi.
 */
const QUICK_OFFSETS = [
  { label: "+30 daqiqa", minutes: 30 },
  { label: "+1 soat", minutes: 60 },
  { label: "+3 soat", minutes: 180 },
];

/** `datetime-local` inputiga mos lokal format. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReminderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: LogistOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const add = useRemindersStore((state) => state.add);
  const [at, setAt] = useState(() =>
    toLocalInput(new Date(Date.now() + 30 * 60_000)),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const when = new Date(at);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
      toast.error("Vaqt kelajakda bo'lishi kerak");
      return;
    }
    setSaving(true);
    add({
      orderId: order.id,
      orderNumber: order.orderNumber || order.id.slice(0, 8),
      at: when.toISOString(),
      note: note.trim(),
    });
    toast.success(
      `Eslatma qo'yildi — ${formatClock(when)}`,
    );
    setSaving(false);
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[24rem] max-w-[calc(100vw-2rem)]">
        <DialogTitle className="flex items-center gap-2">
          <AlarmClock className="text-brand size-4.5" />
          Eslatma qo&apos;yish
        </DialogTitle>
        <DialogDescription>
          {order.orderNumber} — vaqti kelganda signal chiqadi.
        </DialogDescription>

        <div className="mt-3 space-y-3.5">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_OFFSETS.map((offset) => (
              <button
                key={offset.minutes}
                type="button"
                onClick={() =>
                  setAt(
                    toLocalInput(
                      new Date(Date.now() + offset.minutes * 60_000),
                    ),
                  )
                }
                className="border-line bg-surface text-ink hover:border-brand hover:text-brand rounded-full border px-2.5 py-1 text-meta font-medium transition-colors"
              >
                {offset.label}
              </button>
            ))}
          </div>

          <Field label="Vaqt">
            <input
              type="datetime-local"
              value={at}
              onChange={(event) => setAt(event.target.value)}
              className={cn(inputClass, "tabular")}
            />
          </Field>

          <Field label="Izoh" hint="Masalan: mijoz qayta qo'ng'iroq so'radi">
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button disabled={saving} onClick={submit}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Qo&apos;yish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
