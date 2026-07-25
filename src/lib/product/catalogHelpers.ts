export type CatalogMaterialOption = {
  material: string;
  hsnCode: string;
  gst: number;
};

export type AdminProductFormCatalog = {
  categories?: Array<{
    id: number | string;
    name: string;
    subcategories?: Array<{
      id: number | string;
      name: string;
      gstPercentage?: number;
      materials?: Array<{ material: string; hsnCode?: string; gst?: number }>;
      children?: Array<{
        id: number | string;
        name: string;
        gstPercentage?: number;
        materials?: Array<{ material: string; hsnCode?: string; gst?: number }>;
      }>;
    }>;
  }>;
  deliverySlabs?: DeliveryWeightSlab[];
  colors?: Array<{ id: number; name: string; code?: string }>;
  sizes?: Array<{ id: number; name: string; code?: string }>;
};

export type DeliveryWeightSlab = {
  id?: number;
  label: string;
  minWeightKg: number;
  maxWeightKg: number;
  intraCityCharge: number;
  metroMetroCharge: number;
  custom?: boolean;
};

export function materialsForSelection(
  catalog: AdminProductFormCatalog | null | undefined,
  mainCategoryName: string,
  middleCategoryName: string,
  leafSubcategoryName: string,
): CatalogMaterialOption[] {
  if (!mainCategoryName?.trim() || !middleCategoryName?.trim()) return [];

  const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
  const mid = cat?.subcategories?.find((s) => s.name === middleCategoryName);
  if (!mid) return [];

  const children = mid.children ?? [];
  if (!leafSubcategoryName?.trim()) {
    return normalizeMaterials(mid.materials);
  }
  if (children.length === 0) {
    return normalizeMaterials(mid.materials);
  }

  const leaf = children.find((c) => c.name === leafSubcategoryName);
  if (leaf?.materials?.length) {
    return normalizeMaterials(leaf.materials);
  }
  return normalizeMaterials(mid.materials);
}

export function resolveMaterialOption(
  materials: CatalogMaterialOption[],
  materialName: string,
): CatalogMaterialOption | undefined {
  const key = materialName?.trim().toLowerCase();
  if (!key) return undefined;
  return materials.find((m) => m.material.trim().toLowerCase() === key);
}

export function resolveGstForMaterial(
  materials: CatalogMaterialOption[],
  materialName: string,
  fallbackGst?: number | null,
): number | null {
  const option = resolveMaterialOption(materials, materialName);
  if (option?.gst != null && Number.isFinite(option.gst) && option.gst > 0) {
    return option.gst;
  }
  if (fallbackGst != null && Number.isFinite(fallbackGst)) {
    return fallbackGst;
  }
  return null;
}

function normalizeMaterials(
  raw?: { material: string; hsnCode?: string; gst?: number }[] | null,
): CatalogMaterialOption[] {
  if (!raw?.length) return [];
  return raw
    .map((m) => ({
      material: String(m.material ?? "").trim(),
      hsnCode: String(m.hsnCode ?? "").trim(),
      gst: typeof m.gst === "number" && Number.isFinite(m.gst) ? m.gst : 0,
    }))
    .filter((m) => m.material.length > 0);
}

export function buildCategoryPathOptions(catalog: AdminProductFormCatalog | null | undefined): string[] {
  const paths: string[] = [];
  for (const cat of catalog?.categories ?? []) {
    for (const sub of cat.subcategories ?? []) {
      paths.push(`${cat.name} > ${sub.name}`);
    }
  }
  return Array.from(new Set(paths));
}

export function parseCategoryPath(label: string): { category: string; categorySub: string } {
  const idx = label.indexOf(" > ");
  if (idx === -1) {
    return { category: label.trim(), categorySub: "" };
  }
  return {
    category: label.slice(0, idx).trim(),
    categorySub: label.slice(idx + 3).trim(),
  };
}

