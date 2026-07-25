import { adminApiRequest } from "@/lib/api/client";

export type CategoryRow = {
  id: number;
  categoryName: string;
  parentId?: number | null;
  hsnCode?: string;
  gstPercentage?: number;
  status: boolean;
  categoryImage?: string;
  mobileImage?: string;
  bannerImage?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type CategoryCounts = {
  mainCategories: number;
  subcategories: number;
};

export async function fetchMainCategories(search?: string): Promise<CategoryRow[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return adminApiRequest(`/api/admin/categories/main${q}`);
}

export async function fetchSubcategories(parentId?: number, search?: string): Promise<CategoryRow[]> {
  const q = new URLSearchParams();
  if (parentId != null) q.set("parentId", String(parentId));
  if (search) q.set("search", search);
  const qs = q.toString();
  return adminApiRequest(`/api/admin/categories/subcategories${qs ? `?${qs}` : ""}`);
}

export async function fetchCategoryCounts(): Promise<CategoryCounts> {
  return adminApiRequest("/api/admin/categories/counts");
}

// CRUD operations
export async function createMainCategory(
  categoryName: string,
  hsnCode?: string,
  gstPercentage?: number,
  categoryImage?: string,
  mobileImage?: string,
  bannerImage?: string,
  status?: boolean
): Promise<CategoryRow> {
  return adminApiRequest("/api/admin/categories/main", {
    method: "POST",
    body: JSON.stringify({ categoryName, hsnCode, gstPercentage, categoryImage, mobileImage, bannerImage, status }),
  });
}

export async function createSubcategory(
  parentId: number,
  categoryName: string,
  hsnCode?: string,
  gstPercentage?: number,
  categoryImage?: string,
  mobileImage?: string,
  bannerImage?: string,
  status?: boolean
): Promise<CategoryRow> {
  return adminApiRequest("/api/admin/categories/subcategories", {
    method: "POST",
    body: JSON.stringify({ parentId, categoryName, hsnCode, gstPercentage, categoryImage, mobileImage, bannerImage, status }),
  });
}

export async function updateCategory(
  id: number,
  categoryName: string,
  hsnCode?: string,
  gstPercentage?: number,
  categoryImage?: string,
  mobileImage?: string,
  bannerImage?: string,
  status?: boolean
): Promise<CategoryRow> {
  return adminApiRequest(`/api/admin/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ categoryName, hsnCode, gstPercentage, categoryImage, mobileImage, bannerImage, status }),
  });
}

export async function uploadCategoryImages(
  id: number,
  image?: Blob | File | null,
  mobileImage?: Blob | File | null,
  bannerImage?: Blob | File | null,
): Promise<CategoryRow> {
  const form = new FormData();
  if (image) {
    const fileName = image instanceof File && image.name ? image.name : "category.jpg";
    form.append("image", image, fileName);
  }
  if (mobileImage) {
    const fileName =
      mobileImage instanceof File && mobileImage.name ? mobileImage.name : "category-mobile.jpg";
    form.append("mobileImage", mobileImage, fileName);
  }
  if (bannerImage) {
    const fileName =
      bannerImage instanceof File && bannerImage.name ? bannerImage.name : "category-banner.jpg";
    form.append("bannerImage", bannerImage, fileName);
  }
  return adminApiRequest(`/api/admin/categories/${id}/upload-images`, {
    method: "POST",
    body: form,
  });
}

export async function deleteCategory(id: number): Promise<void> {
  return adminApiRequest(`/api/admin/categories/${id}`, {
    method: "DELETE",
  });
}
