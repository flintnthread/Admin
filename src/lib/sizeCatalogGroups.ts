/**
 * Frontend-only size catalog groups (no DB columns).
 * Classify by size name + code patterns so Admin/Seller can tab/filter.
 */

export type SizeCatalogGroupId =
  | "apparel"
  | "footwear"
  | "waist"
  | "kids"
  | "free"
  | "other";

export type SizeCatalogGroup = {
  id: SizeCatalogGroupId;
  label: string;
};

export const SIZE_CATALOG_GROUPS: SizeCatalogGroup[] = [
  { id: "apparel", label: "Apparel" },
  { id: "footwear", label: "Footwear" },
  { id: "waist", label: "Waist / Bottoms" },
  { id: "kids", label: "Kids" },
  { id: "free", label: "Free Size" },
  { id: "other", label: "Other" },
];

export const SIZE_CATALOG_ALL = "all" as const;
export type SizeCatalogFilterId = typeof SIZE_CATALOG_ALL | SizeCatalogGroupId;

const APPAREL_TOKENS = new Set([
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
]);

const APPAREL_NAME_ALIASES: Record<string, true> = {
  "EXTRA SMALL": true,
  "EXTRA-SMALL": true,
  SMALL: true,
  MEDIUM: true,
  LARGE: true,
  "EXTRA LARGE": true,
  "EXTRA-LARGE": true,
  "DOUBLE XL": true,
  "2 X LARGE": true,
  "3 X LARGE": true,
  "4 X LARGE": true,
};

function normalizeToken(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_./]/g, "-")
    .replace(/\s+/g, " ");
}

function compactToken(raw: string): string {
  return normalizeToken(raw).replace(/[\s-]/g, "");
}

function isFreeSize(name: string, code: string): boolean {
  const tokens = [normalizeToken(name), normalizeToken(code), compactToken(name), compactToken(code)];
  for (const t of tokens) {
    if (!t) continue;
    if (
      t === "FREE" ||
      t === "FREESIZE" ||
      t === "FREE SIZE" ||
      t === "ONESIZE" ||
      t === "ONE SIZE" ||
      t === "OS" ||
      t === "FS" ||
      t === "ONE-SIZE" ||
      t === "FREE-SIZE"
    ) {
      return true;
    }
    if (t.includes("FREE SIZE") || t.includes("ONE SIZE") || t.includes("ONESIZE")) {
      return true;
    }
  }
  return false;
}

function isApparel(name: string, code: string): boolean {
  const candidates = [
    normalizeToken(code),
    compactToken(code),
    normalizeToken(name),
    compactToken(name),
  ];
  for (const t of candidates) {
    if (!t) continue;
    if (APPAREL_TOKENS.has(t)) return true;
    if (APPAREL_NAME_ALIASES[t]) return true;
  }
  // "Extra Large (XL)" style — pull leading token / paren code
  const paren = normalizeToken(name).match(/\(([^)]+)\)/);
  if (paren && APPAREL_TOKENS.has(compactToken(paren[1]))) return true;
  return false;
}

function isFootwear(name: string, code: string): boolean {
  const combined = `${normalizeToken(name)} ${normalizeToken(code)}`;
  if (/\b(UK|EU|US)\b/.test(combined)) return true;
  if (/^(UK|EU|US)[-\s]?\d+(\.\d+)?$/.test(normalizeToken(code))) return true;
  if (/^(UK|EU|US)[-\s]?\d+(\.\d+)?$/.test(normalizeToken(name))) return true;
  if (/^(UK|EU|US)\d+(\.\d+)?$/.test(compactToken(code))) return true;
  if (/^(UK|EU|US)\d+(\.\d+)?$/.test(compactToken(name))) return true;
  return false;
}

function isKids(name: string, code: string): boolean {
  const combined = `${normalizeToken(name)} ${normalizeToken(code)}`;
  if (/\bAGE\s*\d+\b/.test(combined)) return true;
  if (/\b\d+\s*-\s*\d+\s*Y(EARS?)?\b/.test(combined)) return true;
  if (/\b\d+\s*Y(EARS?)?\b/.test(combined)) return true;
  if (/^\d+-\d+Y$/.test(compactToken(name)) || /^\d+-\d+Y$/.test(compactToken(code))) return true;
  if (/\bKIDS?\b/.test(combined) || /\bINFANT\b/.test(combined) || /\bTODDLER\b/.test(combined)) {
    return true;
  }
  return false;
}

function isWaist(name: string, code: string): boolean {
  const candidates = [normalizeToken(name), normalizeToken(code), compactToken(name), compactToken(code)];
  for (const t of candidates) {
    if (!t) continue;
    // W28 / WAIST 32
    const waistPrefixed = t.match(/^W(?:AIST)?[\s-]?(\d{2})$/);
    if (waistPrefixed) {
      const n = Number(waistPrefixed[1]);
      if (n >= 26 && n <= 44) return true;
    }
    if (/^\d{2}$/.test(t)) {
      const n = Number(t);
      if (n >= 26 && n <= 44) return true;
    }
  }
  return false;
}

/** Classify a size into a display catalog group from name + code only. */
export function classifySizeCatalog(
  name: string,
  code: string
): SizeCatalogGroupId {
  if (isFreeSize(name, code)) return "free";
  if (isFootwear(name, code)) return "footwear";
  if (isKids(name, code)) return "kids";
  if (isApparel(name, code)) return "apparel";
  if (isWaist(name, code)) return "waist";
  return "other";
}

export function sizeCatalogGroupLabel(id: SizeCatalogGroupId): string {
  return SIZE_CATALOG_GROUPS.find((g) => g.id === id)?.label ?? "Other";
}

export function filterSizesByCatalogGroup<T extends { name: string; code: string }>(
  sizes: T[],
  filter: SizeCatalogFilterId
): T[] {
  if (filter === SIZE_CATALOG_ALL) return sizes;
  return sizes.filter((s) => classifySizeCatalog(s.name, s.code) === filter);
}

export function countSizesByCatalogGroup<T extends { name: string; code: string }>(
  sizes: T[]
): Record<SizeCatalogFilterId, number> {
  const counts: Record<SizeCatalogFilterId, number> = {
    all: sizes.length,
    apparel: 0,
    footwear: 0,
    waist: 0,
    kids: 0,
    free: 0,
    other: 0,
  };
  for (const s of sizes) {
    counts[classifySizeCatalog(s.name, s.code)] += 1;
  }
  return counts;
}
