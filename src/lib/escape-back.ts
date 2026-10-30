/**
 * Esc — ichki sahifadan bir pog'ona ortga (logist so'rovi, 2026-10-29).
 * Ota sahifa aniq ro'yxatda: tasodifiy «orqaga» boshqa saytga olib
 * ketmasin. Filial/sana filtri (`filial`, `from`, `to`) ota sahifaga ham
 * o'tadi — logist o'sha davrga qaytadi.
 */
const PARENTS: Record<string, string> = {
  "/sklad/courier": "/sklad/couriers",
  "/sklad/couriers": "/sklad",
  "/sklad/items": "/sklad",
  "/sklad/ledger": "/sklad",
  "/moliya/operator": "/moliya/operators",
  "/moliya/operators": "/moliya",
  "/moliya/settings": "/moliya",
  "/chief/couriers": "/chief",
  "/chief/zones": "/chief",
  "/chief/cash": "/chief",
  "/chief/stats": "/chief",
};

const KEPT_PARAMS = ["filial", "from", "to"];

/** Ota sahifa manzili yoki `null` (yuqori darajali sahifa — Esc hech narsa qilmaydi). */
export function escapeTarget(pathname: string, search: string): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const parent = PARENTS[path];
  if (!parent) return null;
  const current = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const key of KEPT_PARAMS) {
    const value = current.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  return query ? `${parent}?${query}` : parent;
}

/** Ochiq oyna, menyu yoki popover bo'lsa Esc ularni yopadi — sahifa joyida qoladi. */
export function hasOpenOverlay(root: ParentNode = document): boolean {
  return Boolean(
    root.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'),
  );
}
