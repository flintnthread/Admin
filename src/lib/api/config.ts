import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const ADMIN_API_PORT = 8082;

type ExpoExtra = {
  adminApiBaseUrl?: string;
  androidEmulatorApi?: boolean;
};

function getExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function isAndroidEmulator(): boolean {
  if (Platform.OS !== "android") return false;
  if (getExtra().androidEmulatorApi) return true;
  return Device.isDevice === false;
}

/** Admin API base URL (no trailing slash). Default: http://localhost:8082 */
export function resolveAdminApiBaseUrl(): string {
  const fromExtra = getExtra().adminApiBaseUrl?.trim().replace(/\/$/, "");
  const fromEnv = process.env.EXPO_PUBLIC_ADMIN_API_BASE_URL?.trim().replace(/\/$/, "");
  const configured = fromExtra || fromEnv;

  if (Platform.OS === "web") {
    const webOverride = process.env.EXPO_PUBLIC_ADMIN_API_WEB_BASE_URL?.trim().replace(/\/$/, "");
    if (webOverride) return webOverride;
    return `http://localhost:${ADMIN_API_PORT}`;
  }

  if (Platform.OS === "android" && isAndroidEmulator()) {
    return `http://10.0.2.2:${ADMIN_API_PORT}`;
  }

  if (configured) return configured;

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${ADMIN_API_PORT}`;
  }

  return `http://localhost:${ADMIN_API_PORT}`;
}

export const ADMIN_TOKEN_STORAGE_KEY = "admin_auth_token";

export function getApiDebugInfo(): { baseUrl: string; platform: string; isEmulator: boolean } {
  return {
    baseUrl: resolveAdminApiBaseUrl(),
    platform: Platform.OS,
    isEmulator: Platform.OS === "android" && isAndroidEmulator(),
  };
}
