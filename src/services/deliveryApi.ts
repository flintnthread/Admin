import { adminApiRequest } from "@/lib/api/client";
import type { DeliverySlab } from "@/lib/api/types";

export async function fetchDeliverySlabs(): Promise<DeliverySlab[]> {
  return adminApiRequest("/api/admin/delivery-slabs");
}

export async function createDeliverySlab(data: Partial<DeliverySlab>): Promise<DeliverySlab> {
  return adminApiRequest("/api/admin/delivery-slabs", { method: "POST", body: JSON.stringify(data) });
}

export async function updateDeliverySlab(id: number, data: Partial<DeliverySlab>): Promise<DeliverySlab> {
  return adminApiRequest(`/api/admin/delivery-slabs/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteDeliverySlab(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/delivery-slabs/${id}`, { method: "DELETE" });
}
