"use client";

import { useQuery } from "@tanstack/react-query";
import { BadgePercent } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchBranchOperators } from "@/features/orders/api";
import {
  OPERATOR_SOURCE_LABELS,
  parseOperatorId,
} from "@/features/orders/commission-operator";
import type { OperatorCandidate } from "@/features/orders/commission-operator";
import type { PersonRef } from "@/features/orders/types";
import {
  EditField,
  editInputClass,
} from "@/features/orders/components/edit-order/edit-field";
import type { EditOrderValues } from "@/features/orders/edit-order";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const MANUAL = "__manual__";

/**
 * Komissiya egasi (`operator_id`) — tavsiya orqali kelgan buyurtmada tarkib
 * o'zgarsa backend so'raydi. Qiymat buyurtmadan avtomatik to'ladi
 * (tavsiya operatori / mas'ul / lid mas'uli).
 *
 * Tanlov **faqat** filial ro'yxatidan (`GET /operator/logist/operators/`,
 * 2026-10-01 §5.6): server `operator_id` ni aynan shu ro'yxat bilan
 * tekshiradi, undan tashqaridagi odam `operator_invalid`. Buyurtmadagi
 * nomzod ro'yxatda bo'lmasa (ishdan ketgan, boshqa filial) — tanlanmaydi.
 * Endpoint umuman bo'lmasa (eski backend) — nomzodlar va qo'lda ID.
 */
export function OperatorField({
  candidates,
  highlighted,
}: {
  candidates: OperatorCandidate[];
  /** Tarkib o'zgargan — qiymat so'rov bilan ketadi, maydon ajralib tursin. */
  highlighted: boolean;
}) {
  const { control, formState, getValues, setValue } = useFormContext<EditOrderValues>();
  const branch = useQuery({
    queryKey: queryKeys.branchOperators,
    queryFn: ({ signal }) => fetchBranchOperators(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const branchList = useMemo(
    () => (Array.isArray(branch.data) ? branch.data : null),
    [branch.data],
  );
  const options = useMemo(
    () => commissionOptions(candidates, branchList),
    [candidates, branchList],
  );
  // Ro'yxat yo'q (eski backend) yoki yuklab bo'lmadi — qo'lda ID yagona yo'l.
  const allowManual = branch.data === null || branch.isError;

  // Buyurtmadan olingan standart operator filial ro'yxatida yo'q — server uni
  // rad etadi. Komissiya jimgina boshqa odamga yozilmasin: tanlov
  // bo'shatiladi va tarkib o'zgarsa forma logistdan tanlashni so'raydi.
  useEffect(() => {
    if (!branchList) return;
    const value = getValues("operatorId");
    if (value !== null && !branchList.some((person) => person.id === value)) {
      setValue("operatorId", null);
    }
  }, [branchList, getValues, setValue]);

  const error = formState.errors.operatorId?.message;

  return (
    <EditField id="edit-operator" label="Komissiya egasi (operator)" error={error}>
      <Controller
        control={control}
        name="operatorId"
        render={({ field }) => (
          <OperatorPicker
            options={options}
            value={field.value}
            onChange={field.onChange}
            invalid={Boolean(error)}
            highlighted={highlighted}
            allowManual={allowManual}
          />
        )}
      />
      <p className="text-ink-faint flex items-start gap-1.5 text-meta">
        <BadgePercent className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Buyurtma operator tavsiyasi orqali kelgan — tarkib o&apos;zgarsa komissiya shu operatorga
        yoziladi. Odatda o&apos;zgartirish shart emas.
      </p>
    </EditField>
  );
}

/**
 * Tanlov variantlari. Filial ro'yxati bor bo'lsa — faqat undagilar
 * (buyurtmadagi nomzodlar birinchi, o'z yorlig'i bilan); yo'q bo'lsa —
 * buyurtmadagi nomzodlar.
 */
function commissionOptions(
  candidates: OperatorCandidate[],
  branchList: PersonRef[] | null,
): OperatorCandidate[] {
  if (!branchList) return candidates;
  const options: OperatorCandidate[] = [];
  for (const candidate of candidates) {
    const person = branchList.find((item) => item.id === candidate.id);
    if (person) options.push({ ...candidate, name: person.name || candidate.name });
  }
  for (const person of branchList) {
    if (person.id === null || options.some((item) => item.id === person.id)) continue;
    options.push({ id: person.id, name: person.name, phone: person.phone, source: "branch" });
  }
  return options;
}

function OperatorPicker({
  options,
  value,
  onChange,
  invalid,
  highlighted,
  allowManual,
}: {
  options: OperatorCandidate[];
  value: number | null;
  onChange: (value: number | null) => void;
  invalid: boolean;
  highlighted: boolean;
  allowManual: boolean;
}) {
  const known = value !== null && options.some((option) => option.id === value);
  const [manualChosen, setManual] = useState(false);
  // Qo'lda kiritish faqat ro'yxat bo'lmaganda: aks holda server baribir rad etadi.
  const manual = allowManual && (manualChosen || (value !== null && !known));
  const [draft, setDraft] = useState(value !== null && !known ? String(value) : "");
  const ringClass = highlighted ? "border-amber bg-amber-soft" : "";

  if (manual) {
    return (
      <div className="flex gap-1.5">
        <input
          id="edit-operator"
          inputMode="numeric"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onChange(parseOperatorId(event.target.value));
          }}
          placeholder="Operator ID, masalan 7"
          aria-invalid={invalid}
          aria-describedby={invalid ? "edit-operator-error" : undefined}
          className={cn(editInputClass, "tabular", ringClass)}
        />
        {options.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setManual(false);
              onChange(options[0]?.id ?? null);
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
      value={known ? String(value) : ""}
      onValueChange={(next) => {
        // Radix ba'zan bo'sh qiymat bilan chaqiradi (forma reset) — tanlov yo'qolmasin.
        if (!next) return;
        if (next === MANUAL) {
          setManual(true);
          setDraft("");
          onChange(null);
          return;
        }
        onChange(Number(next));
      }}
    >
      <SelectTrigger
        id="edit-operator"
        aria-invalid={invalid}
        className={cn("h-9 w-full", ringClass)}
      >
        <SelectValue placeholder="Operatorni tanlang" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            <span data-no-translit>{option.name || `Operator #${option.id}`}</span>
            {" · "}
            {OPERATOR_SOURCE_LABELS[option.source]}
          </SelectItem>
        ))}
        {allowManual ? <SelectItem value={MANUAL}>ID ni qo&apos;lda kiritish…</SelectItem> : null}
      </SelectContent>
    </Select>
  );
}
