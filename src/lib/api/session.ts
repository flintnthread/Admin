import { Platform } from "react-native";
import { ADMIN_TOKEN_STORAGE_KEY } from "./config";

export type AdminSessionUser = {
  adminId: number;
  email: string;
  fullName: string;
  role: string;
};

const USER_KEY = "admin_auth_user";

function read(key: string): string | null {
  if (Platform.OS !== "web") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  if (Platform.OS !== "web") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function remove(key: string) {
  if (Platform.OS !== "web") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getAdminToken(): string | null {
  return read(ADMIN_TOKEN_STORAGE_KEY);
}

export function getAdminUser(): AdminSessionUser | null {
  const raw = read(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    return null;
  }
}

export function saveAdminSession(token: string, user: AdminSessionUser) {
  write(ADMIN_TOKEN_STORAGE_KEY, token);
  write(USER_KEY, JSON.stringify(user));
}

export function clearAdminSession() {
  remove(ADMIN_TOKEN_STORAGE_KEY);
  remove(USER_KEY);
}
