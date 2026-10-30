/**
 * Buyurtmani kim yaratgani (`created_by.kind`, `02` §3) — nomlar bir joyda.
 * Nishonchaning o'zi `components/creator-badge.tsx` da; bu yerda faqat matn,
 * ya'ni CSV va boshqa matnli joylar komponentsiz ishlaydi.
 */
const CREATOR_KIND_LABELS: Record<string, string> = {
  operator: "Operator",
  admin: "Admin",
  doctor: "Shifokor",
  client: "Mijoz o'zi",
  reception: "Registratura",
  sino_ai: "Sino AI",
};

export function creatorKindLabel(kind: string | null | undefined): string {
  const key = (kind ?? "").trim().toLowerCase();
  if (!key) return "";
  return CREATOR_KIND_LABELS[key] ?? key;
}
