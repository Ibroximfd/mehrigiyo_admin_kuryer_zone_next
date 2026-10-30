"use client";

import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EditField,
  EditHeading,
  changedClass,
  editInputClass,
} from "@/features/orders/components/edit-order/edit-field";
import type { EditField as EditFieldKey, EditOrderValues } from "@/features/orders/edit-order";
import { phoneKey } from "@/features/orders/types";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const NEW_PHONE = "__new__";

/** Mijoz: ism va buyurtma raqami (liddagi raqamlardan yoki yangi). */
export function ClientFields({
  phones,
  changed,
}: {
  phones: string[];
  changed: ReadonlySet<EditFieldKey>;
}) {
  const { register, control, formState } = useFormContext<EditOrderValues>();
  const errors = formState.errors;

  return (
    <>
      <EditHeading>Mijoz</EditHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        <EditField id="edit-client-name" label="Ism" error={errors.clientName?.message}>
          <input
            id="edit-client-name"
            {...register("clientName")}
            aria-invalid={Boolean(errors.clientName)}
            aria-describedby={errors.clientName ? "edit-client-name-error" : undefined}
            className={cn(editInputClass, changedClass(changed.has("clientName")))}
          />
        </EditField>
        <EditField id="edit-phone" label="Buyurtma raqami (telefon)" error={errors.orderedForPhone?.message}>
          <Controller
            control={control}
            name="orderedForPhone"
            render={({ field }) => (
              <PhonePicker
                phones={phones}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.orderedForPhone)}
                changed={changed.has("orderedForPhone")}
              />
            )}
          />
        </EditField>
      </div>
    </>
  );
}

function PhonePicker({
  phones,
  value,
  onChange,
  onBlur,
  invalid,
  changed,
}: {
  phones: string[];
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
  changed: boolean;
}) {
  // `+998…` va `998…` — bitta raqam: formatdagi farq "yangi raqam" deb o'qilmasin.
  const match = phones.find((phone) => phoneKey(phone) === phoneKey(value)) ?? null;
  const known = match !== null;
  const [custom, setCustom] = useState(!known && value !== "");

  if (custom) {
    return (
      <div className="flex gap-1.5">
        <input
          id="edit-phone"
          type="tel"
          inputMode="tel"
          autoFocus={value === ""}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder="+998 90 000 00 00"
          aria-invalid={invalid}
          className={cn(editInputClass, "tabular", changedClass(changed))}
        />
        {phones.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(phones[0] ?? "");
            }}
            className="text-link hover:text-brand shrink-0 px-1 text-meta font-medium"
          >
            Ro&apos;yxat
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <Select
      value={match ?? ""}
      onValueChange={(next) => {
        if (!next) return;
        if (next === NEW_PHONE) {
          setCustom(true);
          onChange("");
          return;
        }
        // Tanlangan raqam hozirgisi bilan bir xil bo'lsa formatini o'zgartirmaymiz.
        if (phoneKey(next) !== phoneKey(value)) onChange(next);
      }}
    >
      <SelectTrigger id="edit-phone" className={cn("h-9 w-full", changedClass(changed))} aria-invalid={invalid}>
        <SelectValue placeholder="Raqam tanlang" />
      </SelectTrigger>
      <SelectContent>
        {phones.map((phone, index) => (
          <SelectItem key={phone} value={phone}>
            <span className="tabular">{formatPhone(phone)}</span>
            {index === 0 ? " · asosiy" : ""}
          </SelectItem>
        ))}
        <SelectItem value={NEW_PHONE}>+ yangi raqam…</SelectItem>
      </SelectContent>
    </Select>
  );
}
