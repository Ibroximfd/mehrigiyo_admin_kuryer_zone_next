"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle, LogIn, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { staffChatErrorMessage } from "@/features/staff-chat/error-hints";
import { joinOrderChat, searchOrderChats } from "@/features/staff-chat/membership";
import type { OrderChatHit } from "@/features/staff-chat/membership";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query-keys";

/**
 * Ro'yxat qidiruvining davomi (§D 3): siz hali a'zo bo'lmagan zakaz
 * chatlari — «Qo'shilish» (ruxsat bo'lsa). Alohida qidiruv maydoni yo'q:
 * kanallar ro'yxatidagi bitta qidiruv ham chatlarni, ham qo'shilish
 * mumkin bo'lgan zakazlarni topadi (raqam, ID boshi, telefon — 3+ belgi).
 */
export function OrderJoinResults({
  query,
  onOpenOrder,
}: {
  query: string;
  onOpenOrder: (orderId: string) => void;
}) {
  const needle = useDebouncedValue(query.trim(), 350);
  const results = useQuery({
    queryKey: queryKeys.staffOrderSearch(needle),
    queryFn: ({ signal }) => searchOrderChats(needle, signal),
    enabled: needle.length >= 3,
    retry: false,
  });

  const join = useMutation({
    mutationFn: async (hit: OrderChatHit) => {
      await joinOrderChat(hit);
      return hit;
    },
    onSuccess: (hit) => {
      toast.success(`${hit.orderNumber} chatiga qo'shildingiz`);
      onOpenOrder(hit.orderId);
    },
    onError: (error) => toast.error(staffChatErrorMessage(error, "Chatga qo'shilishda xatolik")),
  });

  // A'zo bo'lingan chat ro'yxatning o'zida chiqadi — bu yerda faqat qo'shiladiganlar.
  const hits = needle.length >= 3 ? (results.data ?? []).filter((hit) => !hit.joined) : [];
  if (needle.length < 3 || results.isPending || (hits.length === 0 && !results.isError)) return null;

  return (
    <section aria-label="Qo'shilish mumkin bo'lgan zakazlar" className="border-line border-t p-2">
      <p className="text-ink-faint px-2.5 pt-0.5 pb-1.5 text-fine font-semibold tracking-wide uppercase">Boshqa zakaz chatlari</p>
      {results.isError ? (
        <p className="text-ink-faint px-2.5 text-meta">{staffChatErrorMessage(results.error, "Qidirib bo'lmadi")}</p>
      ) : (
          <ul className="divide-line divide-y">
            {hits.map((hit) => (
              <li key={hit.orderId} className="flex items-center gap-2 px-2.5 py-2">
                <span className="min-w-0 flex-1">
                  <span className="text-ink tabular block text-dense font-semibold" data-no-translit>
                    {hit.orderNumber}
                  </span>
                  <span className="text-ink-faint block truncate text-fine" data-no-translit>
                    {hit.clientName}
                  </span>
                </span>
                {hit.joined ? (
                  <Button size="sm" variant="ghost" onClick={() => onOpenOrder(hit.orderId)}>
                    <MessageSquareText />
                    Ochish
                  </Button>
                ) : (
                  <Button size="sm" disabled={join.isPending} onClick={() => join.mutate(hit)}>
                    {join.isPending && join.variables?.orderId === hit.orderId ? <LoaderCircle className="animate-spin" /> : <LogIn />}
                    Qo&apos;shilish
                  </Button>
                )}
              </li>
            ))}
          </ul>
      )}
    </section>
  );
}
