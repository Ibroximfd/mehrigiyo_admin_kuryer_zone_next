/**
 * Sana so'zlari: `lib/format.ts` o'zbekcha `date-fns` locale'i bilan
 * chizadi (`24-avgust, dushanba`, `3 daqiqa oldin`), rus tilida esa shu
 * yerda almashtiriladi. Komponentlar sanani bir marta, lotinda chizadi —
 * til almashganda qayta chizish shart emas.
 */

const MONTHS: Record<string, [nominative: string, genitive: string]> = {
  yanvar: ["январь", "января"],
  fevral: ["февраль", "февраля"],
  mart: ["март", "марта"],
  aprel: ["апрель", "апреля"],
  may: ["май", "мая"],
  iyun: ["июнь", "июня"],
  iyul: ["июль", "июля"],
  avgust: ["август", "августа"],
  sentabr: ["сентябрь", "сентября"],
  sentyabr: ["сентябрь", "сентября"],
  oktabr: ["октябрь", "октября"],
  oktyabr: ["октябрь", "октября"],
  noyabr: ["ноябрь", "ноября"],
  dekabr: ["декабрь", "декабря"],
};

/** Grafik o'qidagi qisqa shakl (`24-avg`) — `statistics/page.tsx` shunday kesadi. */
const SHORT_MONTHS: Record<string, string> = {
  yan: "янв",
  fev: "фев",
  mar: "мар",
  apr: "апр",
  may: "мая",
  iyun: "июн",
  iyul: "июл",
  avg: "авг",
  sen: "сен",
  okt: "окт",
  noy: "ноя",
  dek: "дек",
};

const WEEKDAYS: Record<string, string> = {
  dushanba: "понедельник",
  seshanba: "вторник",
  chorshanba: "среда",
  payshanba: "четверг",
  juma: "пятница",
  shanba: "суббота",
  yakshanba: "воскресенье",
};

const MONTH_NAMES = Object.keys(MONTHS).join("|");
const WEEKDAY_NAMES = Object.keys(WEEKDAYS).join("|");

/** `24-avgust`, `24 avgust`, `24-avgust 2026` → oy qaratqich kelishigida. */
const DAY_MONTH = new RegExp(`\\b(\\d{1,2})[-\\s](${MONTH_NAMES})\\b`, "gi");
/** Yolg'iz oy nomi (`Avgust 2026`) — bosh kelishik. */
const MONTH_ONLY = new RegExp(`\\b(${MONTH_NAMES})\\b`, "gi");
const WEEKDAY = new RegExp(`\\b(${WEEKDAY_NAMES})\\b`, "gi");
const DAY_SHORT_MONTH = new RegExp(
  `\\b(\\d{1,2})-(${Object.keys(SHORT_MONTHS).join("|")})\\b`,
  "gi",
);

function keepCase(source: string, target: string): string {
  return source.charAt(0) === source.charAt(0).toUpperCase()
    ? target.charAt(0).toUpperCase() + target.slice(1)
    : target;
}

/** Oy va hafta kunlarini rus tiliga o'giradi; hech narsa topilmasa `null`. */
export function russianDateWords(text: string): string | null {
  if (!/[a-z]/i.test(text)) return null;

  let changed = false;
  let out = text.replace(DAY_MONTH, (_whole, day: string, month: string) => {
    changed = true;
    return `${day} ${MONTHS[month.toLowerCase()]![1]}`;
  });
  out = out.replace(DAY_SHORT_MONTH, (_whole, day: string, month: string) => {
    changed = true;
    return `${day} ${SHORT_MONTHS[month.toLowerCase()]!}`;
  });
  out = out.replace(MONTH_ONLY, (word: string) => {
    changed = true;
    return keepCase(word, MONTHS[word.toLowerCase()]![0]);
  });
  out = out.replace(WEEKDAY, (word: string) => {
    changed = true;
    return keepCase(word, WEEKDAYS[word.toLowerCase()]!);
  });
  return changed ? out : null;
}
