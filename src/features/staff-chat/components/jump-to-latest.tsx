"use client";

import { ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "Eng oxiriga tushish" tugmasi — lenta tepaga surilganda pastki o'ng
 * burchakda suzib chiqadi. Yashiringanida bosib ham, Tab bilan ham
 * yetib bo'lmaydi.
 */
export function JumpToLatest({
  visible,
  count = 0,
  onClick,
}: {
  visible: boolean;
  /** Tepada o'qib turganda kelgan yangi xabarlar soni. */
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={
        count > 0
          ? `${count} ta yangi xabar — pastga tushish`
          : "Eng oxirgi xabarga tushish"
      }
      title={
        count > 0
          ? `${count} ta yangi xabar — pastga tushish`
          : "Eng oxirgi xabarga tushish"
      }
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
      className={cn(
        "border-line bg-elevated text-ink-muted elev-3 absolute right-4 bottom-4 z-10",
        "flex size-10 items-center justify-center rounded-full border",
        "transition-[opacity,translate,box-shadow,color] duration-200 ease-out",
        "hover:text-brand hover:elev-4",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowDown className="size-4.5" />

      {count > 0 ? (
        <span className="bg-unread text-unread-ink tabular ring-elevated absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-fine font-bold ring-2">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );
}
