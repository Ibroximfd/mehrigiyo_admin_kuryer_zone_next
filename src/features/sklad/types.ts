import {
  asArray,
  asBool,
  asInt,
  asOptionalInt,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";
import { mapItemRef } from "@/lib/item-ref";
import type { ItemRef } from "@/lib/item-ref";

/**
 * Sklad (`21_TUZILMA_V2` §5; TZ 32 S bloki — `SKLAD_S_BLOK_2026-11-01`): bosh kuryer faqat ko'radi.
 *   • `GET sklad/me/` — `sklad {id, name, regions}` yoki `null` (biriktirilmagan — XATO EMAS, §10.1);
 *   • `GET sklad/sklads/` — faqat o'z skladi; bosh kuryerlar `chiefs[]` da (§1.1);
 *   • `GET sklad/stock/` — o'z skladi omborlari (`region`) va kuryerlari ombori (`courier`);
 *   • `GET sklad/couriers/` — o'z kuryerlari.
 * Ko'rishni asosiy filial B.L i dopusk bilan boshqaradi (`warehouse.view_courier_stores`,
 * `sklad/me.warehouse_permissions.view`).
 */

export type SkladChief = { id: number; fullName: string };

export type SkladInfo = {
  id: number;
  name: string;
  regions: string[];
  /** Biriktirilgan bosh kuryerlar — `chiefs[]` (bir nechta bo'lishi mumkin). */
  chiefs: SkladChief[];
};

/** `sklad/me/` — bosh kuryerga biriktirilgan sklad. */
export type SkladMe = {
  /** `null` — sklad biriktirilmagan yoki yopilgan (§10.1, §10.2). */
  sklad: { id: number; name: string; regions: string[] } | null;
  /** `warehouse_permissions.view` — `false` bo'lsa sklad yopiq; maydon yo'q (eski backend) — ochiq. */
  canView: boolean;
};

function codes(value: unknown): string[] {
  return asArray(value)
    .map((code) => asString(code))
    .filter(Boolean);
}

/**
 * Yangi backend `sklad` obyektini beradi; eski (prod) — faqat `sklad_id` + `regions`.
 * ⚠️ `region` ga ishonilmaydi (§10.1): skladsiz bosh kuryerda ham to'ldirilgan bo'lishi
 * mumkin. Yagona belgi — `sklad == null` (eski javobda `sklad_id == null`).
 */
export function mapSkladMe(raw: unknown): SkladMe {
  const json = asRecord(raw);
  const permissions = isRecord(json.warehouse_permissions) ? json.warehouse_permissions : null;
  const canView = permissions ? asBool(permissions.view, true) : true;
  if ("sklad" in json) {
    const sklad = isRecord(json.sklad) ? json.sklad : null;
    const id = sklad ? asOptionalInt(sklad.id) : null;
    return {
      sklad:
        sklad && id !== null
          ? { id, name: asString(sklad.name), regions: codes(sklad.regions).length ? codes(sklad.regions) : codes(json.regions) }
          : null,
      canView,
    };
  }
  const skladId = asOptionalInt(json.sklad_id);
  return { sklad: skladId === null ? null : { id: skladId, name: "", regions: codes(json.regions) }, canView };
}

/** `chiefs[]` — haqiqat manbai; eski javobda faqat `chief` (bitta yoki `null`). */
function mapChiefs(row: Record<string, unknown>): SkladChief[] {
  const list = Array.isArray(row.chiefs) ? row.chiefs : isRecord(row.chief) ? [row.chief] : [];
  return list.filter(isRecord).map((chief) => ({ id: asInt(chief.id), fullName: asString(chief.full_name) }));
}

/**
 * `sklads/` — server bosh kuryerga faqat o'z skladini beradi (§10). `me.sklad.id`
 * bo'yicha tanlanadi: begona qator (himoya) baribir chizilmaydi. Ro'yxat bo'sh bo'lsa —
 * `sklad/me` dagi nom va viloyatlar (ikkinchi so'rovsiz, §13).
 */
export function mapOwnSklad(raw: unknown, me: SkladMe["sklad"]): SkladInfo | null {
  if (!me) return null;
  const list = (Array.isArray(raw) ? raw : asArray(asRecord(raw).results)).filter(isRecord);
  const own = list.find((row) => asOptionalInt(row.id) === me.id);
  if (!own) return { ...me, chiefs: [] };
  const regions = codes(own.regions);
  return {
    id: me.id,
    name: asString(own.name) || me.name,
    regions: regions.length ? regions : me.regions,
    chiefs: mapChiefs(own),
  };
}

/** Sklad hodisasi (`/ws/sklad/`, §11): bosh kuryer o'rni boshqa skladga o'tdi yoki uzildi. */
export type SkladChangedEvent = { chiefId: number; skladId: number | null };

export function parseSkladChanged(raw: unknown): SkladChangedEvent | null {
  const json = asRecord(raw);
  if (json.type !== "sklad_changed") return null;
  const chiefId = asOptionalInt(json.chief_id);
  return chiefId === null ? null : { chiefId, skladId: asOptionalInt(json.sklad_id) };
}

export type CourierStock = {
  courier: { id: number; fullName: string; onShift: boolean };
  onHand: number;
  items: Array<{ item: ItemRef; quantity: number }>;
};

export function mapCourierStock(raw: unknown): CourierStock {
  const json = asRecord(raw);
  return {
    courier: {
      id: asInt(json.id),
      fullName: asString(json.full_name),
      onShift: asBool(json.on_shift),
    },
    onHand: asInt(json.on_hand),
    items: asArray(json.items)
      .map((entry) => {
        const row = asRecord(entry);
        return { item: mapItemRef(row.item), quantity: asInt(row.quantity) };
      })
      .filter((row) => row.quantity > 0),
  };
}

/** `stock/` qatori: ombor × mahsulot. */
export type StockCell = {
  kind: "region" | "courier";
  item: ItemRef;
  onHand: number;
  minQuantity: number;
  isLow: boolean;
};

export function mapStockCell(raw: unknown): StockCell {
  const json = asRecord(raw);
  return {
    kind:
      asString(asRecord(json.location).kind) === "courier"
        ? "courier"
        : "region",
    item: mapItemRef(json.item),
    onHand: asInt(json.on_hand),
    minQuantity: asInt(json.min_quantity),
    isLow: asBool(json.is_low),
  };
}

/** Sklad qoldig'i mahsulot bo'yicha (faqat sklad omborlari, kuryerlarnikisiz). */
export type SkladStockRow = {
  item: ItemRef;
  inSklad: number;
  withCouriers: number;
  isLow: boolean;
};

/** Sklad qoldig'i: `region` omborlari mahsulot bo'yicha yig'iladi, kuryerlardagi — kuryerlar omboridan. */
export function skladStockRows(
  cells: readonly StockCell[],
  couriers: readonly CourierStock[],
): SkladStockRow[] {
  const regionCells = cells.filter((cell) => cell.kind === "region");
  const byItem = new Map<number, SkladStockRow>();
  // Sklad bitta (model «a»): birlashgan viloyat omborlari bo'sh qoladi va o'zi «kam» deb
  // belgilanadi. Shuning uchun «kam» — yig'indi bo'yicha: jami qoldiq eng katta minimumdan past.
  const minByItem = new Map<number, number>();
  for (const cell of regionCells) {
    const row = byItem.get(cell.item.id) ?? {
      item: cell.item,
      inSklad: 0,
      withCouriers: 0,
      isLow: false,
    };
    byItem.set(cell.item.id, { ...row, inSklad: row.inSklad + cell.onHand });
    minByItem.set(
      cell.item.id,
      Math.max(minByItem.get(cell.item.id) ?? 0, cell.minQuantity),
    );
  }
  for (const [id, row] of byItem) {
    const min = minByItem.get(id) ?? 0;
    byItem.set(id, { ...row, isLow: min > 0 && row.inSklad < min });
  }
  for (const stock of couriers) {
    for (const entry of stock.items) {
      const row = byItem.get(entry.item.id);
      if (row)
        byItem.set(entry.item.id, {
          ...row,
          withCouriers: row.withCouriers + entry.quantity,
        });
    }
  }
  return [...byItem.values()].sort((a, b) =>
    a.item.name.localeCompare(b.item.name),
  );
}

export type ChiefSklad =
  /** Sklad biriktirilmagan — bo'sh holat, xato emas (§10.1). */
  | { kind: "unassigned" }
  /** `warehouse_permissions.view: false` — sklad menyusi yopiq (§5.2). */
  | { kind: "forbidden" }
  | { kind: "ready"; sklad: SkladInfo; stock: SkladStockRow[]; couriers: CourierStock[] };
