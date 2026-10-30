/**
 * UI matnlarini manba koddan yig'ish — `i18n-extract.mjs` va
 * `src/lib/i18n/coverage.test.ts` uchun umumiy yadro.
 *
 * Panel matnlari JSX va TS ichida o'zbek lotinida yozilgan, tarjima esa
 * DOM qatlamida (`src/lib/i18n/dom.ts`) qo'llanadi. Bu skript lug'atda
 * nimalar bo'lishi kerakligini aytadi: TypeScript AST bo'ylab yurib,
 * foydalanuvchiga ko'rinadigan satrlarni ajratadi.
 *
 * Shablon satr (`${n} ta tanlandi`) `{x} ta tanlandi` ko'rinishida qaytadi.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";

/** Matni UI bo'lmagan JSX atributlari. */
const SKIP_ATTRIBUTES = new Set([
  "className",
  "class",
  "href",
  "src",
  "id",
  "key",
  "type",
  "name",
  "variant",
  "size",
  "side",
  "align",
  "role",
  "htmlFor",
  "autoComplete",
  "inputMode",
  "lang",
  "dir",
  "target",
  "rel",
  "method",
  "action",
  "accept",
  "pattern",
  "tone",
  "color",
  "icon",
  "value",
  "defaultValue",
  "orientation",
  "position",
  "mode",
  "sizes",
  "fill",
  "stroke",
  "d",
  "viewBox",
  "xmlns",
  "transform",
  "dataKey",
  "nameKey",
  "labelKey",
  "stackId",
  "layout",
  "strokeDasharray",
  "fontSize",
  "radius",
  "kind",
  "status",
  "tab",
  "asChild",
  "style",
  "enterKeyHint",
  "autoCapitalize",
  "spellCheck",
  "form",
  "download",
]);

/** Argumentlari UI matni bo'lmagan chaqiruvlar. */
const SKIP_CALLEES = new Set([
  "cn",
  "clsx",
  "cva",
  "twMerge",
  "require",
  "useQueryState",
  "parseAsString",
  "parseAsStringEnum",
  "parseAsInteger",
  "parseAsArrayOf",
  "parseAsBoolean",
  "querySelector",
  "querySelectorAll",
  "getElementById",
  "addEventListener",
  "removeEventListener",
  "setAttribute",
  "getAttribute",
  "removeAttribute",
  "hasAttribute",
  "createElement",
  "getItem",
  "setItem",
  "removeItem",
  "matchMedia",
  "startsWith",
  "endsWith",
  "includes",
  "indexOf",
  "split",
  "replace",
  "replaceAll",
  "join",
  "padStart",
  "padEnd",
  "format",
  "toLocaleString",
  "toLocaleDateString",
  "toLocaleTimeString",
  "Intl.DateTimeFormat",
  "Intl.NumberFormat",
  "log",
  "debug",
  "warn",
  "info",
  "error",
  "dir",
  "get",
  "set",
  "has",
  "delete",
  "append",
  "searchParams.get",
  "fetch",
  "open",
  "post",
  "patch",
  "put",
  "apiGet",
  "apiPost",
  "apiPatch",
  "apiPut",
  "apiDelete",
  "endpoint",
  "path",
  "keyOf",
  "asString",
  "asInt",
  "asOptionalInt",
  "asBool",
  "asNumber",
  "pick",
  "field",
  "Symbol",
  "Symbol.for",
  "new URL",
  "URL",
  "RegExp",
  "new RegExp",
  "WebSocket",
  "new WebSocket",
  "Blob",
  "new Blob",
  "preload",
  "persist",
  "createJSONStorage",
  "useHotkeys",
  "event",
  "dispatchEvent",
  "CustomEvent",
  "new CustomEvent",
  "Event",
  "new Event",
  "postMessage",
  "send",
  "sendOperatorCommand",
]);

/** Shu nomdagi o'zgaruvchi/xususiyatlarga berilgan satr UI emas. */
const SKIP_PROPERTY_NAMES = new Set([
  "className",
  "queryKey",
  "mutationKey",
  "href",
  "url",
  "path",
  "route",
  "key",
  "id",
  "name",
  "type",
  "value",
  "tone",
  "color",
  "icon",
  "variant",
  "kind",
  "status",
  "code",
  "storageKey",
  "attribute",
  "theme",
  "dataKey",
  "accent",
  "fill",
  "stroke",
  "background",
  "pattern",
  "mime",
  "mimeType",
  "accept",
  "format",
  "dateFormat",
  "width",
  "height",
  "font",
  "lang",
  "locale",
  "field",
  "param",
  "event",
  "channel",
  "sound",
  "src",
  "tag",
  "selector",
  "shortcut",
  "keys",
  "hotkey",
  "slug",
  "endpoint",
  "method",
  "prefix",
  "sort",
  "ordering",
  "order_by",
  "dot",
  "bar",
  "ring",
  "bg",
  "text",
  "border",
  "chip",
  "cls",
  "classes",
  "style",
]);

