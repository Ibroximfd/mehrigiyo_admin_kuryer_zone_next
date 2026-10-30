"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Building2,
  CheckCheck,
  LoaderCircle,
  MapPin,
  PackageOpen,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field, inputClass } from "@/components/kit/field";
import { SearchInput } from "@/components/kit/search-input";
import { EmptyView } from "@/components/kit/state-views";
import { StatusPill } from "@/components/kit/status-pill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDeliveryAddress } from "@/features/orders/address";
import { fetchOrders, requestOrderTransfer } from "@/features/orders/api";
import { OrderAmount } from "@/features/orders/components/order-amount";
import { OrderTagChips } from "@/features/orders/components/order-tags";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { canTransferOrder } from "@/features/orders/permissions";
import { orderStatusInfo } from "@/features/orders/types";
import type { LogistOrder } from "@/features/orders/types";
import { fetchFilials } from "@/features/transfers/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { errorCode } from "@/lib/api-client";
import { formatPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import {
  MATCH_NONE,
  makeSearchText,
  parseSearchQuery,
  scoreDigits,
  scoreText,
} from "@/lib/search";
import { cn } from "@/lib/utils";

/**
 * Buyurtmalarni boshqa filialga o'tkazish (A-oqim, `BACKEND-LOGIST.md` §4.8).
 *
 * Nega alohida oyna: filiallararo ish kunda bir necha marta va odatda
 * **bir nechta** buyurtma bilan bo'ladi ("bu mahalladagi to'rttasi Chilonzor
 * filialiga yaqin"). Buyurtma detalini birma-bir ochib, har birida
 * "o'tkazish" tugmasini bosish — o'sha ishning eng sekin yo'li.
 *
 * Bu yerda: filial tanlanadi → buyurtmalar qidiriladi va belgilanadi →
 * bitta sabab bilan hammasi yuboriladi.
 *
 * Backendda ommaviy o'tkazish endpointi yo'q (§4.8 faqat bittalab ishlaydi),
 * shuning uchun so'rovlar ketma-ket yuboriladi va natija qisman muvaffaqiyat
 * sifatida ko'rsatiladi — bulk kontraktidagi mantiqning aynan o'zi.
 */
export function TransferOrdersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [filialId, setFilialId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), 250);

  const filials = useQuery({
    queryKey: queryKeys.filials,
    queryFn: ({ signal }) => fetchFilials(signal),
    enabled: open,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const filialsMissing = errorCode(filials.error) === "endpoint_missing";
  /*
   * Backend o'z filialimizni ro'yxatdan chiqaradi (§4.7). Ya'ni bazada
   * bitta filial bo'lsa ro'yxat bo'sh keladi va tanlagich jimgina bo'sh
   * turadi — buni ochiq aytamiz, aks holda "tanlab bo'lmayapti" degan
   * tushunarsiz holat chiqadi.
   */
  const noOtherFilials =
    filials.isSuccess && (filials.data?.length ?? 0) === 0;

  /*
   * Faqat o'tkazsa bo'ladigan buyurtmalar (§4.8: `confirmed`, qulflanmagan).
   * Ro'yxat serverdan bir marta olinadi va qidiruv klientda bo'ladi — har
   * harfda so'rov yubormaymiz.
   */
  const orders = useQuery({
    queryKey: ["orders", "transferable"],
    queryFn: ({ signal }) =>
      fetchOrders(
        { statuses: ["confirmed"], period: "all", pageSize: 100 },
        signal,
      ),
    enabled: open,
    select: (page) => page.orders.filter((order) => canTransferOrder(order)),
  });

  const all = useMemo(() => orders.data ?? [], [orders.data]);

  const rows = useMemo(() => {
    const parsed = parseSearchQuery(query);
    if (!parsed) return all;

    return all.filter((order) => {
      const haystack = [
        order.orderNumber,
        order.client.fullName,
        order.deliveryInfo?.address,
        order.deliveryInfo?.region,
      ]
        .filter(Boolean)
        .join(" ");

      return (
        scoreText(makeSearchText(haystack), parsed) !== MATCH_NONE ||
        scoreDigits(order.client.phone, parsed) !== MATCH_NONE
      );
    });
  }, [all, query]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    rows.length > 0 && rows.every((order) => selected.has(order.id));

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) for (const order of rows) next.delete(order.id);
      else for (const order of rows) next.add(order.id);
      return next;
    });
  };

  const close = () => {
    setSelected(new Set());
    setReason("");
    setSearch("");
    onOpenChange(false);
  };

  const send = useMutation({
    mutationFn: async () => {
      const ids = [...selected];
      const failed: Array<{ id: string; message: string }> = [];
      let applied = 0;

      // Ketma-ket: bitta filialga o'nlab parallel so'rov yubormaymiz.
      for (const id of ids) {
        try {
          await requestOrderTransfer(id, {
            toFilialId: filialId as number,
            reason: reason.trim(),
          });
          applied += 1;
        } catch (error) {
          const order = all.find((item) => item.id === id);
          failed.push({
            id: order?.orderNumber || id.slice(0, 8),
            message: orderErrorMessage(error, "o'tkazilmadi"),
          });
        }
      }

      return { applied, failed };
    },
    onSuccess: ({ applied, failed }) => {
      if (applied > 0) {
        toast.success(
          `${applied} ta buyurtma taklif qilindi — javob kutilmoqda`,
        );
      }
      for (const failure of failed.slice(0, 3)) {
        toast.error(`${failure.id}: ${failure.message}`);
      }
      if (failed.length > 3) {
        toast.error(`yana ${failed.length - 3} ta buyurtma o'tkazilmadi`);
      }

      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      if (applied > 0) close();
      else setSelected(new Set());
    },
    onError: (error) =>
      toast.error(orderErrorMessage(error, "O'tkazishda xatolik")),
  });

  const canSend =
    filialId !== null && reason.trim().length > 0 && selected.size > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] w-[min(1240px,96vw)] max-w-none flex-col gap-0 p-0"
      >
        <div className="border-line flex items-start justify-between gap-3 border-b px-5 py-4">
          <div>
            <DialogTitle className="text-ink flex items-center gap-2 text-base font-semibold">
              <ArrowRightLeft className="text-brand size-4.5" />
              Buyurtmani boshqa filialga o&apos;tkazish
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-meta">
              Filialni tanlang, buyurtmalarni belgilang va sabab bilan
              yuboring — qabul qilinguncha ular sizda qulflanadi.
            </DialogDescription>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Yopish"
            className="text-ink-faint hover:bg-subtle hover:text-ink rounded-lg p-2 transition-colors"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* ── Chap: o'tkaziladigan buyurtmalar ─────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-line flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Raqam, mijoz, manzil"
                autoFocusShortcut={false}
                className="w-full sm:w-72"
              />

              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={rows.length === 0}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-dense font-medium transition-colors",
                  "disabled:opacity-50",
                  allVisibleSelected
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                )}
              >
                <CheckCheck className="size-3.5" />
                {allVisibleSelected
                  ? "Belgini olib tashlash"
                  : "Hammasini belgilash"}
              </button>

              <span className="text-ink-faint text-meta ml-auto">
                {rows.length} ta o&apos;tkazsa bo&apos;ladi
                {selected.size > 0 ? ` · ${selected.size} ta tanlandi` : ""}
              </span>
            </div>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-3">
              {orders.isPending ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <Skeleton key={index} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <EmptyView
                  Icon={PackageOpen}
                  title={
                    query
                      ? "Qidiruvga mos buyurtma yo'q"
                      : "O'tkazsa bo'ladigan buyurtma yo'q"
                  }
                  description="Faqat tasdiqlangan va tayyorlanayotgan buyurtmalar boshqa filialga o'tkaziladi."
                />
              ) : (
                <ul className="grid gap-1.5 xl:grid-cols-2">
                  {rows.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      checked={selected.has(order.id)}
                      onToggle={() => toggle(order.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── O'ng: nishon filial va sabab ─────────────────────────────── */}
          <div className="border-line flex w-80 shrink-0 flex-col border-l">
            <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {filialsMissing ? (
                <p className="bg-warn-soft text-warn rounded-lg px-3 py-2.5 text-meta leading-relaxed">
                  Filiallar ro&apos;yxati uchun backend javob bermayapti —
                  o&apos;tkazish hozircha ishlamaydi.
                </p>
              ) : noOtherFilials ? (
                <p className="bg-warn-soft text-warn rounded-lg px-3 py-2.5 text-meta leading-relaxed">
                  Boshqa filial yo&apos;q. O&apos;tkazish uchun tizimda
                  kamida ikkita filial bo&apos;lishi kerak — adminda
                  qo&apos;shilgach shu ro&apos;yxat o&apos;zi to&apos;ladi.
                </p>
              ) : (
                <>
                  <Field label="Qabul qiluvchi filial">
                    <Select
                      value={filialId === null ? "" : String(filialId)}
                      onValueChange={(value) => setFilialId(Number(value))}
                      disabled={filials.isPending}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue
                          placeholder={
                            filials.isPending ? "Yuklanmoqda..." : "Filial tanlang"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(filials.data ?? []).map((filial) => (
                          <SelectItem key={filial.id} value={String(filial.id)}>
                            <span data-no-translit>{filial.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label="Sabab"
                    hint="Qabul qiluvchi filial shu matnni ko'radi"
                  >
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Masalan: manzil Samarqand hududida"
                      className={cn(inputClass, "h-auto resize-y py-2.5")}
                    />
                  </Field>

                  <div className="bg-subtle text-ink-muted rounded-lg px-3 py-2.5 text-meta leading-relaxed">
                    <Building2 className="mr-1 inline size-3.5 align-text-bottom" />
                    Tanlangan buyurtmalar javob kelguncha sizda qulflanadi:
                    status ham, kuryer ham o&apos;zgarmaydi.
                  </div>
                </>
              )}
            </div>

            <div className="border-line border-t p-4">
              <Button
                className="w-full"
                disabled={
                  !canSend || send.isPending || filialsMissing || noOtherFilials
                }
                onClick={() => send.mutate()}
              >
                {send.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="size-4" />
                )}
                {selected.size > 0
                  ? `${selected.size} ta buyurtmani yuborish`
                  : "Buyurtmalarni belgilang"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  checked,
  onToggle,
}: {
  order: LogistOrder;
  checked: boolean;
  onToggle: () => void;
}) {
  const info = orderStatusInfo(order.status);
  const address = formatDeliveryAddress(order);

  return (
    <li>
      <label
        className={cn(
          "border-line flex h-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5",
          "transition-colors duration-(--dur-micro)",
          checked ? "border-brand bg-brand-soft" : "hover:border-line-strong",
        )}
      >
        <Checkbox checked={checked} onCheckedChange={onToggle} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-ink tabular text-dense font-semibold" data-no-translit>
              {order.orderNumber}
            </span>
            <StatusPill label={info.label} color={info.color} size="sm" />
            <OrderAmount
              order={order}
              className="text-ink tabular text-meta font-medium"
            />
            <OrderTagChips order={order} />
          </span>

          <span className="text-ink-muted mt-0.5 flex items-center gap-1 truncate text-meta">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate" data-no-translit={address ? "" : undefined}>
              {address || "Manzil ko'rsatilmagan"}
            </span>
          </span>

          <span
            className="text-ink-faint block truncate text-fine"
            data-no-translit={order.client.fullName ? "" : undefined}
          >
            {order.client.fullName || "Mijoz"}
            {order.client.phone ? ` · ${formatPhone(order.client.phone)}` : ""}
          </span>
        </span>
      </label>
    </li>
  );
}
