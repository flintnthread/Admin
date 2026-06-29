import { adminApiRequest } from "@/lib/api/client";

export type CatalogColor = {
  id: number;
  name: string;
  code: string;
  status: "Active" | "Inactive";
  createdDate?: string;
};

export async function fetchColors(): Promise<CatalogColor[]> {
  return adminApiRequest<CatalogColor[]>("/api/admin/colors");
}

export async function createColor(data: {
  name: string;
  code: string;
  status: "Active" | "Inactive";
}): Promise<CatalogColor> {
  return adminApiRequest("/api/admin/colors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateColor(
  id: number,
  data: { name: string; code: string; status: "Active" | "Inactive" }
): Promise<CatalogColor> {
  return adminApiRequest(`/api/admin/colors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteColor(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/colors/${id}`, { method: "DELETE" });
}
