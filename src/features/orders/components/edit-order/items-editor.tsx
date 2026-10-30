"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock, Minus, Package, Plus, X } from "lucide-react";
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { previewOrderItems } from "@/features/orders/api";
import { EditHeading } from "@/features/orders/components/edit-order/edit-field";
import { ProductSearch } from "@/features/orders/components/edit-order/product-search";
import { ItemPriceBadge } from "@/features/orders/components/item-price-badge";
import { editItemPriceView } from "@/features/orders/edit-order";
import type { EditField as EditFieldKey, EditOrderItem, EditOrderValues } from "@/features/orders/edit-order";
import { giftSourceLabel } from "@/features/orders/gift-source";
import { productAmount } from "@/features/products/price";
import type { Product } from "@/features/products/types";
import { formatSom, groupThousands } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

/**
 * Tarkib: soni (stepper), o'chirish, katalogdan qo'shish. Qutilar,
 * qo'shimcha mahsulot va sovg'a izohi 2026-10-30 da olib tashlangan
 * (CRM bilan bir xil). Yangi summa — server preview'dan; endpoint
 * bo'lmasa "saqlangach hisoblanadi" (klient pulni o'zi hisoblamaydi).
 * Qator narxi va chegirma belgisi — `editItemPriceView` / `ItemPriceBadge`.
 */
export function ItemsEditor({
  changed,
  locked = false,
}: {
  changed: ReadonlySet<EditFieldKey>;
  /** Onlayn to'langan buyurtma — tarkib va summa qulf (`paid_order_amount_locked`). */
  locked?: boolean;
}) {
  const { control, formState } = useFormContext<EditOrderValues>();
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const errors = formState.errors;

  const addProduct = (product: Product) => {
    const index = items.findIndex((item) => item.productId === product.id && !item.isGift);
    const existing = index >= 0 ? items[index] : undefined;
    if (existing) {
      update(index, { ...existing, quantity: existing.quantity + 1 });
      return;
    }
    append({
      key: `new-${product.id}-${items.length}`,
      lineId: null,
      productId: product.id,
      name: product.title,
      imageUrl: product.image || null,
      // Serverning `price.amount` i — katalog narxi mijozda hisoblanmaydi.
      catalogPrice: productAmount(product),
      linePrice: null,
      quantity: 1,
      isGift: false,
      giftSource: null,
    });
  };

  return (
    <>
      <EditHeading>Tarkib</EditHeading>
      {locked ? (
        <p className="bg-amber-soft text-gold flex items-start gap-2 rounded-lg px-3 py-2 text-meta font-medium">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Buyurtma onlayn to&apos;langan — tarkib va summa qulflangan. Izoh, manzil va sanani
          o&apos;zgartirish mumkin.
        </p>
      ) : null}
      <div
        className={cn(
          "flex flex-col rounded-lg",
          changed.has("items") && "bg-amber-soft ring-amber-line px-2 ring-1",
        )}
      >
        {fields.map((field, index) => (
          <div key={field.id} className="border-line flex items-center gap-2.5 border-b border-dashed py-2">
            <span className="bg-surface-3 flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Package className="text-ink-faint size-4" aria-hidden />
            </span>
            <span className="text-ink flex min-w-0 flex-1 items-center gap-1.5 text-dense font-semibold">
              <span data-no-translit className="truncate">
                {field.name || "—"}
              </span>
              {field.isGift ? (
                <span className="text-gold shrink-0 text-fine">· {giftSourceLabel(field.giftSource)}</span>
              ) : (
                <ItemPriceBadge
                  item={{
                    isGift: field.isGift,
                    discountPercent: field.linePrice?.discountPercent ?? 0,
                    offer: field.linePrice?.offer ?? null,
                  }}
                />
              )}
            </span>
            <Controller
              control={control}
              name={`items.${index}.quantity`}
              render={({ field: quantity }) => (
                <Stepper
                  value={quantity.value}
                  onChange={quantity.onChange}
                  name={field.name}
                  disabled={locked}
                />
              )}
            />
            {/* Soni stepper bilan o'zgaradi — narx joriy (kuzatilgan) qiymatdan. */}
            <ItemPrice item={items[index] ?? field} />
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={locked}
              aria-label={`${field.name} ni o'chirish`}
              className="text-danger hover:bg-danger-soft border-line flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-40"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {locked ? null : (
          <div className="py-2">
            <ProductSearch onPick={addProduct} />
          </div>
        )}
      </div>
      {errors.items?.message ? (
        <p role="alert" className="text-danger text-meta font-medium">{errors.items.message}</p>
      ) : null}
      {changed.has("items") ? <PreviewTotal items={items} /> : null}
    </>
  );
}

function Stepper({
  value,
  onChange,
  name,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  name: string;
  disabled?: boolean;
}) {
  const button =
    "bg-canvas text-brand hover:bg-brand-soft flex size-7 items-center justify-center transition-colors disabled:opacity-40";
  return (
    <span className="border-line inline-flex shrink-0 items-center overflow-hidden rounded-md border">
      <button
        type="button"
        className={button}
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label={`${name}: kamaytirish`}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="tabular w-8 text-center text-dense font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={button}
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        aria-label={`${name}: ko'paytirish`}
      >
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}

/**
 * Qator narxi katagi. Yalang'och raqam — dona narxi (avvalgidek); qator jami
 * ko'rsatilsa ustida "jami" yozuvi turadi. Son o'zgargan-u server dona
 * narxini bermagan bo'lsa eski jami endi noto'g'ri — "—", yangi summa pastda.
 */
function ItemPrice({ item }: { item: EditOrderItem }) {
  const view = editItemPriceView(item);
  return (
    <span className="tabular flex w-24 shrink-0 flex-col items-end text-dense leading-tight font-semibold">
      {view.kind === "unit" ? (
        <>
          {view.struck !== null ? (
            <s className="text-ink-faint text-micro font-normal">{groupThousands(view.struck)}</s>
          ) : null}
          <span className="text-ink">{groupThousands(view.amount)}</span>
        </>
      ) : (
        <>
          <span className="text-ink-faint text-micro font-normal">jami</span>
          {view.kind === "total" ? (
            <span className="text-ink">{groupThousands(view.amount)}</span>
          ) : (
            <span className="text-ink-faint" title="Soni o'zgardi — yangi summa pastda, serverdan">
              —
            </span>
          )}
        </>
      )}
    </span>
  );
}

function PreviewTotal({ items }: { items: EditOrderItem[] }) {
  const payload = items
    .filter((item): item is EditOrderItem & { productId: number } => item.productId !== null)
    .map((item) => ({ productId: item.productId, quantity: item.quantity, isGift: item.isGift }));
  const signature = payload.map((item) => `${item.productId}:${item.quantity}:${item.isGift ? 1 : 0}`).join("|");

  const preview = useQuery({
    queryKey: queryKeys.orderPreview(signature),
    queryFn: ({ signal }) => previewOrderItems(payload, signal),
    staleTime: 30_000,
  });

  return (
    <p className="text-ink-muted text-meta" aria-live="polite">
      {preview.isPending
        ? "Yangi summa hisoblanmoqda…"
        : preview.data
          ? (
            <>
              Yangi summa (server):{" "}
              <b className="text-ink tabular font-semibold">{formatSom(preview.data.payableAmount)}</b>
            </>
          )
          : "Yangi summa saqlangach serverda hisoblanadi."}
    </p>
  );
}
