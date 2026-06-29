import { adminApiRequest } from "@/lib/api/client";

export type CatalogSize = {
  id: number;
  name: string;
  code: string;
  status: "Active" | "Inactive";
  createdDate?: string;
};

export async function fetchSizes(): Promise<CatalogSize[]> {
  return adminApiRequest<CatalogSize[]>("/api/admin/sizes");
}

export async function createSize(data: {
  name: string;
  code: string;
  status: "Active" | "Inactive";
}): Promise<CatalogSize> {
  return adminApiRequest("/api/admin/sizes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSize(
  id: number,
  data: { name: string; code: string; status: "Active" | "Inactive" }
): Promise<CatalogSize> {
  return adminApiRequest(`/api/admin/sizes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSize(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/sizes/${id}`, { method: "DELETE" });
}
