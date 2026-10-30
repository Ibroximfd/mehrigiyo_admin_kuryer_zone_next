"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Minus, Package, Plus, Search, X } from "lucide-react";
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
import { searchProducts } from "@/features/products/api";
import type { Product } from "@/features/products/types";
import { createTransfer, fetchFilials } from "@/features/transfers/api";
import { transferErrorMessage } from "@/features/transfers/error-hints";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { errorCode } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * "Yangi zakaz" — filiallararo ta'minot buyurtmasi (LOGIST-PLAN §8.2).
 *
 * Ichki hujjat: narx ko'rsatilmaydi, faqat mahsulot va miqdor. Mahsulotlar
 * do'kon katalogidan qidiriladi (`/shop/medicines/?search=`).
 */
type Line = { product: Product; quantity: number };

export function CreateTransferDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [toFilialId, setToFilialId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const filials = useQuery({
    queryKey: queryKeys.filials,
    queryFn: ({ signal }) => fetchFilials(signal),
    enabled: open,
    staleTime: 5 * 60_000,
  });
  const filialsMissing = errorCode(filials.error) === "endpoint_missing";
  /** Bazada bitta filial bo'lsa ro'yxat bo'sh keladi — buni ochiq aytamiz. */
  const noOtherFilials =
    filials.isSuccess && (filials.data?.length ?? 0) === 0;

  const products = useQuery({
    queryKey: queryKeys.products(debouncedQuery),
    queryFn: ({ signal }) => searchProducts(debouncedQuery, { signal }),
    enabled: open && debouncedQuery.length >= 2,
  });

  const addLine = (product: Product) => {
    setLines((current) => {
      const existing = current.find(
        (line) => line.product.id === product.id,
      );
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setQuery("");
  };

  const setQuantity = (productId: number, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.product.id !== productId)
        : current.map((line) =>
            line.product.id === productId ? { ...line, quantity } : line,
          ),
    );
  };

  const reset = () => {
    setToFilialId(null);
    setNote("");
    setQuery("");
    setLines([]);
  };

  const submit = useMutation({
    mutationFn: () =>
      createTransfer({
        toFilialId: toFilialId as number,
        note: note.trim() || null,
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      }),
    onSuccess: (transfer) => {
      toast.success(`${transfer.number} yuborildi — javob kutilmoqda`);
      void queryClient.invalidateQueries({ queryKey: ["transfers"] });
      reset();
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error(transferErrorMessage(error, "Zakaz yaratishda xatolik")),
  });

  const canSubmit = toFilialId !== null && lines.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col">
        <DialogTitle>Yangi zakaz</DialogTitle>
        <DialogDescription>
          Boshqa filialdan mahsulot so&apos;rash — ichki hujjat, narxsiz.
        </DialogDescription>

        {filialsMissing ? (
          <p className="bg-warn-soft text-warn mt-3 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
            Filiallararo almashinuv uchun backend hali chiqmagan
            (BACKEND-LOGIST.md §7) — bo&apos;lim backend bilan birga ishga
            tushadi.
          </p>
        ) : noOtherFilials ? (
          <p className="bg-warn-soft text-warn mt-3 rounded-lg px-3 py-2.5 text-meta leading-relaxed">
            Boshqa filial yo&apos;q — zakaz berish uchun tizimda kamida
            ikkita filial bo&apos;lishi kerak.
          </p>
        ) : (
          <div className="scrollbar-thin mt-3 min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-1">
            <Field label="Ta'minotchi filial">
              <Select
                value={toFilialId === null ? "" : String(toFilialId)}
                onValueChange={(value) => setToFilialId(Number(value))}
                disabled={filials.isPending}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Filial tanlang" />
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

            <Field label="Mahsulot qidiruvi">
              <Search className="text-ink-faint pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Kamida 2 ta harf yozing..."
                className={cn(inputClass, "pl-9")}
              />
            </Field>

            {products.isFetching ? (
              <p className="text-ink-faint text-meta">Qidirilmoqda...</p>
            ) : null}

            {products.data && debouncedQuery.length >= 2 ? (
              <ul className="border-line divide-line max-h-44 divide-y overflow-y-auto rounded-lg border">
                {products.data.products.length === 0 ? (
                  <li className="text-ink-faint px-3 py-2.5 text-meta">
                    Hech narsa topilmadi
                  </li>
                ) : (
                  products.data.products.slice(0, 8).map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addLine(product)}
                        className="hover:bg-subtle flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
                      >
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt=""
                            loading="lazy"
                            className="size-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="bg-subtle flex size-8 shrink-0 items-center justify-center rounded">
                            <Package className="text-ink-faint size-4" />
                          </span>
                        )}
                        <span className="text-ink min-w-0 flex-1 truncate text-dense" data-no-translit>
                          {product.title}
                        </span>
                        <Plus className="text-brand size-4 shrink-0" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}

            {lines.length > 0 ? (
              <ul className="border-line divide-line divide-y rounded-lg border">
                {lines.map((line) => (
                  <li
                    key={line.product.id}
                    className="flex items-center gap-2.5 px-3 py-2"
                  >
                    <span
                      className="text-ink min-w-0 flex-1 truncate text-dense font-medium"
                      data-no-translit
                    >
                      {line.product.title}
                    </span>

                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Kamaytirish"
                        onClick={() =>
                          setQuantity(line.product.id, line.quantity - 1)
                        }
                        className="text-ink-faint hover:text-ink hover:bg-subtle rounded p-1 transition-colors"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(event) =>
                          setQuantity(
                            line.product.id,
                            Number(event.target.value) || 1,
                          )
                        }
                        aria-label={`${line.product.title} miqdori`}
                        className={cn(
                          inputClass,
                          "tabular h-8 w-16 px-2 text-center",
                        )}
                      />
                      <button
                        type="button"
                        aria-label="Oshirish"
                        onClick={() =>
                          setQuantity(line.product.id, line.quantity + 1)
                        }
                        className="text-ink-faint hover:text-ink hover:bg-subtle rounded p-1 transition-colors"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Olib tashlash"
                        onClick={() => setQuantity(line.product.id, 0)}
                        className="text-ink-faint hover:text-danger hover:bg-danger-soft ml-1 rounded p-1 transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <Field label="Izoh" hint="Ixtiyoriy">
              <textarea
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={cn(inputClass, "h-auto resize-y py-2.5")}
              />
            </Field>
          </div>
        )}

        <div className="mt-4 flex shrink-0 justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          {!filialsMissing && !noOtherFilials ? (
            <Button
              disabled={!canSubmit || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Zakaz yuborish
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
