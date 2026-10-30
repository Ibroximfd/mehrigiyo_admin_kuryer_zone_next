"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { addOrderComment } from "@/features/orders/comments";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const MAX_LENGTH = 1000;

/** Izoh yozish (logist / kuryer uchun) — yozilgani darhol lentaga tushadi. */
export function TimelineComposer({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const author = useAuthStore((state) => state.user?.name) || "Logist";
  const [text, setText] = useState("");

  const send = useMutation({
    mutationFn: () => addOrderComment(orderId, { author, text }),
    onSuccess: () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderComments(orderId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orderTimeline(orderId) });
    },
    onError: (error) => toast.error(orderErrorMessage(error, "Izoh yozishda xatolik")),
  });

  const canSend = text.trim().length > 0 && !send.isPending;

  return (
    <form
      className="border-line bg-surface flex gap-2 rounded-xl border p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) send.mutate();
      }}
    >
      <textarea
        rows={1}
        value={text}
        maxLength={MAX_LENGTH}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && canSend) {
            event.preventDefault();
            send.mutate();
          }
        }}
        aria-label="Izoh"
        placeholder="Izoh (logist / kuryer uchun)…"
        className={cn(inputClass, "h-auto min-h-10 flex-1 resize-none py-2 text-dense")}
      />
      <Button type="submit" size="lg" disabled={!canSend} className="h-10">
        {send.isPending ? <LoaderCircle className="animate-spin" /> : null}
        Yozish
      </Button>
    </form>
  );
}
