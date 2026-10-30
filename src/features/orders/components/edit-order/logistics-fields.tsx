"use client";

import { Controller, useFormContext } from "react-hook-form";

import {
  EditField,
  EditHeading,
  changedClass,
  editTextareaClass,
} from "@/features/orders/components/edit-order/edit-field";
import type { EditField as EditFieldKey, EditOrderValues } from "@/features/orders/edit-order";
import { ORDER_TAGS } from "@/features/orders/tags";
import { cn } from "@/lib/utils";

/**
 * Logistika: teglar, logist izohi (kuryer ko'radi). Kuryer bu yerda
 * tanlanmaydi — uni bosh kuryer tanlaydi (2026-10-30); bosh kuryer
 * detaldagi «Bosh kuryer» maydonida.
 */
export function LogisticsFields({ changed }: { changed: ReadonlySet<EditFieldKey> }) {
  const { control, register } = useFormContext<EditOrderValues>();

  return (
    <>
      <EditHeading>Logistika</EditHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <EditField id="edit-tags" label="Teglar">
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <div
                id="edit-tags"
                role="group"
                aria-label="Teglar"
                className={cn(
                  "border-border-control/60 flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5",
                  changedClass(changed.has("tags")),
                )}
              >
                {ORDER_TAGS.map((tag) => {
                  const on = field.value.includes(tag.value);
                  return (
                    <button
                      key={tag.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        field.onChange(on ? field.value.filter((item) => item !== tag.value) : [...field.value, tag.value])
                      }
                      style={{ "--accent": tag.color } as React.CSSProperties}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-fine font-semibold transition-colors",
                        on
                          ? "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-[var(--accent)]"
                          : "text-ink-faint hover:text-ink",
                      )}
                    >
                      {on ? tag.label : `+ ${tag.label}`}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </EditField>

        <EditField id="edit-logist-note" label="Logist izohi (kuryer ko'radi)" className="sm:col-span-2">
          <textarea
            id="edit-logist-note"
            rows={2}
            {...register("logistNote")}
            className={cn(editTextareaClass, changedClass(changed.has("logistNote")))}
          />
        </EditField>
      </div>
    </>
  );
}
