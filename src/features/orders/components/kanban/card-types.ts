import type { CardAckState } from "@/features/orders/components/kanban/ack-parts";
import type { LogistOrder } from "@/features/orders/types";

/** Kartochkadagi amallar — hammasi chaqiruvchida (doska), kartochka faqat so'raydi. */
export type CardActions = {
  onOpen: (order: LogistOrder) => void;
  /** `confirmed → shipping`: kuryer + cheklist oynasi. */
  onShip: (order: LogistOrder) => void;
  /** Sudramasdan keyingi bosqich (`shipping → delivered`). */
  onAdvance: (order: LogistOrder) => void;
  onEdit: (order: LogistOrder) => void;
  /** Sabab so'raydigan o'tish (qaytarish / tiklash). */
  onRequestReason: (order: LogistOrder, toStatus: string) => void;
  onToggleSelect?: (id: string) => void;
  /** Buyurtma chatini ochish (`?discuss=`). */
  onDiscuss?: (orderId: string) => void;
};

export type CardProps = {
  order: LogistOrder;
  locked: boolean;
  selected: boolean;
  /** Kamida bitta kartochka tanlangan — katakchalar doim ko'rinadi. */
  selectionActive: boolean;
  actions: CardActions;
  /** "Yangi" / "Oldim" holati; berilmasa (masalan ro'yxat) — belgisiz. */
  ack?: CardAckState;
};
