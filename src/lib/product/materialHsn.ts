/**
 * Default HSN codes by primary material (India GST — apparel & general merchandise).
 * Admins can still edit the field after auto-fill.
 */
export const MATERIAL_HSN_MAP: Record<string, string> = {
  Cotton: "61091000",
  Polyester: "61099090",
  Silk: "62041910",
  Wool: "61103000",
  Linen: "62052000",
  Nylon: "61099090",
  Leather: "42031010",
  Denim: "62046200",
  Rayon: "61099090",
  Acrylic: "61103010",
  Velvet: "60053700",
  Satin: "61099090",
  Chiffon: "62044990",
  Spandex: "61099090",
  Metal: "73239390",
  Plastic: "39269099",
  Wood: "44219990",
  Glass: "70134900",
  Ceramic: "69120090",
  Rubber: "40169990",
  Paper: "48201090",
  "Mixed Fabric": "61099090",
  Blend: "61099090",
};

export const MATERIAL_TYPES = Object.keys(MATERIAL_HSN_MAP);

/** Returns suggested HSN for a material label, or empty string if unknown. */
export function getHsnForMaterial(material: string): string {
  const key = material?.trim();
  if (!key) return "";
  if (MATERIAL_HSN_MAP[key]) return MATERIAL_HSN_MAP[key];
  const lower = key.toLowerCase();
  const found = Object.entries(MATERIAL_HSN_MAP).find(([k]) => k.toLowerCase() === lower);
  return found?.[1] ?? "";
}
