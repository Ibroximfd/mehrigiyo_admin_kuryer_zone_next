"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, LoaderCircle } from "lucide-react";
import { Fragment, useState } from "react";
import { toast } from "sonner";

import { ProductThumb } from "@/components/kit/product-thumb";
import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ApiError, errorCode, errorMessage } from "@/lib/api-client";
import { groupThousands } from "@/lib/format";
import { shownQuantity, shownUnit, stockQuantityOf } from "@/lib/item-ref";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { createCourierDocument } from "../api";
import { adjustmentStoreMoves, documentRows, draftQuantity, hasStoreMoves, initialDraft, planDocument, storeEffectMoves } from "../courier-document";
import type { CourierDocumentMode, StoreMove, StoreMoves } from "../courier-document";
import { mapShortages, type CourierStock, type SkladStockRow } from "../types";

export type { CourierDocumentMode } from "../courier-document";

const COPY: Record<CourierDocumentMode, { title: string; hint: string; submit: string; column: string }> = {
  courier_load: { title: "Kuryerga berish", hint: "Skladdan kuryerga — sklad kamayadi, kuryerda ko'payadi.", submit: "Berish", column: "Beriladi" },
  courier_return: { title: "Kuryerdan qabul", hint: "Kuryerdan skladga — kuryerda kamayadi, sklad ko'payadi.", submit: "Qabul qilish", column: "Qabul" },
  adjustment: { title: "Tuzatish", hint: "Sanaganda chiqqan sonni yozing — kuryer qoldig'i shunga tenglashadi.", submit: "Saqlash", column: "Sanaldi" },
};

