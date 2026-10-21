"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";
import { inputClassName } from "@/shared/ui/input";

import { validateNameEdit, type DistrictNameField } from "../model/district";

type Status = "idle" | "saving" | "saved";

type InlineNameInputProps = {
  field: DistrictNameField;
  value: string;
  label: string;
  onCommit: (value: string) => Promise<unknown>;
  disabled?: boolean;
  className?: string;
};

/**
 * Jadval katagidagi nom tahriri: Enter yoki tashqariga bosish — saqlash,
 * Escape — bekor qilish. Lotin nomi bo'sh bo'lsa saqlanmaydi va eski nom
 * qaytadi. Server qiymati o'zgarsa (optimistik yangilash yoki rollback)
 * qoralama ham unga tenglashadi.
 */
export function InlineNameInput({ field, value, label, onCommit, disabled, className }: InlineNameInputProps) {
  const t = useT();
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    // Prop o'zgarganda holatni render paytida moslash (effekt va qo'shimcha render siz).
    setSyncedValue(value);
    setDraft(value);
  }
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState(false);
  const skipNextBlur = useRef(false);

  const commit = async () => {
    const verdict = validateNameEdit(field, draft, value);
    if (verdict === "unchanged") {
      setDraft(value);
      return;
    }
    if (verdict === "required") {
      setInvalid(true);
      setDraft(value);
      return;
    }
    setInvalid(false);
    setStatus("saving");
    try {
      await onCommit(draft.trim());
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("idle");
      setDraft(value);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={draft}
        disabled={disabled}
        placeholder={t.common.none}
        onChange={(event) => {
          setDraft(event.target.value);
          if (invalid) setInvalid(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            skipNextBlur.current = true;
            setDraft(value);
            setInvalid(false);
            event.currentTarget.blur();
          }
        }}
        onBlur={() => {
          if (skipNextBlur.current) {
            skipNextBlur.current = false;
            return;
          }
          void commit();
        }}
        className={cn(
          inputClassName,
          "pr-9 sm:h-9",
          "border-transparent bg-transparent hover:border-line focus-visible:bg-surface",
          invalid && "border-danger",
        )}
      />
      <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2" aria-live="polite">
        {status === "saving" ? <LoaderCircle className="size-4 animate-spin text-ink-faint" aria-label={t.common.saving} /> : null}
        {status === "saved" ? <Check className="size-4 text-ok" aria-label={t.districts.saved} /> : null}
      </span>
      {invalid ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {t.districts.nameRequired}
        </p>
      ) : null}
    </div>
  );
}
