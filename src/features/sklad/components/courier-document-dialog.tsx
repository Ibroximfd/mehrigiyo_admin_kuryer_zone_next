"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductThumb } from "@/components/kit/product-thumb";
import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiError, errorCode, errorMessage } from "@/lib/api-client";
import { groupThousands } from "@/lib/format";
import { shownQuantity, stockQuantityOf, type ItemRef } from "@/lib/item-ref";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { createCourierDocument } from "../api";
import { mapShortages, type CourierStock, type SkladStockRow } from "../types";

export type CourierDocumentMode = "courier_load" | "courier_return" | "adjustment";

const COPY: Record<CourierDocumentMode, { title: string; hint: string; submit: string; column: string }> = {
  courier_load: { title: "Kuryerga berish", hint: "Skladdan kuryerga — sklad kamayadi, kuryerda ko'payadi.", submit: "Berish", column: "Beriladi" },
  courier_return: { title: "Kuryerdan qabul", hint: "Kuryerdan skladga — kuryerda kamayadi, sklad ko'payadi.", submit: "Qabul qilish", column: "Qabul" },
  adjustment: { title: "Tuzatish", hint: "Sanaganda chiqqan sonni yozing — kuryer qoldig'i shunga tenglashadi.", submit: "Saqlash", column: "Sanaldi" },
};

/** `available` — ekrandagi birlikda: donada yuritiladigan mahsulot donada (hujjat 84). */
type Row = { item: ItemRef; available: number };

/** Hujjat xatosi — o'qiladigan matn (403 ruxsat, 409 qoldiq yetmaydi). */
function documentError(error: unknown): string {
  if (errorCode(error) === "insufficient_stock" && error instanceof ApiError) {
    const shortages = mapShortages(error.data);
    return shortages.length
      ? `Qoldiq yetmaydi: ${shortages.map((row) => `${row.name} (${row.available}/${row.need})`).join(", ")}`
      : "Qoldiq yetmaydi";
  }
  if (error instanceof ApiError && error.status === 403) return "Bu amalga ruxsat yo'q — faqat o'z skladingiz va kuryerlaringiz";
  return errorMessage(error, "Hujjatni saqlab bo'lmadi");
}

/**
 * Bosh kuryer hujjati (sklad hujjati 2026-11-03 §6): faqat uchta tur. Kuryerga berish —
 * sklad omboridagi mol; qabul va tuzatish — kuryer qo'lidagi mol. Tuzatishda `actual_qty`.
 * Son ekrandagi birlikda kiritiladi (donada yuritiladigan mahsulot — donada, hujjat 84 §3);
 * skladda hali karobkada turgan bunday mahsulot serverga butun karobka bo'lib aniq aylantiriladi.
 */
