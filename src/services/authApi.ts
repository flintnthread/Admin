import { adminApiRequest } from "@/lib/api/client";
import type { AdminSessionUser } from "@/lib/api/session";

export type AdminLoginResponse = {
  adminId: number;
  email: string;
  fullName: string;
  role: string;
  accessToken: string;
  expiresInSeconds: number;
};

export type AdminMeResponse = {
  adminId: number;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
};

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  return adminApiRequest<AdminLoginResponse>("/api/admin/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCurrentAdmin(): Promise<AdminMeResponse> {
  return adminApiRequest<AdminMeResponse>("/api/admin/auth/me");
}

export function toSessionUser(me: AdminMeResponse | AdminLoginResponse): AdminSessionUser {
  return {
    adminId: me.adminId,
    email: me.email,
    fullName: me.fullName,
    role: me.role,
  };
}
