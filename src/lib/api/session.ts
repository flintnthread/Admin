import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ADMIN_TOKEN_STORAGE_KEY } from "./config";

export type AdminSessionUser = {
  adminId: number;
  email: string;
  fullName: string;
  role: string;
};

const USER_KEY = "admin_auth_user";

/** In-memory cache so sync reads work right after login on native. */
let memoryToken: string | null = null;
let memoryUser: AdminSessionUser | null = null;

function readWeb(key: string): string | null {
  if (Platform.OS !== "web") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeWeb(key: string, value: string) {
  if (Platform.OS !== "web") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function removeWeb(key: string) {
  if (Platform.OS !== "web") return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getAdminToken(): string | null {
  if (memoryToken) return memoryToken;
  return readWeb(ADMIN_TOKEN_STORAGE_KEY);
}

export function getAdminUser(): AdminSessionUser | null {
  if (memoryUser) return memoryUser;
  const raw = readWeb(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSessionUser;
  } catch {
    return null;
  }
}

export function saveAdminSession(token: string, user: AdminSessionUser) {
  memoryToken = token;
  memoryUser = user;

  if (Platform.OS === "web") {
    writeWeb(ADMIN_TOKEN_STORAGE_KEY, token);
    writeWeb(USER_KEY, JSON.stringify(user));
    return;
  }

  void AsyncStorage.multiSet([
    [ADMIN_TOKEN_STORAGE_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export function clearAdminSession() {
  memoryToken = null;
  memoryUser = null;

  if (Platform.OS === "web") {
    removeWeb(ADMIN_TOKEN_STORAGE_KEY);
    removeWeb(USER_KEY);
    return;
  }

  void AsyncStorage.multiRemove([ADMIN_TOKEN_STORAGE_KEY, USER_KEY]);
}

/** Load persisted session on app start (native) or from sessionStorage (web). */
export async function hydrateAdminSession(): Promise<{
  token: string | null;
  user: AdminSessionUser | null;
}> {
  if (Platform.OS === "web") {
    const token = readWeb(ADMIN_TOKEN_STORAGE_KEY);
    const rawUser = readWeb(USER_KEY);
    if (token) memoryToken = token;
    if (rawUser) {
      try {
        memoryUser = JSON.parse(rawUser) as AdminSessionUser;
      } catch {
        memoryUser = null;
      }
    }
    return { token: memoryToken, user: memoryUser };
  }

  try {
    const pairs = await AsyncStorage.multiGet([ADMIN_TOKEN_STORAGE_KEY, USER_KEY]);
    const token = pairs[0][1];
    const rawUser = pairs[1][1];

    memoryToken = token;
    if (rawUser) {
      try {
        memoryUser = JSON.parse(rawUser) as AdminSessionUser;
      } catch {
        memoryUser = null;
      }
    } else {
      memoryUser = null;
    }

    return { token: memoryToken, user: memoryUser };
  } catch {
    memoryToken = null;
    memoryUser = null;
    return { token: null, user: null };
  }
}