export function CourierDocumentDialog({
  mode,
  courier,
  stock,
  store,
  onClose,
}: {
  mode: CourierDocumentMode;
  courier: CourierStock;
  stock: SkladStockRow[];
  store: { id: number; name: string } | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const copy = COPY[mode];
  const rows: Row[] =
    mode === "courier_load"
      ? stock.filter((row) => row.inSklad > 0).map((row) => ({ item: row.item, available: shownQuantity(row.item, row.inSklad) }))
      : courier.items
          // Qabulda faqat qo'lidagi (musbat) mol; tuzatishda minus qator ham — sanab tenglashtiriladi.
          .filter((entry) => mode === "adjustment" || entry.quantity > 0)
          .map((entry) => ({ item: entry.item, available: shownQuantity(entry.item, entry.quantity) }));
  // Sukut: berishda 0; qabulda hammasi; tuzatishda joriy qoldiq (o'zgarmagan qator yuborilmaydi).
  const [draft, setDraft] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.item.id, mode === "courier_load" ? "" : String(row.available)])),
  );
  const value = (id: number) => {
    const parsed = Number.parseInt(draft[id] ?? "", 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const lines = rows
    .map((row) => ({ row, qty: value(row.item.id) }))
    .filter(({ row, qty }) => (mode === "adjustment" ? qty !== row.available : qty > 0));
  const overLimit = mode !== "adjustment" && lines.some(({ row, qty }) => qty > row.available);
  /** Server birligidagi qatorlar; butun karobka chiqmagan qator yuborilmaydi (tugma yopiq). */
  const sendable = lines.flatMap(({ row, qty }) => {
    const quantity = stockQuantityOf(row.item, qty);
    return quantity === null ? [] : [{ itemId: row.item.id, quantity }];
  });
  const notWhole = sendable.length < lines.length;
  const needsStore = mode !== "adjustment" && store === null;

  const save = useMutation({
    mutationFn: (all: boolean) => {
      if (mode === "adjustment")
        return createCourierDocument({ type: mode, courierId: courier.courier.id, lines: sendable.map((line) => ({ itemId: line.itemId, actualQty: line.quantity })) });
      return mode === "courier_load"
        ? createCourierDocument({ type: mode, locationId: store!.id, courierId: courier.courier.id, lines: sendable })
        : createCourierDocument({ type: mode, locationId: store!.id, courierId: courier.courier.id, lines: all ? null : sendable });
    },
    onSuccess: () => {
      toast.success(`${copy.title} saqlandi`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSklad });
      onClose();
    },
    onError: (error) => toast.error(documentError(error)),
  });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>
          <span data-no-translit>{courier.courier.fullName}</span>
          {store && mode !== "adjustment" ? <> · <span data-no-translit>{store.name}</span></> : null}
          <span className="block">{copy.hint}</span>
        </DialogDescription>

        {needsStore ? (
          <p className="text-warn mt-3 text-dense">Sklad ombori topilmadi — bosh logistga murojaat qiling.</p>
        ) : rows.length === 0 ? (
          <p className="text-ink-muted mt-3 text-dense">
            {mode === "courier_load" ? "Skladda berish uchun mol yo'q." : "Kuryer qo'lida mol yo'q."}
          </p>
        ) : (
          <ul className="border-line divide-line scrollbar-thin mt-3 max-h-[50dvh] divide-y overflow-y-auto rounded-xl border">
            {rows.map(({ item, available }) => (
              <li key={item.id} className="flex items-center gap-2.5 px-3 py-2">
                <ProductThumb src={item.image} name={item.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="text-ink block truncate text-dense font-medium" data-no-translit>{item.name}</span>
                  <span className="text-ink-faint text-meta">{`${mode === "courier_load" ? "Skladda" : "Kuryerda"}: ${groupThousands(available)}`}</span>
                  {item.stockFactor > 1 ? <span className="text-ink-faint ml-1.5 text-meta">{`· 1 kar. = ${item.stockFactor} dona`}</span> : null}
                </span>
                <input
                  inputMode="numeric"
                  aria-label={`${item.name}: ${copy.column}`}
                  placeholder="0"
                  value={draft[item.id] ?? ""}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value.replace(/\D/g, "") }))}
                  className={cn(
                    inputClass,
                    "tabular h-9 w-20 text-right",
                    ((mode !== "adjustment" && value(item.id) > available) || stockQuantityOf(item, value(item.id)) === null) && "border-danger",
                  )}
                />
              </li>
            ))}
          </ul>
        )}
        {overLimit ? <p className="text-danger mt-2 text-meta">Son mavjud qoldiqdan oshmasin.</p> : null}
        {notWhole ? <p className="text-danger mt-2 text-meta">Karobkada turgan mahsulotda son butun karobkaga teng bo&apos;lsin.</p> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          {mode === "courier_return" && rows.length > 0 && !needsStore ? (
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate(true)}>
              Hammasini qabul qilish
            </Button>
          ) : null}
          <Button type="button" disabled={needsStore || lines.length === 0 || overLimit || notWhole || save.isPending} onClick={() => save.mutate(false)}>
            {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
            {copy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
