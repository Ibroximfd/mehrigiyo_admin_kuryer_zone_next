import { Smartphone, SmartphoneNfc } from "lucide-react";

import { CARD_TAG } from "@/features/orders/components/kanban/card-parts";
import { appPresence, appUnavailableTooltip } from "@/features/orders/confirmation";
import type { ClientInfo } from "@/features/orders/types";
import { cn } from "@/lib/utils";

/**
 * Mijozning ilova holati (shartnoma §1–§2): bor — yashil, yo'q — kulrang,
 * o'rnatib bo'lmaydi — sariq (tooltip: sabab · izoh · kim · qachon).
 *
 * "Imkoni bo'lmadi" — oddiy "ilova yo'q" EMAS: alohida (sariq) holat, har
 * joyda to'liq matn bilan chiziladi.
 * `compact` — kanban kartochkasi: "ilova yo'q" ko'rsatilmaydi (kartochkada
 * shovqin), qolgan ikkisi qisqa matn bilan.
 */
export function AppPresenceTag({
  client,
  compact = false,
  className,
}: {
  client: Pick<ClientInfo, "hasApp" | "appUnavailable">;
  compact?: boolean;
  className?: string;
}) {
  const presence = appPresence(client);
  if (!presence || (compact && presence === "none")) return null;

  if (presence === "unavailable") {
    return (
      <span
        title={appUnavailableTooltip(client.appUnavailable)}
        className={cn(CARD_TAG, "bg-amber-soft text-gold", className)}
      >
        <Smartphone className="size-3" aria-hidden />
        Ilovani o&apos;rnatish imkoni bo&apos;lmadi
      </span>
    );
  }

  const has = presence === "has";
  return (
    <span className={cn(CARD_TAG, has ? "bg-ok-soft text-ok" : "bg-subtle text-ink-faint", className)}>
      <SmartphoneNfc className="size-3" aria-hidden />
      {has ? (compact ? "ilova" : "ilova bor") : "ilova yo'q"}
    </span>
  );
}
