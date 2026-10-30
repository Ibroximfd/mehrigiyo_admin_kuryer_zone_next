import { describe, expect, it } from "vitest";

import {
  liveCounters,
  mapHrefFromArea,
  mapRedirectHref,
  matchesLiveStatus,
  parseLiveStatus,
  pillPlacements,
  sortLiveCouriers,
  visibleLiveStatuses,
} from "./live-map-view";
import { mapLiveCourier } from "./live-tracking";

const NOW = new Date("2026-10-17T10:00:00Z");
const ago = (s: number) => new Date(NOW.getTime() - s * 1000).toISOString();

function courier(id: number, name: string, extra: Record<string, unknown> = {}) {
  return mapLiveCourier({ id, full_name: name, phone: "998", on_shift: true, ...extra });
}

const moving = courier(1, "Aziz Karimov", { last_location: { lat: 41, lng: 69, at: ago(10), speed: 8 } });
const standing = courier(2, "Bobur Aliyev", { last_location: { lat: 41, lng: 69, at: ago(120), speed: 0 } });
const lost = courier(3, "Davron Olimov", { last_location: { lat: 41, lng: 69, at: ago(900), speed: 9 } });
const fraud = courier(4, "Erkin Usmonov", {
  last_location: { lat: 41, lng: 69, at: ago(30) },
  alerts: ["mock_location"],
});
const offShift = courier(5, "Farhod Nazarov", { on_shift: false });

describe("hisoblagichlar va holat filtri", () => {
  it("sukut ro'yxatida hamma smenada; harakatda — yangi nuqta + tezlik; aloqa yo'q — 5 daqiqadan ko'p", () => {
    expect(liveCounters([moving, standing, lost, fraud], NOW, false)).toEqual({ shift: 4, moving: 1, lost: 1, offshift: 0 });
  });

  it("`all=1` — smena belgisi hisobga olinadi; smenadan tashqaridagi aloqa yo'q sanalmaydi", () => {
    expect(liveCounters([moving, offShift], NOW, true)).toEqual({ shift: 1, moving: 1, lost: 0, offshift: 1 });
    expect(liveCounters([moving, offShift], NOW, false)).toEqual({ shift: 2, moving: 1, lost: 1, offshift: 0 });
  });

  it("xaritadagi yagona smenadan tashqari kuryer hisoblagichda ko'rinadi (0·0·0 emas)", () => {
    const parked = courier(7, "Ibroxim Toshev", {
      on_shift: false,
      last_location: { lat: 41, lng: 69, at: ago(3600), speed: 0 },
    });
    const counters = liveCounters([parked], NOW, true);
    expect(counters).toEqual({ shift: 0, moving: 0, lost: 0, offshift: 1 });
    expect(matchesLiveStatus(parked, "offshift", NOW, true)).toBe(true);
    expect(matchesLiveStatus(parked, "offshift", NOW, false)).toBe(false);
  });

  it("\"Smenadan tashqari\" chipi faqat almashtirgich yoqilganda", () => {
    expect(visibleLiveStatuses(false)).toEqual(["shift", "moving", "lost"]);
    expect(visibleLiveStatuses(true)).toEqual(["shift", "moving", "lost", "offshift"]);
    expect(parseLiveStatus("offshift", false)).toBeNull();
    expect(parseLiveStatus("offshift", true)).toBe("offshift");
  });

  it("filtr hisoblagich bilan bir xil qoidada", () => {
    const list = [moving, standing, lost, fraud];
    expect(list.filter((c) => matchesLiveStatus(c, "moving", NOW, false)).map((c) => c.id)).toEqual([1]);
    expect(list.filter((c) => matchesLiveStatus(c, "lost", NOW, false)).map((c) => c.id)).toEqual([3]);
    expect(list.filter((c) => matchesLiveStatus(c, null, NOW, false))).toHaveLength(4);
  });

  it("URL qiymati", () => {
    expect(parseLiveStatus("moving")).toBe("moving");
    expect(parseLiveStatus("bogus")).toBeNull();
    expect(parseLiveStatus(null)).toBeNull();
  });
});

describe("ro'yxat tartibi", () => {
  it("aldov → ogohlantirish → yangilik → so'nggi nuqta", () => {
    const warned = courier(6, "Gulom", { last_location: { lat: 41, lng: 69, at: ago(5) }, alerts: ["gps_off"] });
    const ids = sortLiveCouriers([lost, standing, moving, warned, fraud], NOW).map((c) => c.id);
    expect(ids).toEqual([4, 6, 1, 2, 3]);
  });

  it("asl ro'yxat o'zgarmaydi", () => {
    const list = [lost, moving];
    sortLiveCouriers(list, NOW);
    expect(list.map((c) => c.id)).toEqual([3, 1]);
  });
});

describe("ism yorliqlari to'qnashuvi", () => {
  it("uzoq markerlar — hammasi pastda", () => {
    const placement = pillPlacements([
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 100, y: 0 },
    ]);
    expect([...placement.values()]).toEqual(["below", "below"]);
  });

  it("~20 px ichida — pastdagi qo'shni bo'lsa tepaga chiqadi", () => {
    const placement = pillPlacements([
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 5, y: 10 },
      { id: 3, x: 8, y: 14 },
    ]);
    expect(placement.get(1)).toBe("below");
    expect(placement.get(2)).toBe("above");
    expect(placement.get(3)).toBe("above");
  });
});

describe("eski havolalar → /map", () => {
  const params = (query: string) => new URLSearchParams(query);

  it("view=map — track, day, offshift va hudud saqlanadi, qolgani tashlanadi", () => {
    expect(
      mapRedirectHref("/map", params("view=map&track=7&day=2026-10-16&offshift=true&region=tashkent&zone=3&district=chilonzor&shift=true")),
    ).toBe("/map?track=7&day=2026-10-16&offshift=true&region=tashkent&zone=3&district=chilonzor");
  });

  it("faqat track — ham ko'chadi; view=map yolg'iz — /map", () => {
    expect(mapRedirectHref("/map", params("track=9"))).toBe("/map?track=9");
    expect(mapRedirectHref("/map", params("view=map"))).toBe("/map");
  });

  it("oddiy kuryerlar sahifasi — ko'chirilmaydi", () => {
    expect(mapRedirectHref("/map", params(""))).toBeNull();
    expect(mapRedirectHref("/map", params("view=list&region=x"))).toBeNull();
  });

  it("'Xaritada ochish' hudud filtrini olib o'tadi", () => {
    expect(mapHrefFromArea("/map", { regions: ["r"], zones: [], districts: ["d"] })).toBe("/map?region=r&district=d");
    expect(mapHrefFromArea("/map", { regions: ["r", "q"], zones: ["7", "8"], districts: [] })).toBe(
      "/map?region=r%2Cq&zone=7%2C8",
    );
    expect(mapHrefFromArea("/map", { regions: [], zones: [], districts: [] })).toBe("/map");
  });
});
