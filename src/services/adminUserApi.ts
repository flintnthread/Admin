import { adminApiRequest } from "@/lib/api/client";
import type { AdminUserRow, PageResponse } from "@/lib/api/types";

export async function fetchAdminUsers(page = 0, size = 20): Promise<PageResponse<AdminUserRow>> {
  return adminApiRequest(`/api/admin/users?page=${page}&size=${size}`);
}

export async function fetchAdminUser(id: number): Promise<AdminUserRow> {
  return adminApiRequest(`/api/admin/users/${id}`);
}

export async function createAdminUser(data: {
  email: string;
  fullName?: string;
  role?: string;
  active?: boolean;
  password: string;
}): Promise<AdminUserRow> {
  return adminApiRequest("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAdminUser(
  id: number,
  data: { fullName?: string; role?: string; active?: boolean; password?: string }
): Promise<AdminUserRow> {
  return adminApiRequest(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteAdminUser(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/users/${id}`, { method: "DELETE" });
}
