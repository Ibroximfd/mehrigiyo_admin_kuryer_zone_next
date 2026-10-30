"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, Plus, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { inputClass } from "@/components/kit/field";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateOrder } from "@/features/orders/api";
import type { LogistOrderPatch } from "@/features/orders/api";
import { OrderTagChips, useOrderTagValues } from "@/features/orders/components/order-tags";
import { orderErrorMessage } from "@/features/orders/error-hints";
import { ORDER_TAGS } from "@/features/orders/tags";
import type { LogistOrder } from "@/features/orders/types";
import { cn } from "@/lib/utils";
import { useTagsStore } from "@/stores/tags-store";

/** Bitta maydonni joyida saqlash — muvaffaqiyatda kesh yangilanadi. */
function useInlinePatch(order: LogistOrder, onPatched: (order: LogistOrder) => void, success: string) {
  return useMutation({
    mutationFn: (patch: LogistOrderPatch) => updateOrder(order.id, patch),
    onSuccess: (updated) => {
      toast.success(success);
      onPatched(updated);
    },
    onError: (error) => toast.error(orderErrorMessage(error, "Saqlashda xatolik")),
  });
}

/** Logist izohi — o'zgarsa "Saqlash" chiqadi; kuryer shu matnni ko'radi. */
export function InlineLogistNote({
  order,
  disabled,
  onPatched,
}: {
  order: LogistOrder;
  disabled: boolean;
  onPatched: (order: LogistOrder) => void;
}) {
  const [draft, setDraft] = useState(order.logistNote ?? "");
  const save = useInlinePatch(order, onPatched, "Logist izohi saqlandi");
  const dirty = draft.trim() !== (order.logistNote ?? "");

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        rows={2}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Kuryer uchun eslatma…"
        aria-label="Logist izohi"
        className={cn(inputClass, "h-auto min-h-9 resize-y py-2 text-dense")}
      />
      {dirty ? (
        <Button
          size="sm"
          className="self-end"
          disabled={save.isPending}
          onClick={() => save.mutate({ logistNote: draft.trim() || null })}
        >
          {save.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Saqlash
        </Button>
      ) : null}
    </div>
  );
}

/** Teglar + "+ teg" menyusi. Backend `tags` bermasa — qurilmada saqlanadi. */
export function InlineTags({
  order,
  disabled,
  onPatched,
}: {
  order: LogistOrder;
  disabled: boolean;
  onPatched: (order: LogistOrder) => void;
}) {
  const tags = useOrderTagValues(order);
  const toggleLocal = useTagsStore((state) => state.toggle);
  const save = useInlinePatch(order, onPatched, "Teglar saqlandi");

  const toggle = (tag: string) => {
    if (!order.tagsFromServer) {
      toggleLocal(order.id, tag);
      return;
    }
    const next = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
    save.mutate({ tags: next });
  };

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <OrderTagChips order={order} />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled || save.isPending}
          className="text-link hover:text-brand inline-flex items-center gap-0.5 text-meta font-medium"
        >
          {save.isPending ? <LoaderCircle className="size-3 animate-spin" /> : <Plus className="size-3" />}
          teg
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          {ORDER_TAGS.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.value}
              checked={tags.includes(tag.value)}
              onSelect={(event) => {
                event.preventDefault();
                toggle(tag.value);
              }}
            >
              {tag.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
