import { formatRelative, parseDate } from "@/lib/format";
import {
  asArray,
  asBool,
  asOptionalBool,
  asOptionalInt,
  asOptionalString,
  asRecord,
  asString,
  isRecord,
} from "@/lib/parse";
import {
  MATCH_NONE,
  makeSearchText,
  parseSearchQuery,
  scoreDigits,
  scoreText,
} from "@/lib/search";

import { mapAvatarUrl, parsePeerKind } from "./types";
import type { StaffChannel, StaffPeer, StaffPeerKind } from "./types";

/**
 * Jamoa chati — logistlar va kuryerlar (`HUDUD_BACKEND_TALABLAR_4.md` §1).
 *
 * Yangi tizim emas: mavjud xodimlar chatiga ikki kanal turi qo'shiladi —
 * `team` (hammaga bitta umumiy guruh) va `direct` (ikki kishilik). Bu yerda
 * faqat sof qoidalar: ro'yxatni bo'limlarga ajratish, shaxsiy chatlar
 * tartibi, a'zolar qidiruvi va lichkani "ochish yoki mavjudini topish".
 */

// ─────────────────────────────────────────────────────────────────────────────
// Kanal bo'limlari
// ─────────────────────────────────────────────────────────────────────────────

/** Ro'yxat bo'limi: "Jamoa" (group + team) · "Shaxsiy" · "Buyurtmalar". */
export type StaffChannelSection = "team" | "direct" | "order";

export function staffChannelSection(channel: Pick<StaffChannel, "kind">): StaffChannelSection {
  const kind = channel.kind.toLowerCase();
  if (kind === "team" || kind === "group") return "team";
  if (kind === "direct") return "direct";
  return "order";
}

export function isTeamChannel(channel: Pick<StaffChannel, "kind">): boolean {
  return channel.kind.toLowerCase() === "team";
}

export function isDirectChannel(channel: Pick<StaffChannel, "kind">): boolean {
  return channel.kind.toLowerCase() === "direct";
}

/** Shaxsiy chat sarlavhasi — suhbatdosh ismi; bo'lmasa kanal nomi. */
export function directTitle(channel: Pick<StaffChannel, "peer" | "title">): string {
  return channel.peer?.fullName.trim() || channel.title;
}

