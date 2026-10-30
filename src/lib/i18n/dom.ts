/**
 * Tanlangan tilni DOM'ga qo'llash.
 *
 * Komponentlarda `t("...")` chaqiruvi yo'q — matn o'zbek lotinida chiziladi
 * va shu yerda o'giriladi. Shu tufayli keyin qo'shiladigan har qanday matn
 * o'z-o'zidan qamrab olinadi (rus tili uchun esa lug'atga tushishi
 * `coverage.test.ts` da tekshiriladi).
 *
 * Ikki xil chetlatish bor va ular bir xil emas:
 *   `data-no-translit` — butun bo'lak tegilmaydi (mijoz matni, ism, telefon,
 *                        manzil, server ma'lumoti);
 *   quyidagi teglar    — ichidagi matn UI emas, lekin atributlari (masalan
 *                        `placeholder`) baribir o'giriladi.
 *
 * Asl (lotin) matn har tugun uchun eslab qolinadi: til almashganda avval
 * tiklanadi, keyin yangi til qo'llanadi — o'girish teskari bo'lmasa ham.
 */

/** Matn tarjima funksiyasi; `null` — tarjima o'chiq (lotin). */
export type TextConverter = (text: string) => string;

/** Matni o'giriladigan atributlar. */
export const TEXT_ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"];

/**
 * Ichidagi matn UI emas. SVG ro'yxatda yo'q — diagramma yorliqlari
 * (recharts) ham o'girilishi kerak.
 */
const RAW_TEXT_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "CODE",
  "PRE",
  "KBD",
]);

const SKIP_ATTRIBUTE = "data-no-translit";

/**
 * Asl lotin matn. React yangi qiymat yozganda shu yerga tushadi, lotinga
 * qaytilganda esa shundan tiklanadi.
 */
const original = new WeakMap<Node, string>();
/** Biz yozgan oxirgi qiymat — o'z natijamizni manba deb o'qimaslik uchun. */
const written = new WeakMap<Node, string>();

const originalAttributes = new WeakMap<Element, Map<string, string>>();
const writtenAttributes = new WeakMap<Element, Map<string, string>>();

function isOptedOut(element: Element): boolean {
  return (
    element.hasAttribute(SKIP_ATTRIBUTE) ||
    element.hasAttribute("contenteditable")
  );
}

/** Tugun yoki uning ota-onalaridan biri `data-no-translit` bilan chetlatilganmi. */
function isSkipped(node: Node): boolean {
  let current: Node | null =
    node.nodeType === Node.ELEMENT_NODE ? node : node.parentNode;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    if (isOptedOut(current as Element)) return true;
    current = current.parentNode;
  }
  return false;
}

/** Shu matn tuguni o'giriladimi: chetlatilmagan va UI matni bo'lsa. */
function shouldConvertText(node: Node): boolean {
  let current: Node | null = node.parentNode;
  if (!current) return false;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const element = current as Element;
    if (isOptedOut(element) || RAW_TEXT_TAGS.has(element.tagName)) return false;
    current = current.parentNode;
  }
  return true;
}

/** Elementga tegishli xotira jadvalini oladi, bo'lmasa yaratadi. */
function mapFor(
  store: WeakMap<Element, Map<string, string>>,
  element: Element,
): Map<string, string> {
  let map = store.get(element);
  if (!map) {
    map = new Map();
    store.set(element, map);
  }
  return map;
}

/**
 * Tugunning manba (lotin) matni. Joriy qiymat biz yozgan bo'lsa —
 * eslab qolingan asl; aks holda uni React yangi yozgan, ya'ni u yangi manba.
 */
function sourceOf(node: Text): string {
  const current = node.nodeValue ?? "";
  if (written.has(node) && written.get(node) === current) {
    return original.get(node) ?? current;
  }
  original.set(node, current);
  return current;
}

function write(node: Text, value: string) {
  if (node.nodeValue !== value) node.nodeValue = value;
  written.set(node, value);
}

/** Qo'shni matn tugunlari: JSX `{n} ta tanlandi` ikkita tugun bo'lib chiziladi. */
function textRun(node: Text): Text[] {
  const run: Text[] = [node];
  let previous = node.previousSibling;
  while (previous && previous.nodeType === Node.TEXT_NODE) {
    run.unshift(previous as Text);
    previous = previous.previousSibling;
  }
  let next = node.nextSibling;
  while (next && next.nodeType === Node.TEXT_NODE) {
    run.push(next as Text);
    next = next.nextSibling;
  }
  return run;
}

