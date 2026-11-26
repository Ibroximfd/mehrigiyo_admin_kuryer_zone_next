"use client";

import { SelectField } from "@/components/kit/select-field";

import { useSalesCenters } from "../use-sales-centers";

/**
 * «Markaz» tanlovi (136-javob §1) — bo'sh = hamma markaz. Markaz tanlovi
 * yo'q joyda (eski server, bog'lanmagan filial) chizilmaydi. Holat
 * chaqiruvchida (URL `?center=`), bu faqat maydon.
 */
export function CenterSelect({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  className?: string;
}) {
  const { centers, choice } = useSalesCenters();
  if (!choice || !centers) return null;
  return (
    <SelectField
      label="Markaz"
      allLabel="Hamma markaz"
      value={value === null ? null : String(value)}
      options={centers.map((center) => ({ value: String(center.id), label: center.name, translate: false }))}
      onChange={(next) => onChange(next === null ? null : Number(next))}
      className={className}
    />
  );
}