/** `text` nomi ko'pincha UI matn — undan istisno: SKIP_PROPERTY_NAMES dan chiqariladi. */
SKIP_PROPERTY_NAMES.delete("text");

const LATIN_LETTER = /[A-Za-z]/;
const CYRILLIC = /[Ѐ-ӿ]/;

/** Tailwind/klass ro'yxatiga o'xshash satr. */
function looksLikeClassList(text) {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length === 0) return false;
  const classy = tokens.filter((token) =>
    /^[!-]?[a-z0-9@*]+(?:[-:/.\[\]()%#_,=&>~+'"]+[a-z0-9@*%.\[\]()_#,='"-]*)+$/i.test(
      token,
    ) && /[-:\[]/.test(token),
  );
  return classy.length >= Math.max(1, Math.ceil(tokens.length * 0.6));
}

/** Matn UI satriga o'xshaydimi (identifikator, URL, klass emas). */
export function looksLikeUiText(raw) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (!LATIN_LETTER.test(text)) return false;
  if (CYRILLIC.test(text)) return false;
  if (/^(https?:|wss?:|mailto:|tel:|data:|blob:|\/|\.\/|#|@\/)/.test(text)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(text)) return false;
  if (looksLikeClassList(text)) return false;
  // Bitta so'z, kichik harf/raqam/_/-/. — identifikator yoki kalit.
  if (!/\s/.test(text)) {
    if (/^[a-z0-9_.\-:/|,;]+$/.test(text)) return false;
    if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(text)) return false; // camelCase
    if (/^[A-Z0-9_]+$/.test(text) && text.includes("_")) return false; // CONST_CASE
    if (/^[A-Z][a-z]+[A-Z][A-Za-z]*$/.test(text)) return false; // PascalCase
    if (/[=&?{}<>\\]/.test(text)) return false;
  }
  // Sana/son formati (`dd.MM.yyyy`, `HH:mm`).
  if (/^[dMyHhmsSEaQ.:/\s,'-]+$/.test(text) && /(dd|MM|yy|HH|mm)/.test(text)) return false;
  return true;
}

function calleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = expression.expression;
    const leftName = ts.isIdentifier(left) ? left.text : "";
    return { full: `${leftName}.${expression.name.text}`, last: expression.name.text };
  }
  return "";
}

function isSkippedCall(node) {
  const name = calleeName(node.expression);
  if (typeof name === "string") return SKIP_CALLEES.has(name);
  return SKIP_CALLEES.has(name.full) || SKIP_CALLEES.has(name.last);
}

function propertyNameOf(node) {
  const name = node.name;
  if (!name) return "";
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return "";
}

/** Satr joylashgan kontekst uni UI emas deb aytadimi. */
function isNonUiContext(node) {
  let child = node;
  let parent = node.parent;

  while (parent) {
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
    // `"use client"` kabi direktivalar.
    if (ts.isExpressionStatement(parent)) return true;
    if (ts.isImportTypeNode?.(parent)) return true;
    if (ts.isLiteralTypeNode(parent)) return true;
    if (ts.isCaseClause(parent) && parent.expression === child) return true;
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === child) return true;
    if (ts.isPropertyAssignment(parent) && parent.name === child) return true;
    if (ts.isPropertyAssignment(parent) && SKIP_PROPERTY_NAMES.has(propertyNameOf(parent))) return true;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      const variable = parent.name.text;
      if (/(?:class(?:es|Name)?|Key|KEY|Url|URL|Path|PATH|Route|Pattern|Regex|Selector|Format|FORMAT|Mime|Id|ID|Cls|Tone|Style)s?$/.test(variable)) return true;
    }
    if (ts.isBinaryExpression(parent)) {
      const op = parent.operatorToken.kind;
      if (
        op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        op === ts.SyntaxKind.EqualsEqualsToken ||
        op === ts.SyntaxKind.ExclamationEqualsToken ||
        op === ts.SyntaxKind.InKeyword ||
        op === ts.SyntaxKind.InstanceOfKeyword
      ) {
        return true;
      }
    }
    if (ts.isJsxAttribute(parent)) {
      const attr = parent.name.getText();
      if (attr.startsWith("data-")) return true;
      return SKIP_ATTRIBUTES.has(attr);
    }
    if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
      if (parent.expression === child) return false;
      if (ts.isCallExpression(parent) && isSkippedCall(parent)) return true;
      if (ts.isNewExpression(parent)) {
        const name = ts.isIdentifier(parent.expression) ? parent.expression.text : "";
        if (SKIP_CALLEES.has(`new ${name}`)) return true;
      }
      return false;
    }
    if (ts.isTaggedTemplateExpression(parent)) return true;
    // Satr yuqorisidagi birinchi "ma'noli" konteyner — undan yuqoriga chiqmaymiz.
    if (
      ts.isJsxExpression(parent) ||
      ts.isReturnStatement(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isBlock(parent) ||
      ts.isSourceFile(parent)
    ) {
      return false;
    }
    child = parent;
    parent = parent.parent;
  }
  return false;
}

