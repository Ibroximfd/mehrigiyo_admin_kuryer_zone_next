import {
  asArray,
  asBool,
  asInt,
  asOptionalInt,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";

/**
 * Sklad (`21_TUZILMA_V2` §5; backend V7/V8, V16/V17): bosh kuryer faqat ko'radi.
 *   • `GET sklad/me/` — `sklad_id` va sklad viloyatlari (`regions`);
 *   • `GET sklad/sklads/` — faqat o'z skladi;
 *   • `GET sklad/stock/` — o'z skladi omborlari (`region`) va kuryerlari ombori (`courier`);
 *   • `GET sklad/couriers/` — o'z kuryerlari.
 * Ko'rishni asosiy filial B.L i dopusk bilan boshqaradi (`warehouse.view_courier_stores`).
 */

export type SkladInfo = { id: number; name: string; regions: string[] };

/** `sklad/me/` — bosh kuryerga biriktirilgan sklad va uning viloyatlari. */
export type SkladMe = {
  skladId: number | null;
  regions: string[];
  canWrite: boolean;
};

export function mapSkladMe(raw: unknown): SkladMe {
  const json = asRecord(raw);
  const regions = asArray(json.regions)
    .map((code) => asString(code))
    .filter(Boolean);
  const region = asString(json.region);
  return {
    skladId: asOptionalInt(json.sklad_id),
    regions: regions.length > 0 ? regions : region ? [region] : [],
    canWrite: asBool(json.can_write),
  };
}

/**
 * `sklads/` — server bosh kuryerga faqat o'z skladini beradi (V7). `sklad_id`
 * bo'yicha tanlanadi; bo'lmasa birinchisi (himoya: boshqasi baribir chizilmaydi).
 */
export function mapOwnSklad(
  raw: unknown,
  skladId: number | null,
): SkladInfo | null {
  const list = (
    Array.isArray(raw) ? raw : asArray(asRecord(raw).results)
  ).filter(isRecord);
  const own =
    skladId === null
      ? list[0]
      : list.find((row) => asOptionalInt(row.id) === skladId);
  if (!own) return null;
  return {
    id: asInt(own.id),
    name: asString(own.name),
    regions: asArray(own.regions)
      .map((code) => asString(code))
      .filter(Boolean),
  };
}

export type ItemRef = { id: number; name: string };

function mapItemRef(raw: unknown): ItemRef {
  const json = asRecord(raw);
  return { id: asInt(json.id), name: asString(json.name ?? json.title) };
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

export type ChiefSklad = {
  /** `null` — bosh kuryerga sklad biriktirilmagan. */
  sklad: SkladInfo | null;
  /** Sklad viloyatlari (`sklad/me`); sklad bo'lmasa bo'sh. */
  regions: string[];
  stock: SkladStockRow[];
  couriers: CourierStock[];
};