function lastAt(channel: StaffChannel): number {
  return parseDate(channel.lastMessage?.at)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

/**
 * Shaxsiy chatlar — Telegram'dagidek: oxirgi xabar yuqorida; xabarsiz
 * (endi ochilgan) chatlar oxirida, ism bo'yicha. Takroriy id bitta qoladi.
 */
export function sortDirectChannels(channels: readonly StaffChannel[]): StaffChannel[] {
  const unique = new Map<number, StaffChannel>();
  for (const channel of channels) {
    if (isDirectChannel(channel) && !unique.has(channel.id)) unique.set(channel.id, channel);
  }
  return [...unique.values()].sort(
    (a, b) => lastAt(b) - lastAt(a) || directTitle(a).localeCompare(directTitle(b)) || a.id - b.id,
  );
}

/** Buyurtma muhokamalari — server tartibida; jamoa va shaxsiylar chiqarib tashlanadi. */
export function orderChannelsOnly(channels: readonly StaffChannel[]): StaffChannel[] {
  return channels.filter((channel) => staffChannelSection(channel) === "order");
}

/** Shaxsiy chatlarni ism bo'yicha suzish (ro'yxatdagi qidiruv maydoni). */
export function filterDirectChannels(channels: readonly StaffChannel[], input: string): StaffChannel[] {
  const query = parseSearchQuery(input);
  if (!query) return [...channels];
  return channels.filter(
    (channel) => scoreText(makeSearchText(directTitle(channel)), query) > MATCH_NONE,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// A'zolar
// ─────────────────────────────────────────────────────────────────────────────

export type TeamMember = {
  id: number;
  kind: StaffPeerKind;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
  /** Serverdagi yorliq ("Logist", "Kuryer"); bo'lmasa turidan. */
  roleLabel: string;
  online: boolean;
  lastSeenAt: string | null;
  /** Faqat kuryerda; noma'lum — `null`. */
  onShift: boolean | null;
};

/**
 * A'zo holati matni. Xodimda `online`/`last_seen_at` hozircha `null`
 * keladi (`HUDUD_JAVOBLAR_4` §1) — shunda hech narsa yozilmaydi
 * ("oflayn" EMAS: noma'lum ≠ oflayn).
 */
export function memberStatusText(
  member: Pick<TeamMember, "online" | "onShift" | "lastSeenAt">,
): string | null {
  if (member.online) return "onlayn";
  if (member.onShift) return "smenada";
  const lastSeen = parseDate(member.lastSeenAt);
  return lastSeen ? formatRelative(lastSeen) : null;
}

export function memberKey(member: { kind: StaffPeerKind; id: number }): string {
  return `${member.kind}:${member.id}`;
}

export function mapTeamMember(raw: unknown): TeamMember | null {
  if (!isRecord(raw)) return null;
  const id = asOptionalInt(raw.id);
  if (id === null) return null;
  const kind = parsePeerKind(raw.kind);
  return {
    id,
    kind,
    fullName: asString(raw.full_name ?? raw.name),
    phone: asString(raw.phone),
    avatarUrl: mapAvatarUrl(raw.avatar),
    roleLabel: asOptionalString(raw.role_label)?.trim() || (kind === "courier" ? "Kuryer" : "Logist"),
    online: asBool(raw.online),
    lastSeenAt: asOptionalString(raw.last_seen_at),
    onShift: kind === "courier" ? asOptionalBool(raw.on_shift) : null,
  };
}

/** Javob massiv ham, `{members}` / `{results}` ham bo'lishi mumkin. */
export function mapTeamMembers(raw: unknown): TeamMember[] {
  const json = asRecord(raw);
  const items = Array.isArray(raw) ? raw : asArray(json.members ?? json.results);
  const seen = new Set<string>();
  const members: TeamMember[] = [];
  for (const item of items) {
    const member = mapTeamMember(item);
    if (!member || seen.has(memberKey(member))) continue;
    seen.add(memberKey(member));
    members.push(member);
  }
  return members;
}

/** Tartib: onlayn → logistlar → kuryerlar → ism. */
export function sortTeamMembers(members: readonly TeamMember[]): TeamMember[] {
  return [...members].sort(
    (a, b) =>
      Number(b.online) - Number(a.online) ||
      Number(a.kind === "courier") - Number(b.kind === "courier") ||
      a.fullName.localeCompare(b.fullName),
  );
}

/**
 * Ism yoki telefon bo'yicha (kirill/lotin farqi yo'q, `lib/search`).
 * Bo'sh so'rov — hammasi, tartiblangan.
 */
export function searchTeamMembers(members: readonly TeamMember[], input: string): TeamMember[] {
  const query = parseSearchQuery(input);
  if (!query) return sortTeamMembers(members);
  return members
    .map((member) => ({
      member,
      score: Math.max(
        scoreText(makeSearchText(member.fullName), query),
        scoreDigits(member.phone, query),
      ),
    }))
    .filter((hit) => hit.score > MATCH_NONE)
    .sort((a, b) => b.score - a.score || a.member.fullName.localeCompare(b.member.fullName))
    .map((hit) => hit.member);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shaxsiy chatni ochish (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

export type PeerRef = { kind: StaffPeerKind; id: number };

export function findDirectChannel(
  channels: readonly StaffChannel[],
  peer: PeerRef,
): StaffChannel | null {
  return (
    channels.find(
      (channel) =>
        isDirectChannel(channel) &&
        channel.peer?.id === peer.id &&
        channel.peer.kind === peer.kind,
    ) ?? null
  );
}

/**
 * "Xabar yozish": ro'yxatda shu odam bilan chat bo'lsa — o'sha ochiladi
 * (so'rovsiz); bo'lmasa `POST channels/direct/` (server ham idempotent).
 */
export type DirectOpenPlan =
  | { kind: "existing"; channel: StaffChannel }
  | { kind: "create"; peer: PeerRef };

export function planDirectOpen(channels: readonly StaffChannel[], peer: PeerRef): DirectOpenPlan {
  const existing = findDirectChannel(channels, peer);
  return existing ? { kind: "existing", channel: existing } : { kind: "create", peer };
}

/**
 * Server qaytargan kanal keshga qo'shiladi; o'sha id bo'lsa — almashtiriladi
 * (ikki marta bosish ikki qator yaratmaydi). Suhbatdosh javobda bo'lmasa
 * tanlangan a'zodan to'ldiriladi — sarlavha bo'sh qolmasin.
 */
export function upsertDirectChannel(
  channels: readonly StaffChannel[],
  channel: StaffChannel,
  fallbackPeer: StaffPeer | null = null,
): StaffChannel[] {
  const complete: StaffChannel =
    channel.peer || !fallbackPeer ? channel : { ...channel, peer: fallbackPeer };
  const index = channels.findIndex((item) => item.id === complete.id);
  if (index === -1) return [complete, ...channels];
  return channels.map((item, at) => (at === index ? { ...item, ...complete } : item));
}

/** A'zo → suhbatdosh (kanal javobida `peer` bo'lmasa). */
export function peerFromMember(member: TeamMember): StaffPeer {
  return {
    id: member.id,
    kind: member.kind,
    fullName: member.fullName,
    avatarUrl: member.avatarUrl,
    online: member.online,
    lastSeenAt: member.lastSeenAt,
  };
}