/** HTML satridan (style/script'siz) teglar orasidagi matn bo'laklari. */
function htmlTextPieces(html) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .split(/<[^>]*>/)
    .map((piece) => decodeEntities(piece).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** `${a} ta ${b}` → `{x} ta {x}`. */
function templateToPattern(node) {
  let out = node.head.text;
  for (const span of node.templateSpans) {
    out += "{x}" + span.literal.text;
  }
  return out;
}

const ENTITIES = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&laquo;": "«",
  "&raquo;": "»",
};

/** JSX matnidagi HTML belgilari — brauzer ularni shunday chizadi. */
export function decodeEntities(text) {
  return text.replace(/&[a-z]+;/g, (entity) => ENTITIES[entity] ?? entity);
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Bitta faylni tahlil qiladi.
 * @returns {Array<{ text: string, file: string, line: number, kind: string }>}
 */
export function extractFromSource(fileName, source) {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const found = [];

  const push = (node, text, type) => {
    const value = normalize(text);
    // Chop etiladigan HTML hujjat: teglar orasidagi matn alohida yig'iladi.
    if (value.startsWith("<") || /<\/?[a-z][^>]*>/i.test(value)) {
      for (const piece of htmlTextPieces(value)) push(node, piece, `${type}-html`);
      return;
    }
    const sample = value.replace(/\{x\}/g, "7");
    if (!looksLikeUiText(sample)) return;
    // Faqat o'rinlardan va tinish belgilaridan iborat shablon — matn emas.
    if (!/[A-Za-z]{2,}/.test(value.replace(/\{x\}/g, ""))) return;
    if (/var\(--|color-mix\(|rotate\(|translate\(|cubic-bezier\(|^\(.*:.*\)$|function\s*\(/.test(value)) return;
    if (/^[a-z-]+(?:; [a-z-]+)+$/.test(value)) return;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    found.push({ text: value, file: fileName, line: line + 1, kind: type });
  };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      if (node.text.trim()) push(node, decodeEntities(node.text), "jsx");
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isNonUiContext(node)) push(node, node.text, "string");
    } else if (ts.isTemplateExpression(node)) {
      if (!isNonUiContext(node)) push(node, templateToPattern(node), "template");
      // Ichidagi ifodalarda ham satr bo'lishi mumkin.
      for (const span of node.templateSpans) visit(span.expression);
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

/** `src/**\/*.{ts,tsx}` (testlarsiz va i18n lug'atlarisiz) fayllar ro'yxati. */
export function listSourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue;
      if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
      out.push(full);
    }
  };
  walk(root);
  // Mock ma'lumotlari (`features/*/mock/`) UI matni emas — namuna baza.
  return out.filter(
    (file) =>
      !file.includes(`${join("lib", "i18n")}`) &&
      !file.endsWith("translit.ts") &&
      !/[\\/]mock[\\/]/.test(file),
  );
}

/**
 * Butun `src` dan yig'adi. Bir xil matn bir marta qaytadi (birinchi joyi bilan).
 * @returns {Array<{ text: string, file: string, line: number, kind: string }>}
 */
export function extractAll(projectRoot) {
  const srcRoot = join(projectRoot, "src");
  const seen = new Map();
  for (const file of listSourceFiles(srcRoot)) {
    const source = readFileSync(file, "utf8");
    for (const item of extractFromSource(relative(projectRoot, file), source)) {
      if (!seen.has(item.text)) seen.set(item.text, item);
    }
  }
  return [...seen.values()];
}