export function formatCategoryPath(category: string, categorySub: string): string {
  if (!category?.trim()) return "";
  if (!categorySub?.trim()) return category.trim();
  return `${category.trim()} > ${categorySub.trim()}`;
}

export function resolveCategoryPathSelection(
  label: string,
  catalog: AdminProductFormCatalog | null | undefined,
): {
  category: string;
  categoryId: number | null;
  categorySubId: number | null;
  categorySubName: string;
} {
  const { category, categorySub } = parseCategoryPath(label);
  const cat = catalog?.categories?.find((c) => c.name === category);
  const sub = cat?.subcategories?.find((s) => s.name === categorySub);
  return {
    category,
    categoryId: cat?.id != null ? Number(cat.id) : null,
    categorySubId: sub?.id != null ? Number(sub.id) : null,
    categorySubName: categorySub,
  };
}

export function buildLeafSubcategoryOptions(
  catalog: AdminProductFormCatalog | null | undefined,
  mainCategoryName: string,
  categorySubName: string,
): string[] {
  if (!mainCategoryName?.trim() || !categorySubName?.trim()) return [];
  const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
  const sub = cat?.subcategories?.find((s) => s.name === categorySubName);
  const children = sub?.children ?? [];
  if (children.length > 0) {
    return Array.from(new Set(children.map((c) => c.name)));
  }
  // No leaf children — middle is the selectable subcategory itself
  return sub ? [sub.name] : [];
}

export function resolveLeafSubcategory(
  catalog: AdminProductFormCatalog | null | undefined,
  mainCategoryName: string,
  middleName: string,
  leafName: string,
): { id: number | null; name: string; gstPercentage?: number } {
  const cat = catalog?.categories?.find((c) => c.name === mainCategoryName);
  const mid = cat?.subcategories?.find((s) => s.name === middleName);
  if (!mid) return { id: null, name: leafName };
  const children = mid.children ?? [];
  if (children.length === 0) {
    return {
      id: mid.id != null ? Number(mid.id) : null,
      name: mid.name,
      gstPercentage: mid.gstPercentage,
    };
  }
  const leaf = children.find((c) => c.name === leafName);
  if (!leaf) return { id: null, name: leafName };
  return {
    id: leaf.id != null ? Number(leaf.id) : null,
    name: leaf.name,
    gstPercentage: leaf.gstPercentage,
  };
}

const FALLBACK_SLABS: DeliveryWeightSlab[] = [
  { label: "500gms-1kg", minWeightKg: 0.5, maxWeightKg: 1, intraCityCharge: 20, metroMetroCharge: 25 },
  { label: "1-2 kg", minWeightKg: 1, maxWeightKg: 2, intraCityCharge: 80, metroMetroCharge: 95 },
  { label: "2-5 kg", minWeightKg: 2, maxWeightKg: 5, intraCityCharge: 175, metroMetroCharge: 205 },
  { label: "Above 5 kg", minWeightKg: 5, maxWeightKg: 999.999, intraCityCharge: 0, metroMetroCharge: 0, custom: true },
];

export function resolveWeightSlab(
  weightRaw: string | number | undefined | null,
  slabs: DeliveryWeightSlab[] = FALLBACK_SLABS,
): DeliveryWeightSlab {
  const w = parseFloat(String(weightRaw ?? "").trim());
  if (!Number.isFinite(w) || w <= 0) {
    return { label: "", minWeightKg: 0, maxWeightKg: 0, intraCityCharge: 0, metroMetroCharge: 0 };
  }
  const list = slabs.length > 0 ? slabs : FALLBACK_SLABS;
  for (const slab of list) {
    if (w >= slab.minWeightKg && w <= slab.maxWeightKg) {
      return slab;
    }
  }
  const nextHigher = list
    .filter((slab) => w < slab.minWeightKg)
    .sort((a, b) => a.minWeightKg - b.minWeightKg)[0];
  if (nextHigher) return nextHigher;
  return list[list.length - 1] ?? FALLBACK_SLABS[FALLBACK_SLABS.length - 1];
}
