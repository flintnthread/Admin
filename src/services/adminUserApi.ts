import { adminApiRequest } from "@/lib/api/client";
import type { AdminUserRow, PageResponse } from "@/lib/api/types";

const ROLE_TO_API: Record<string, string> = {
  Admin: "admin",
  "Super admin": "super_admin",
  "Order management": "order_management",
  "Sellers management": "sellers_management",
  "Category management": "category_management",
  "Finance management": "finance_management",
  "Product management": "product_management",
};

const API_TO_ROLE: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super admin",
  order_management: "Order management",
  sellers_management: "Sellers management",
  category_management: "Category management",
  finance_management: "Finance management",
  product_management: "Product management",
};

export function toApiRole(displayRole?: string): string {
  if (!displayRole) return "admin";
  return ROLE_TO_API[displayRole] ?? displayRole.toLowerCase().replace(/\s+/g, "_");
}

export function fromApiRole(apiRole?: string): string {
  if (!apiRole) return "Admin";
  return API_TO_ROLE[apiRole] ?? apiRole;
}

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
  return adminApiRequest("/api/admin/users", {
    method: "POST",
    body: JSON.stringify({ ...data, role: toApiRole(data.role) }),
  });
}

export async function updateAdminUser(
  id: number,
  data: { fullName?: string; role?: string; active?: boolean; password?: string }
): Promise<AdminUserRow> {
  return adminApiRequest(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...data,
      ...(data.role != null ? { role: toApiRole(data.role) } : {}),
    }),
  });
}

export async function deleteAdminUser(id: number): Promise<void> {
  await adminApiRequest(`/api/admin/users/${id}`, { method: "DELETE" });
}