function latinWeight(text: string): number {
  return (text.match(/[A-Za-z]/g) ?? []).length;
}

export function convertText(node: Text, convert: TextConverter) {
  if (!shouldConvertText(node)) return;

  const run = textRun(node);
  if (run.length === 1) {
    write(node, convert(sourceOf(node)));
    return;
  }

  // Bir nechta tugun: avval butunini (shablon `{n} ta tanlandi` shunda
  // ishlaydi), keyin har birini alohida — qaysi biri ko'proq tarjima
  // qilgan bo'lsa, o'sha olinadi.
  const sources = run.map(sourceOf);
  const joined = sources.join("");
  const whole = convert(joined);
  const pieces = sources.map((source) => convert(source));

  if (whole !== joined && latinWeight(whole) <= latinWeight(pieces.join(""))) {
    run.forEach((item, index) => write(item, index === 0 ? whole : ""));
    return;
  }
  run.forEach((item, index) => write(item, pieces[index] ?? ""));
}

export function convertAttribute(
  element: Element,
  name: string,
  convert: TextConverter,
) {
  if (isSkipped(element)) return;

  const current = element.getAttribute(name);
  if (current === null) return;

  const originals = mapFor(originalAttributes, element);
  const writtenValues = mapFor(writtenAttributes, element);
  let source = current;
  if (writtenValues.get(name) === current) source = originals.get(name) ?? current;
  else originals.set(name, current);

  const converted = convert(source);
  if (converted !== current) element.setAttribute(name, converted);
  writtenValues.set(name, converted);
}

function convertElement(element: Element, convert: TextConverter) {
  for (const name of TEXT_ATTRIBUTES) {
    if (element.hasAttribute(name)) convertAttribute(element, name, convert);
  }
}

/** Element ichidagi to'g'ridan-to'g'ri matn tugunlarini qayta o'giradi. */
export function convertChildText(parent: Node, convert: TextConverter) {
  for (const child of parent.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) convertText(child as Text, convert);
  }
}

/** Tugunni va uning butun ostidagi daraxtni o'giradi. */
export function convertTree(root: Node, convert: TextConverter) {
  if (root.nodeType === Node.TEXT_NODE) {
    convertText(root as Text, convert);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  const element = root as Element;
  if (isSkipped(element)) return;

  convertElement(element, convert);
  walk(
    element,
    (text) => convertText(text, convert),
    (child) => convertElement(child, convert),
  );
}

function restoreText(node: Text) {
  const value = original.get(node);
  if (value !== undefined && written.get(node) === node.nodeValue) {
    if (node.nodeValue !== value) node.nodeValue = value;
  }
  written.delete(node);
}

function restoreElement(element: Element) {
  const originals = originalAttributes.get(element);
  if (!originals) return;
  const writtenValues = writtenAttributes.get(element);

  for (const [name, value] of originals) {
    const current = element.getAttribute(name);
    // React keyin boshqa qiymat yozgan bo'lsa — o'sha haqiqiy, tegilmaydi.
    if (current !== null && writtenValues?.get(name) === current && current !== value) {
      element.setAttribute(name, value);
    }
  }
  writtenAttributes.delete(element);
}

/** Lotinga qaytaradi — saqlangan asl matnlardan tiklaydi. */
export function restoreTree(root: Node) {
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  const element = root as Element;
  restoreElement(element);
  walk(element, restoreText, restoreElement, false);
}

/** Daraxtdagi matn tugunlari va elementlarni aylanib chiqadi. */
function walk(
  root: Element,
  onText: (node: Text) => void,
  onElement: (element: Element) => void,
  respectOptOut = true,
) {
  // `ownerDocument` — chop etiladigan hujjat (DOMParser) ham shu yo'ldan o'tadi.
  const walker = (root.ownerDocument ?? document).createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
        // REJECT butun shoxni tashlab ketadi — `data-no-translit` uchun
        // aynan shu kerak. Matn tegilmaydigan teglar esa qabul qilinadi:
        // ularning atributlari o'girilishi kerak.
        return respectOptOut && isOptedOut(node as Element)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) onText(current as Text);
    else onElement(current as Element);
    current = walker.nextNode();
  }
}
