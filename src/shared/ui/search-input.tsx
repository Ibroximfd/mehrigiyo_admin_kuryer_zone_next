"use client";

import { Search, X } from "lucide-react";
import type { ComponentProps } from "react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";

import { inputClassName } from "./input";

type SearchInputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function SearchInput({ value, onValueChange, className, placeholder, ...props }: SearchInputProps) {
  const t = useT();
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder ?? t.common.search}
        className={cn(inputClassName, "pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden")}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label={t.common.clear}
          className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-md text-ink-faint outline-none transition hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 sm:size-8"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
