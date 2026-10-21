"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { useT } from "@/shared/i18n/locale";
import { cn } from "@/shared/lib/utils";

import { inputClassName } from "./input";

export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("relative", className)}>
      <input type={visible ? "text" : "password"} className={cn(inputClassName, "pr-12")} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-md text-ink-faint outline-none transition hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 sm:size-9"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
