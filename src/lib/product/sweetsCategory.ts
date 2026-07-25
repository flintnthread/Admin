/** Detect Food & Sweets (and similar) so UI can hide Color and relabel Size as Weight. */

export function isSweetsCategory(
  ...names: Array<string | null | undefined>
): boolean {
  const blob = names
    .map((n) => String(n ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
  if (!blob) return false;
  return (
    blob.includes("sweet") ||
    blob.includes("mithai") ||
    blob.includes("confection") ||
    blob.includes("dessert") ||
    blob.includes("food & sweet") ||
    blob.includes("food and sweet")
  );
}

export const SWEETS_DEFAULT_COLOR = "NA";

export function isSweetsPlaceholderColor(color?: string | null): boolean {
  const c = String(color ?? "").trim().toUpperCase();
  return !c || c === "NA" || c === "N/A" || c === "NONE" || c === "-" || c === "NULL";
}

export function variantDimensionLabels(isSweets: boolean): {
  sizeLabel: string;
  sizePlaceholder: string;
  sizeSelectTitle: string;
  colorLabel: string;
  showColor: boolean;
} {
  if (isSweets) {
    return {
      sizeLabel: "Weight",
      sizePlaceholder: "e.g. 500 grams",
      sizeSelectTitle: "Select Weight",
      colorLabel: "Color",
      showColor: false,
    };
  }
  return {
    sizeLabel: "Size",
    sizePlaceholder: "Select size",
    sizeSelectTitle: "Select Size",
    colorLabel: "Color",
    showColor: true,
  };
}

export function resolveVariantDimensionLabels(input: {
  categoryNames?: Array<string | null | undefined>;
  color?: string | null;
}): ReturnType<typeof variantDimensionLabels> {
  const sweets =
    isSweetsCategory(...(input.categoryNames ?? [])) ||
    isSweetsPlaceholderColor(input.color);
  return variantDimensionLabels(sweets);
}
