"use client";

import { CallButton } from "@/components/kit/call-button";
import { CopyButton } from "@/components/kit/copy-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Mijozning barcha telefonlari (`client.phones`, 05 §4).
 *
 * `compact` — kartochka/qator: birinchi raqam + qo'ng'iroq, qolganlari
 * `+N` tugmasi ostidagi ro'yxatda (har birida 📞 va nusxa). To'liq
 * ko'rinish — detal: hamma raqam qatorma-qator.
 *
 * Bitta raqam bo'lsa `+N` chiqmaydi — eski javob bilan ko'rinish o'zgarmaydi.
 */
export function PhoneList({
  phones,
  compact = false,
  className,
}: {
  phones: string[];
  compact?: boolean;
  className?: string;
}) {
  if (phones.length === 0) return null;

  if (!compact) {
    return (
      <ul className={cn("flex flex-col gap-0.5", className)}>
        {phones.map((phone) => (
          <li key={phone} className="flex items-center gap-1">
            <PhoneCopy phone={phone} />
            <CallButton phone={phone} />
          </li>
        ))}
      </ul>
    );
  }

  const [first, ...rest] = phones;

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-0.5", className)}>
      <span className="tabular truncate">{formatPhone(first)}</span>
      <CallButton phone={first} />
      {rest.length > 0 ? (
        <Popover>
          <PopoverTrigger
            onClick={(event) => event.stopPropagation()}
            title={rest.map(formatPhone).join(", ")}
            aria-label={`Yana ${rest.length} ta telefon raqam`}
            className="bg-subtle text-ink-muted hover:text-brand hover:bg-brand-soft tabular rounded-full px-1.5 text-micro font-semibold transition-colors"
          >
            +{rest.length}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-auto min-w-52 p-2"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-ink-faint px-1 pb-1 text-fine font-medium tracking-wide uppercase">
              Barcha telefonlar
            </p>
            <ul className="flex flex-col gap-0.5">
              {phones.map((phone) => (
                <li key={phone} className="flex items-center gap-1">
                  <PhoneCopy phone={phone} />
                  <CallButton phone={phone} />
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ) : null}
    </span>
  );
}

function PhoneCopy({ phone }: { phone: string }) {
  return (
    <CopyButton
      value={formatPhone(phone)}
      label="Telefon raqamni nusxalash"
      successMessage="Telefon raqami nusxalandi"
      className="-ml-1.5"
    >
      <span className="text-ink tabular text-body font-medium">
        {formatPhone(phone)}
      </span>
    </CopyButton>
  );
}
