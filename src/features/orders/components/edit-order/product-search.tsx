"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Package, Search } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchProducts } from "@/features/products/api";
import { ProductPriceText } from "@/features/products/components/product-price-text";
import { isSellable } from "@/features/products/price";
import type { Product } from "@/features/products/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { errorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

import { editInputClass } from "./edit-field";

/** "Mahsulot qo'shish…" — katalogdan qidiruv (`features/products`). */
export function ProductSearch({ onPick }: { onPick: (product: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);

  const products = useQuery({
    queryKey: queryKeys.products(debounced),
    queryFn: ({ signal }) => searchProducts(debounced, { signal }),
    enabled: open,
    staleTime: 60_000,
  });
  const list = (products.data?.products ?? []).filter((product) => product.isActive);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          editInputClass,
          "text-ink-faint flex items-center gap-2 text-left",
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        Mahsulot qo&apos;shish…
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-72 p-2">
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nomi bo'yicha qidirish"
          aria-label="Mahsulot qidirish"
          className={editInputClass}
        />
        <div className="scrollbar-thin mt-2 max-h-64 overflow-y-auto" role="listbox" aria-label="Mahsulotlar">
          {products.isPending ? (
            <p className="text-ink-faint flex items-center gap-2 px-2 py-3 text-meta">
              <LoaderCircle className="size-3.5 animate-spin" /> Qidirilmoqda…
            </p>
          ) : products.isError ? (
            <p className="text-danger px-2 py-3 text-meta">
              {errorMessage(products.error, "Mahsulotlarni yuklab bo'lmadi")}
            </p>
          ) : list.length === 0 ? (
            <p className="text-ink-faint px-2 py-3 text-meta">
              {debounced ? `«${debounced}» bo'yicha mahsulot topilmadi` : "Katalog bo'sh"}
            </p>
          ) : (
            list.map((product) => (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={false}
                // Narxi yo'q (`price: null`) — shu bozorda sotilmaydi: ko'rinadi, qo'shilmaydi.
                disabled={!isSellable(product)}
                onClick={() => {
                  onPick(product);
                  setOpen(false);
                  setQuery("");
                }}
                className="hover:bg-subtle flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-dense disabled:pointer-events-none disabled:opacity-50"
              >
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="bg-surface-3 size-8 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="bg-surface-3 flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Package className="text-ink-faint size-4" aria-hidden />
                  </span>
                )}
                <span className="text-ink min-w-0 flex-1 truncate" data-no-translit>
                  {product.title}
                </span>
                <ProductPriceText product={product} className="text-ink-muted shrink-0 text-meta" />
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
