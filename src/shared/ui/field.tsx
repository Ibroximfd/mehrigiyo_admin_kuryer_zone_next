"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

import { Label } from "./label";

export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
};

/**
 * Yorliq + izoh + xato simlari bitta joyda: hech bir maydon `htmlFor`,
 * `aria-describedby` yoki `aria-invalid` ni unutolmaydi.
 */
export function Field({
  label,
  hint,
  error,
  optionalLabel,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optionalLabel?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optionalLabel ? <span className="ml-1 font-normal text-ink-faint">({optionalLabel})</span> : null}
      </Label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint ? (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Guruh (radio/checkbox ro'yxati) uchun: `fieldset` + `legend`. */
export function FieldSet({
  legend,
  hint,
  error,
  className,
  children,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={cn("flex min-w-0 flex-col gap-2", className)}>
      <legend className="mb-1 text-sm font-medium text-ink">{legend}</legend>
      {hint ? <p className="-mt-1 text-xs text-ink-faint">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
