import { adminApiRequest } from "@/lib/api/client";

export type MaterialSlab = {
  id: string;
  name: string;
  hsn: string;
  slabs: { min: string; max: string; gst: string }[];
};

export function parseMaterialSlabs(slabsJson?: string | null): MaterialSlab[] {
  try {
    if (!slabsJson) return [];
    const parsed = JSON.parse(slabsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m: Record<string, unknown>, idx: number) => ({
      id: String(idx),
      name: String(m.material ?? m.name ?? ""),
      hsn: String(m.hsn_code ?? m.hsnCode ?? m.hsn ?? ""),
      slabs: (Array.isArray(m.gst_slabs) ? m.gst_slabs : Array.isArray(m.slabs) ? m.slabs : []).map(
        (s: Record<string, unknown>) => ({
          min: s.min_price != null ? String(s.min_price) : String(s.min ?? ""),
          max: s.max_price != null ? String(s.max_price) : String(s.max ?? ""),
          gst: s.gst != null ? `${String(s.gst).replace("%", "")}%` : String(s.gst ?? ""),
        }),
      ),
    }));
  } catch {
    return [];
  }
}

export function serializeMaterialSlabs(materials: MaterialSlab[]): string {
  return JSON.stringify(
    materials
      .filter((m) => m.name.trim())
      .map((m) => ({
        material: m.name.trim(),
        hsn_code: m.hsn.trim(),
        gst_slabs: m.slabs.map((s) => ({
          min_price: s.min ? Number(s.min) : 0,
          max_price: s.max ? Number(s.max) : null,
          gst: Number(String(s.gst).replace("%", "")) || 0,
        })),
      })),
  );
}

export interface SubcategoryRow {
  id: number;
  categoryId: number;
  subcategoryName: string;
  subcategoryImage?: string;
  mobileImage?: string;
  materialSlabs?: string;
  material_slabs?: string; // Database might use snake_case
  weightSlabs?: string;
  weight_slabs?: string; // Database might use snake_case
  gstPercentage?: number;
  status: boolean;
  createdAt?: string;
  sellerId?: number;
  // Additional fields from backend
  category?: string;
  categoryImage?: string;
  mobileCategoryImage?: string;
  mainCat?: string;
}

export interface SubcategoryCounts {
  total: number;
  active: number;
  inactive: number;
}

// List subcategories with optional filters
export async function fetchSubcategories(
  categoryId?: number,
  search?: string
): Promise<SubcategoryRow[]> {
  const params = new URLSearchParams();
  if (categoryId !== undefined) params.append("categoryId", categoryId.toString());
  if (search !== undefined && search.trim()) params.append("search", search.trim());
  const url = `/api/admin/subcategories${params.toString() ? `?${params.toString()}` : ""}`;
  return adminApiRequest(url);
}

// Fetch subcategory counts
export async function fetchSubcategoryCounts(): Promise<SubcategoryCounts> {
  return adminApiRequest("/api/admin/subcategories/counts");
}

// CRUD operations
export async function createSubcategory(
  categoryId: number,
  subcategoryName: string,
  subcategoryImage?: string,
  mobileImage?: string,
  materialSlabs?: string,
  weightSlabs?: string,
  gstPercentage?: number,
  status?: boolean
): Promise<SubcategoryRow> {
  return adminApiRequest("/api/admin/subcategories", {
    method: "POST",
    body: JSON.stringify({
      categoryId,
      subcategoryName,
      subcategoryImage,
      mobileImage,
      materialSlabs,
      weightSlabs,
      gstPercentage,
      status,
    }),
  });
}

export async function updateSubcategory(
  id: number,
  categoryId: number,
  subcategoryName: string,
  subcategoryImage?: string,
  mobileImage?: string,
  materialSlabs?: string,
  weightSlabs?: string,
  gstPercentage?: number,
  status?: boolean
): Promise<void> {
  return adminApiRequest(`/api/admin/subcategories/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      categoryId,
      subcategoryName,
      subcategoryImage,
      mobileImage,
      materialSlabs,
      weightSlabs,
      gstPercentage,
      status,
    }),
  });
}

export async function deleteSubcategory(id: number): Promise<void> {
  return adminApiRequest(`/api/admin/subcategories/${id}`, {
    method: "DELETE",
  });
}
