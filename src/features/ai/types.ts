import { parseDate } from "@/lib/format";
import { asArray, asInt, asOptionalInt, asOptionalString, asRecord, asString } from "@/lib/parse";
import { ROUTES } from "@/lib/routes";

/**
 * AI tahlil — qoidaga asoslangan topilmalar (`18_SKLAD…` §9). AI hech
 * narsani o'zgartirmaydi, faqat ko'rsatadi; har kartada tegishli ekranga
 * tugma.
 */
export type Severity = "urgent" | "attention" | "good";

export const SEVERITIES: Array<{ value: Severity; label: string; color: string }> = [
  { value: "urgent", label: "Shoshilinch", color: "var(--danger)" },
  { value: "attention", label: "E'tibor", color: "var(--warn)" },
  { value: "good", label: "Yaxshi", color: "var(--ok)" },
];

export function severityInfo(value: Severity) {
  return SEVERITIES.find((entry) => entry.value === value) ?? SEVERITIES[1]!;
}

export const AREAS: Record<string, string> = {
  stock: "Sklad",
  finance: "Moliya",
  operators: "Operatorlar",
  couriers: "Kuryerlar",
  leads: "Lidlar",
  cancels: "Otkazlar",
};

export function areaLabel(area: string): string {
  return AREAS[area] ?? area;
}

export type FindingLink = {
  screen: string;
  region: string | null;
  courierId: number | null;
  operatorId: number | null;
  itemId: number | null;
};

export type Finding = {
  id: string;
  severity: Severity;
  area: string;
  title: string;
  detail: string;
  fix: string | null;
  link: FindingLink | null;
};

export type AiReport = {
  generatedAt: Date | null;
  checked: string[];
  findings: Finding[];
};

function asSeverity(value: unknown): Severity {
  const text = asString(value);
  return text === "urgent" || text === "good" ? text : "attention";
}

export function mapAiReport(raw: unknown): AiReport {
  const json = asRecord(raw);
  return {
    generatedAt: parseDate(json.generated_at),
    checked: asArray(json.checked).map((entry) => asString(entry)),
    findings: asArray(json.findings).map((entry) => {
      const row = asRecord(entry);
      const link = row.link && typeof row.link === "object" ? asRecord(row.link) : null;
      return {
        id: asString(row.id ?? asInt(row.id)),
        severity: asSeverity(row.severity),
        area: asString(row.area),
        title: asString(row.title),
        detail: asString(row.detail),
        fix: asOptionalString(row.fix),
        link: link
          ? {
              screen: asString(link.screen),
              region: asOptionalString(link.region),
              courierId: asOptionalInt(link.courier_id),
              operatorId: asOptionalInt(link.operator_id),
              itemId: asOptionalInt(link.item_id),
            }
          : null,
      };
    }),
  };
}

/**
 * Topilma havolasi → sayt manzili. Notanish ekran — `null`, tugma
 * chizilmaydi. Davr filtri (`search`) Moliya/Analitika havolalariga qo'shiladi.
 */
export function findingHref(link: FindingLink | null, search = ""): { href: string; label: string } | null {
  if (!link) return null;
  switch (link.screen) {
    case "sklad_region":
      return { href: link.region ? ROUTES.skladRegion(link.region) : ROUTES.sklad, label: "Skladni ochish" };
    case "sklad_items":
      return { href: ROUTES.skladItems, label: "Mahsulotlarni ochish" };
    case "sklad_courier":
    case "courier":
      return { href: link.courierId ? ROUTES.skladCourier(link.courierId) : ROUTES.skladCouriers, label: "Kuryerni ochish" };
    case "moliya":
      return { href: `${ROUTES.moliya}${search}`, label: "Moliyani ochish" };
    case "moliya_operator":
    case "operator":
      return {
        href: link.operatorId ? ROUTES.moliyaOperator(link.operatorId, search) : `${ROUTES.moliyaOperators}${search}`,
        label: "Operatorni ochish",
      };
    case "analitika":
      return { href: `${ROUTES.analitika}${search}`, label: "Analitikani ochish" };
    default:
      return null;
  }
}