/** Hujjat xatosi — o'qiladigan matn (403 ruxsat, 409 qoldiq yetmaydi). */
export function documentError(error: unknown): string {
  // «Topilma» (`found: true`) — faqat logist (hujjat 125 §A). Bu sayt uni yubormaydi; server shunday desa — tushunarli matn.
  if (errorCode(error) === "found_requires_logist") return "Topilmani faqat logist yozadi";
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
 * sklad omboridagi mol; qabul — kuryer qo'lidagi mol; tuzatish — hamma mahsulot, kuryerdagisi
 * oldinda (`documentRows`). Tuzatishda `actual_qty`, faqat o'zgargan qator yuboriladi.
 * Tuzatish ombor bilan juft yoziladi (hujjat 125 §A): kuryerga qo'shilgani ombordan chiqadi,
 * kamaygani omborga qaytadi, sklad jamisi o'zgarmaydi — oyna buni saqlashdan oldin ko'rsatadi,
 * saqlangach server aytgan natijani (`store_effect`) yozadi.
 * Son ekrandagi birlikda kiritiladi (donada yuritiladigan mahsulot — donada, hujjat 84 §3);
 * skladda hali karobkada turgan bunday mahsulot serverga butun karobka bo'lib aniq aylantiriladi.
 *
 * Saqlangach sklad, berish rejasi va Sotuv jadvali qayta so'raladi.
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
  const rows = documentRows(mode, courier, stock);
  const [draft, setDraft] = useState<Record<number, string>>(() => initialDraft(mode, rows));
  const value = (id: number) => draftQuantity(draft[id]);
  const { lines, sendable, notWhole, overLimit } = planDocument(mode, rows, draft);
  const needsStore = mode !== "adjustment" && store === null;

  const save = useMutation({
    mutationFn: (all: boolean) => {
      if (mode === "adjustment")
        return createCourierDocument({ type: mode, courierId: courier.courier.id, lines: sendable.map((line) => ({ itemId: line.itemId, actualQty: line.quantity })) });
      return mode === "courier_load"
        ? createCourierDocument({ type: mode, locationId: store!.id, courierId: courier.courier.id, lines: sendable })
        : createCourierDocument({ type: mode, locationId: store!.id, courierId: courier.courier.id, lines: all ? null : sendable });
    },
    onSuccess: ({ negative, storeEffect, jamiDelta }) => {
      for (const cell of negative) {
        const row = rows.find((entry) => entry.item.id === cell.itemId);
        const amount = row ? shownQuantity(row.item, cell.onHand) : cell.onHand;
        toast.warning(`${row?.item.name ?? `#${cell.itemId}`} qoldig'i ${groupThousands(amount)} bo'ldi`, {
          description: "Qoldiq minusga tushdi — sanab, tuzatish bilan to'g'rilang.",
        });
      }
      // Natija — server aytgani (`store_effect`); kalit kelmasa (eski server) — umumiy xabar.
      const result = mode === "adjustment" && storeEffect ? storeEffectMoves(storeEffect, rows) : null;
      toast.success(`${copy.title} saqlandi`, {
        description: result && hasStoreMoves(result) ? <StoreMovesText moves={result} outLabel="Ombordan chiqdi:" backLabel="Omborga qaytdi:" /> : undefined,
      });
      // Juft tuzatishda jami o'zgarmaydi; o'zgargan bo'lsa — kuryerning ombori topilmagan (125, cheklov 10).
      if (mode === "adjustment" && jamiDelta !== null && jamiDelta !== 0) {
        toast.warning("Sklad jamisi o'zgardi — kuryerning ombori topilmadi", { description: "Bosh logistga xabar bering." });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSklad });
      void queryClient.invalidateQueries({ queryKey: queryKeys.chiefSalesSheets });
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
            {mode === "courier_load"
              ? "Skladda berish uchun mol yo'q."
              : mode === "adjustment"
                ? "Tuzatish uchun mahsulot yo'q — sklad qoldig'i bo'sh."
                : "Kuryer qo'lida mol yo'q."}
          </p>
        ) : (
          <ul className="border-line divide-line scrollbar-thin mt-3 max-h-[50dvh] divide-y overflow-y-auto rounded-xl border">
            {rows.map(({ item, available, held }, index) => (
              <Fragment key={item.id}>
                {/* Tuzatishda kuryerda yo'q mahsulotlar alohida guruh — 0 dan yoziladi. */}
                {mode === "adjustment" && !held && (index === 0 || rows[index - 1]?.held) ? (
                  <li className="bg-subtle text-ink-muted px-3 py-1.5 text-meta font-semibold">Kuryerda yo&apos;q mahsulotlar</li>
                ) : null}
                <li className="flex items-center gap-2.5 px-3 py-2">
                  <ProductThumb src={item.image} name={item.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block truncate text-dense font-medium" data-no-translit>{item.name}</span>
                    <span className="text-ink-faint text-meta">
                      {/* Birlik doim yoziladi: jadvalda karobka ustuni bo'lsa ham bu yerda son sklad birligida bo'lishi mumkin. */}
                      {`${mode === "courier_load" ? "Skladda" : "Kuryerda"}: ${groupThousands(available)}`} <span>{shownUnit(item)}</span>
                    </span>
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
                      stockQuantityOf(item, value(item.id)) === null
                        ? "border-danger"
                        : mode !== "adjustment" && value(item.id) > available && "border-warn",
                    )}
                  />
                </li>
              </Fragment>
            ))}
          </ul>
        )}
        {overLimit ? <p className="text-warn mt-2 text-meta">Ba&apos;zi qatorda bordan ko&apos;p — saqlanadi, qoldiq minusga tushadi.</p> : null}
        {notWhole ? <p className="text-danger mt-2 text-meta">Karobkada turgan mahsulotda son butun karobkaga teng bo&apos;lsin.</p> : null}
        {mode === "adjustment" && rows.length > 0 ? <PairedNote moves={adjustmentStoreMoves(lines)} /> : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          {mode === "courier_return" && rows.length > 0 && !needsStore ? (
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate(true)}>
              Hammasini qabul qilish
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={needsStore || lines.length === 0 || notWhole || save.isPending}
            onClick={() => save.mutate(false)}
          >
            {save.isPending ? <LoaderCircle className="animate-spin" /> : null}
            {copy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tuzatish ombor bilan juft yoziladi (hujjat 125 §A) — doim ko'rinadigan izoh va,
 * son o'zgargach, omborga ta'siri: nima chiqadi, nima qaytadi (ekrandagi birlikda).
 */
function PairedNote({ moves }: { moves: StoreMoves }) {
  return (
    <div role="status" className="bg-subtle mt-3 rounded-xl px-3 py-2.5">
      <p className="text-ink-muted flex items-start gap-1.5 text-meta">
        <ArrowLeftRight aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>Kuryerga qo&apos;shilgan mol ombordan ayiriladi, kamaygani omborga qaytadi. Sklad jamisi o&apos;zgarmaydi.</span>
      </p>
      {hasStoreMoves(moves) ? (
        <p className="text-ink mt-1.5 text-dense">
          <StoreMovesText moves={moves} outLabel="Ombordan chiqadi:" backLabel="Omborga qaytadi:" />
        </p>
      ) : null}
    </div>
  );
}

/** «Ombordan chiqdi: Krem 30 dona, …» — nom tarjima qilinmaydi, birlik alohida bo'lakda (lug'atda bor). */
function StoreMovesText({ moves, outLabel, backLabel }: { moves: StoreMoves; outLabel: string; backLabel: string }) {
  return (
    <>
      <MovesLine label={outLabel} moves={moves.out} />
      <MovesLine label={backLabel} moves={moves.back} />
    </>
  );
}

function MovesLine({ label, moves }: { label: string; moves: readonly StoreMove[] }) {
  if (moves.length === 0) return null;
  return (
    <span className="block">
      <span className="font-semibold">{label}</span>{" "}
      {moves.map((move, index) => (
        <span key={move.itemId}>
          {index > 0 ? ", " : null}
          <span data-no-translit>{move.name}</span> <span className="tabular">{groupThousands(move.amount)}</span>
          {move.unit ? <> <span>{move.unit}</span></> : null}
        </span>
      ))}
    </span>
  );
}
